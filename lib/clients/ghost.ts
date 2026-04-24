// Ghost.build — warm Postgres store + cited.md persistence.
//
// Ghost is "the first database built for agents" — unlimited Postgres instances
// you create, fork, and discard freely (ghost create / ghost sql / ghost mcp).
// In Oracle, Ghost owns everything that needs to survive a restart:
//
//   - markets, evidence_objects, resolutions, agent_runs, agent_scores,
//     challenge_records — the warm tier from spec §4.2
//   - cited_md rows — every resolved market's full markdown + sha256
//
// Live mode: connect to Ghost via the standard Postgres connection string you
// get from `ghost connect <database>`. Set GHOST_DATABASE_URL.
//
// Fallback mode: in-process maps. The demo flows end-to-end without any Ghost
// account. When GHOST_DATABASE_URL is later added, nothing else changes — same
// function signatures, same call sites.

import type { Pool, PoolClient } from 'pg';
import type {
  AgentRun,
  AgentScore,
  ChallengeRecord,
  VerdictObject
} from '@shared/types';

// ---------------------------------------------------------------------------
// Globals (survive Next.js hot reloads)

interface GhostGlobal {
  __oracle_ghost_pool?: Pool | null;
  __oracle_ghost_mem?: {
    resolutions: Map<string, VerdictObject>;
    challenges: Map<string, ChallengeRecord>;
    agentRuns: AgentRun[];
    agentScores: Map<string, AgentScore>;
    citedMd: Map<
      string,
      { markdown: string; hash: string; url: string; publishedAt: string; visibility: string }
    >;
  };
}

const g = globalThis as unknown as GhostGlobal;

function mem() {
  if (!g.__oracle_ghost_mem) {
    g.__oracle_ghost_mem = {
      resolutions: new Map(),
      challenges: new Map(),
      agentRuns: [],
      agentScores: new Map(),
      citedMd: new Map()
    };
  }
  return g.__oracle_ghost_mem;
}

async function getPool(): Promise<Pool | null> {
  if (g.__oracle_ghost_pool !== undefined) return g.__oracle_ghost_pool;
  if (!process.env.GHOST_DATABASE_URL) {
    g.__oracle_ghost_pool = null;
    return null;
  }
  try {
    const pg = await import('pg');
    g.__oracle_ghost_pool = new pg.Pool({
      connectionString: process.env.GHOST_DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10_000,
      ssl: sslOptions()
    });
    // Quick probe — fail fast into fallback if unreachable.
    const client = await g.__oracle_ghost_pool.connect();
    client.release();
    return g.__oracle_ghost_pool;
  } catch (err) {
    console.warn('[ghost] could not reach Ghost Postgres, falling back to in-memory:', err);
    g.__oracle_ghost_pool = null;
    return null;
  }
}

function sslOptions(): { rejectUnauthorized: boolean } | undefined {
  const url = process.env.GHOST_DATABASE_URL ?? '';
  if (url.includes('sslmode=disable')) return undefined;
  // Ghost.build-hosted databases default to TLS; accept their certs.
  return { rejectUnauthorized: false };
}

