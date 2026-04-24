// Oracle Redis bus.
//
// Redis is the operational substrate in the spec (§8.3). For the hackathon demo
// we want the whole pipeline to run end-to-end without a live Redis Cloud
// account, so this module ships an in-process fallback that implements exactly
// the four Redis surfaces we actually use:
//
//   - JSON  (JSON.SET / JSON.GET)
//   - Streams (XADD / XRANGE)
//   - Set  (SADD / SISMEMBER)
//   - TimeSeries (TS.ADD / TS.RANGE)
//
// If REDIS_URL is set we import ioredis lazily and proxy the same API over it.
// Neither caller code nor agent code should ever know which mode is active.

import type Redis from 'ioredis';

import { CONFIG } from '@shared/config';

type JsonMap = Record<string, unknown>;

interface StreamEntry<T = unknown> {
  id: string;
  data: T;
}

interface TimeSeriesPoint {
  ts: number;
  value: number;
}

export interface OracleBus {
  // JSON
  jsonSet(key: string, value: unknown): Promise<void>;
  jsonGet<T = unknown>(key: string): Promise<T | null>;
  jsonPatch(key: string, patch: JsonMap): Promise<void>;

  // Streams
  xadd<T extends JsonMap>(key: string, data: T): Promise<string>;
  xrange<T = JsonMap>(key: string): Promise<StreamEntry<T>[]>;
  xlen(key: string): Promise<number>;

  // Set
  sadd(key: string, member: string): Promise<boolean>; // true if new
  sismember(key: string, member: string): Promise<boolean>;
  smembers(key: string): Promise<string[]>;

  // TimeSeries
  tsAdd(key: string, point: TimeSeriesPoint): Promise<void>;
  tsRange(key: string): Promise<TimeSeriesPoint[]>;

  // Cache
  setEx(key: string, value: string, ttlSeconds: number): Promise<void>;
  get(key: string): Promise<string | null>;

  // Debug
  scan(prefix: string): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// In-process fallback bus

interface FallbackCell {
  json?: unknown;
  stream?: StreamEntry[];
  set?: Set<string>;
  ts?: TimeSeriesPoint[];
  str?: { value: string; expiresAt: number };
}

class FallbackBus implements OracleBus {
  private store = new Map<string, FallbackCell>();
  private seq = 0;

  private cell(key: string): FallbackCell {
    let c = this.store.get(key);
    if (!c) {
      c = {};
      this.store.set(key, c);
    }
    return c;
  }

  async jsonSet(key: string, value: unknown): Promise<void> {
    this.cell(key).json = value;
  }

  async jsonGet<T = unknown>(key: string): Promise<T | null> {
    const c = this.store.get(key);
    return (c?.json as T | undefined) ?? null;
  }

  async jsonPatch(key: string, patch: JsonMap): Promise<void> {
    const c = this.cell(key);
    const prev = (c.json as JsonMap | undefined) ?? {};
    c.json = { ...prev, ...patch };
  }

  async xadd<T extends JsonMap>(key: string, data: T): Promise<string> {
    const c = this.cell(key);
    if (!c.stream) c.stream = [];
    this.seq += 1;
    const id = `${Date.now()}-${this.seq}`;
    c.stream.push({ id, data });
    return id;
  }

  async xrange<T = JsonMap>(key: string): Promise<StreamEntry<T>[]> {
    const c = this.store.get(key);
    return (c?.stream ?? []) as StreamEntry<T>[];
  }

  async xlen(key: string): Promise<number> {
    const c = this.store.get(key);
    return c?.stream?.length ?? 0;
  }

  async sadd(key: string, member: string): Promise<boolean> {
    const c = this.cell(key);
    if (!c.set) c.set = new Set();
    if (c.set.has(member)) return false;
    c.set.add(member);
    return true;
  }

  async sismember(key: string, member: string): Promise<boolean> {
    return this.store.get(key)?.set?.has(member) ?? false;
  }

  async smembers(key: string): Promise<string[]> {
    return Array.from(this.store.get(key)?.set ?? []);
  }

  async tsAdd(key: string, point: TimeSeriesPoint): Promise<void> {
    const c = this.cell(key);
    if (!c.ts) c.ts = [];
    c.ts.push(point);
  }

  async tsRange(key: string): Promise<TimeSeriesPoint[]> {
    return this.store.get(key)?.ts ?? [];
  }

  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.cell(key).str = { value, expiresAt: Date.now() + ttlSeconds * 1000 };
  }

  async get(key: string): Promise<string | null> {
    const c = this.store.get(key);
    if (!c?.str) return null;
    if (c.str.expiresAt < Date.now()) {
      c.str = undefined;
      return null;
    }
    return c.str.value;
  }

  async scan(prefix: string): Promise<string[]> {
    return Array.from(this.store.keys()).filter(k => k.startsWith(prefix));
  }
}

// ---------------------------------------------------------------------------
// ioredis-backed bus (activated when REDIS_URL is set)