async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T | null> {
  const pool = await getPool();
  if (!pool) return null;
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Resolutions

export async function saveResolution(v: VerdictObject): Promise<void> {
  mem().resolutions.set(v.market_id, v);
  await withClient(c =>
    c.query(
      `insert into resolutions (
        market_id, cycle, outcome, confidence, narrative, cited_sources,
        resolver_agent, resolver_image, resolver_digest, resolved_at, sbom_ref
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      on conflict (market_id) do update set
        cycle = excluded.cycle,
        outcome = excluded.outcome,
        confidence = excluded.confidence,
        narrative = excluded.narrative,
        cited_sources = excluded.cited_sources,
        resolver_agent = excluded.resolver_agent,
        resolver_image = excluded.resolver_image,
        resolver_digest = excluded.resolver_digest,
        resolved_at = excluded.resolved_at,
        sbom_ref = excluded.sbom_ref`,
      [
        v.market_id,
        v.cycle,
        v.outcome,
        v.confidence,
        v.narrative,
        JSON.stringify(v.cited_sources),
        v.resolver_agent,
        v.resolver_image,
        v.resolver_digest,
        v.resolved_at,
        v.sbom_ref
      ]
    )
  );
}

export async function listResolutions(): Promise<VerdictObject[]> {
  const rows = await withClient(async c => {
    const r = await c.query<VerdictObject>(
      `select market_id, cycle, outcome, confidence, narrative, cited_sources,
              resolver_agent, resolver_image, resolver_digest, resolved_at, sbom_ref
         from resolutions
        order by resolved_at desc`
    );
    return r.rows.map(row => ({
      ...row,
      cited_sources: parseMaybeJson(row.cited_sources)
    })) as VerdictObject[];
  });
  if (rows) return rows;
  return Array.from(mem().resolutions.values()).sort((a, b) =>
    b.resolved_at.localeCompare(a.resolved_at)
  );
}

// ---------------------------------------------------------------------------
// Challenges

export async function saveChallenge(c: ChallengeRecord): Promise<void> {
  mem().challenges.set(`${c.market_id}:${c.cycle}`, c);
  await withClient(cl =>
    cl.query(
      `insert into challenge_records (
        market_id, cycle, challenger_agent, counter_sources_found,
        max_contradiction_confidence, threshold, result, notes, ran_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      on conflict (market_id, cycle) do update set
        counter_sources_found = excluded.counter_sources_found,
        max_contradiction_confidence = excluded.max_contradiction_confidence,
        result = excluded.result,
        notes = excluded.notes,
        ran_at = excluded.ran_at`,
      [
        c.market_id,
        c.cycle,
        c.challenger_agent,
        c.counter_sources_found,
        c.max_contradiction_confidence,
        c.threshold,
        c.result,
        c.notes,
        c.ran_at
      ]
    )
  );
}

export async function listChallenges(): Promise<ChallengeRecord[]> {
  const rows = await withClient(async c => {
    const r = await c.query<ChallengeRecord>(
      `select market_id, cycle, challenger_agent, counter_sources_found,
              max_contradiction_confidence, threshold, result, notes, ran_at
         from challenge_records
        order by ran_at desc`
    );
    return r.rows;
  });
  if (rows) return rows;
  return Array.from(mem().challenges.values());
}

// ---------------------------------------------------------------------------
// Agent runs + scores

export async function recordAgentRun(run: AgentRun): Promise<void> {
  mem().agentRuns.push(run);
  await withClient(c =>
    c.query(
      `insert into agent_runs (
        run_id, agent, market_id, started_at, ended_at, outcome,
        confidence, inputs_ref, outputs_ref
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      on conflict (run_id) do nothing`,
      [
        run.run_id,
        run.agent,
        run.market_id,
        run.started_at,
        run.ended_at,
        run.outcome,
        run.confidence ?? null,
        run.inputs_ref,
        run.outputs_ref
      ]
    )
  );
}

export async function listAgentRuns(): Promise<AgentRun[]> {
  const rows = await withClient(async c => {
    const r = await c.query<AgentRun>(
      `select run_id, agent, market_id, started_at, ended_at, outcome,
              confidence, inputs_ref, outputs_ref
         from agent_runs
        order by started_at desc
        limit 200`
    );
    return r.rows;
  });
  if (rows) return rows;
  return mem().agentRuns.slice().sort((a, b) => b.started_at.localeCompare(a.started_at));
}

export async function updateAgentScore(
  agent: string,
  patch: (prev: AgentScore) => AgentScore
): Promise<AgentScore> {
  const prev =
    mem().agentScores.get(agent) ?? {
      agent,
      verdict_accuracy: 0,
      citation_coverage: 0,
      confidence_calibration: 0,
      resolution_latency_ms: 0,
      runs: 0
    };
  const next = patch(prev);
  mem().agentScores.set(agent, next);
  await withClient(c =>
    c.query(
      `insert into agent_scores (
        agent, verdict_accuracy, citation_coverage, confidence_calibration,
        resolution_latency_ms, challenge_success_rate, runs
      ) values ($1,$2,$3,$4,$5,$6,$7)
      on conflict (agent) do update set
        verdict_accuracy = excluded.verdict_accuracy,
        citation_coverage = excluded.citation_coverage,
        confidence_calibration = excluded.confidence_calibration,
        resolution_latency_ms = excluded.resolution_latency_ms,
        challenge_success_rate = excluded.challenge_success_rate,
        runs = excluded.runs`,
      [
        next.agent,
        next.verdict_accuracy,
        next.citation_coverage,
        next.confidence_calibration,
        next.resolution_latency_ms,
        next.challenge_success_rate ?? null,
        next.runs
      ]
    )
  );
  return next;
}

export async function listAgentScores(): Promise<AgentScore[]> {
  const rows = await withClient(async c => {
    const r = await c.query<AgentScore>(
      `select agent, verdict_accuracy, citation_coverage, confidence_calibration,
              resolution_latency_ms, challenge_success_rate, runs
         from agent_scores
        order by runs desc`
    );
    return r.rows;
  });
  if (rows) return rows;
  return Array.from(mem().agentScores.values()).sort((a, b) => b.runs - a.runs);
}

// ---------------------------------------------------------------------------
// cited.md — one row per resolved market.
//
// When Ghost is live, every cited.md is stored as a row in `cited_md`. The
// "public URL" used in the attestation block points back at the Oracle app
// itself — `/cited/:marketId` — which renders the row server-side. This
// replaces the old Ghost-CMS member-post model: the sponsor is a database, so
// the artifact lives *in the database* and is served by the app that knows
// how to gate it via x402.

export interface PublishArgs {
  marketId: string;
  title: string;
  markdown: string;
  hash: string;
  visibility: 'public' | 'members';
}

export interface PublishResult {
  url: string;
  market_id: string;
  published_at: string;
}

export async function publishCitedMd(args: PublishArgs): Promise<PublishResult> {
  const publishedAt = new Date().toISOString();
  const baseUrl = process.env.ORACLE_PUBLIC_URL ?? '';
  const url = `${baseUrl}/cited/${args.marketId}`;

  mem().citedMd.set(args.marketId, {
    markdown: args.markdown,
    hash: args.hash,
    url,
    publishedAt,
    visibility: args.visibility
  });

  await withClient(c =>
    c.query(
      `insert into cited_md (market_id, markdown, hash, visibility, published_at)
       values ($1,$2,$3,$4,$5)
       on conflict (market_id) do update set
         markdown = excluded.markdown,
         hash = excluded.hash,
         visibility = excluded.visibility,
         published_at = excluded.published_at`,
      [args.marketId, args.markdown, args.hash, args.visibility, publishedAt]
    )
  );

  return { url, market_id: args.marketId, published_at: publishedAt };
}

export async function getPublishedCitedMd(
  marketId: string
): Promise<{ markdown: string; hash: string; url: string; publishedAt: string } | null> {
  const row = await withClient(async c => {
    const r = await c.query<{ markdown: string; hash: string; visibility: string; published_at: Date | string }>(
      `select markdown, hash, visibility, published_at from cited_md where market_id = $1`,
      [marketId]
    );
    return r.rows[0] ?? null;
  });
  if (row) {
    const baseUrl = process.env.ORACLE_PUBLIC_URL ?? '';
    const pubAt = row.published_at;
    return {
      markdown: row.markdown,
      hash: row.hash,
      url: `${baseUrl}/cited/${marketId}`,
      publishedAt: typeof pubAt === 'string' ? pubAt : new Date(pubAt as unknown as string | number).toISOString()
    };
  }
  const m = mem().citedMd.get(marketId);
  if (!m) return null;
  return { markdown: m.markdown, hash: m.hash, url: m.url, publishedAt: m.publishedAt };
}

// ---------------------------------------------------------------------------

function parseMaybeJson(v: unknown): unknown {
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}