class LiveBus implements OracleBus {
  private client: Redis;
  private seq = 0;

  constructor(client: Redis) {
    this.client = client;
  }

  async jsonSet(key: string, value: unknown): Promise<void> {
    // Prefer RedisJSON if available, fall back to serialized string.
    try {
      await (this.client as unknown as { call: (...a: unknown[]) => Promise<unknown> }).call(
        'JSON.SET',
        key,
        '$',
        JSON.stringify(value)
      );
    } catch {
      await this.client.set(key, JSON.stringify(value));
    }
  }

  async jsonGet<T>(key: string): Promise<T | null> {
    try {
      const raw = await (this.client as unknown as { call: (...a: unknown[]) => Promise<unknown> }).call(
        'JSON.GET',
        key,
        '$'
      );
      if (!raw) return null;
      const parsed = JSON.parse(raw as string);
      return Array.isArray(parsed) ? (parsed[0] as T) : (parsed as T);
    } catch {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
  }

  async jsonPatch(key: string, patch: Record<string, unknown>): Promise<void> {
    const prev = (await this.jsonGet<Record<string, unknown>>(key)) ?? {};
    await this.jsonSet(key, { ...prev, ...patch });
  }

  async xadd<T extends Record<string, unknown>>(key: string, data: T): Promise<string> {
    const pairs: string[] = [];
    for (const [k, v] of Object.entries(data)) {
      pairs.push(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    const id = await this.client.xadd(key, '*', ...pairs);
    return id ?? `${Date.now()}-${this.seq++}`;
  }

  async xrange<T = Record<string, unknown>>(key: string): Promise<StreamEntry<T>[]> {
    const raw = await this.client.xrange(key, '-', '+');
    return raw.map(([id, pairs]) => {
      const data: Record<string, unknown> = {};
      for (let i = 0; i < pairs.length; i += 2) {
        const k = pairs[i];
        const v = pairs[i + 1];
        try {
          data[k] = JSON.parse(v);
        } catch {
          data[k] = v;
        }
      }
      return { id, data: data as T };
    });
  }

  async xlen(key: string): Promise<number> {
    return (await this.client.xlen(key)) as number;
  }

  async sadd(key: string, member: string): Promise<boolean> {
    return (await this.client.sadd(key, member)) === 1;
  }

  async sismember(key: string, member: string): Promise<boolean> {
    return (await this.client.sismember(key, member)) === 1;
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async tsAdd(key: string, point: TimeSeriesPoint): Promise<void> {
    try {
      await (this.client as unknown as { call: (...a: unknown[]) => Promise<unknown> }).call(
        'TS.ADD',
        key,
        point.ts,
        point.value
      );
    } catch {
      await this.client.zadd(key, point.ts, `${point.ts}:${point.value}`);
    }
  }

  async tsRange(key: string): Promise<TimeSeriesPoint[]> {
    try {
      const raw = (await (this.client as unknown as {
        call: (...a: unknown[]) => Promise<unknown>;
      }).call('TS.RANGE', key, '-', '+')) as [number, string][];
      return raw.map(([ts, value]) => ({ ts, value: Number(value) }));
    } catch {
      const raw = await this.client.zrange(key, 0, -1);
      return raw.map(entry => {
        const [ts, value] = entry.split(':');
        return { ts: Number(ts), value: Number(value) };
      });
    }
  }

  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async scan(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }
}

// ---------------------------------------------------------------------------
// Singleton resolver.
//
// We pin the bus to globalThis so Next.js dev hot-reloads don't wipe the
// in-process fallback between API calls. In a live deployment (REDIS_URL set)
// this just caches the ioredis client, same pattern as prisma/supabase.

interface OracleGlobal {
  __oracle_bus?: Promise<OracleBus>;
  __oracle_fallback?: FallbackBus;
}

const g = globalThis as unknown as OracleGlobal;

export function getBus(): Promise<OracleBus> {
  if (g.__oracle_bus) return g.__oracle_bus;
  g.__oracle_bus = (async () => {
    if (CONFIG.integrationMode('redis') === 'fallback') {
      if (!g.__oracle_fallback) g.__oracle_fallback = new FallbackBus();
      return g.__oracle_fallback;
    }
    try {
      const { default: Redis } = await import('ioredis');
      const client = new Redis(process.env.REDIS_URL!, { lazyConnect: true, maxRetriesPerRequest: 1 });
      await client.connect();
      return new LiveBus(client);
    } catch (err) {
      // Graceful fallback if live Redis fails to connect.
      console.warn('[oracle/redis] live Redis unavailable, using in-process fallback:', err);
      if (!g.__oracle_fallback) g.__oracle_fallback = new FallbackBus();
      return g.__oracle_fallback;
    }
  })();
  return g.__oracle_bus;
}

// Exposed for tests and the demo reset button.
export async function resetBus(): Promise<void> {
  g.__oracle_bus = undefined;
  g.__oracle_fallback = undefined;
}
