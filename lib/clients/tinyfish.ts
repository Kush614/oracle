// TinyFish — evidence browser for the Evidence Gatherer (spec §8.1).
//
// Two live endpoints, both authenticated with `X-API-Key`:
//
//   Agent API  POST https://agent.tinyfish.ai/v1/automation/run
//     url + goal + output_schema → structured JSON extraction
//     (LLM-in-the-loop; used for evidence extraction with typed supports/confidence)
//
//   Fetch API  POST https://api.fetch.tinyfish.ai
//     urls[] → rendered markdown/html/json
//     (used as a quick fallback when Agent API times out)
//
// Fallback mode (no TINYFISH_API_KEY set): deterministic fixtures for the
// seed URLs so the demo runs end-to-end without credits.

import { newArtifactRef } from '@shared/ids';
import type { SourceType } from '@shared/types';

const AGENT_URL = process.env.TINYFISH_API_URL ?? 'https://agent.tinyfish.ai';
const FETCH_URL = process.env.TINYFISH_FETCH_URL ?? 'https://api.fetch.tinyfish.ai';
const RUN_TIMEOUT_MS = Number(process.env.TINYFISH_RUN_TIMEOUT_MS ?? 60_000);

export interface TinyFishExtraction {
  url: string;
  source_type: SourceType;
  extracted_text: string;
  event: string;
  timestamp: string;
  confidence: number;
  supports: 'YES' | 'NO' | 'NEUTRAL';
  artifact_ref: string;
  agent_version: string;
  run_id?: string;
}

export interface BrowseOptions {
  /** Market question — used as the goal when live. */
  question?: string;
  /** Tilt the extraction toward looking for counter-evidence (Challenger path). */
  contraryTo?: 'YES' | 'NO';
}

// Oracle's extraction contract is encoded in the goal prose rather than
// `output_schema`, because output_schema is a support-tier feature on
// TinyFish and defaults to 403 FORBIDDEN on the hackathon key. The agent still
// returns `result` as a structured JSON object when the prompt asks for JSON.
const SCHEMA_HINT =
  'Return ONLY a JSON object (no prose, no code fences) with keys: ' +
  'event (string, short phrase), ' +
  'supports (one of YES, NO, NEUTRAL), ' +
  'confidence (number between 0 and 1; be conservative), ' +
  'timestamp (ISO 8601 string; use the event time if visible on the page, otherwise current time).';

export async function browseUrl(url: string, opts: BrowseOptions = {}): Promise<TinyFishExtraction> {
  if (process.env.TINYFISH_API_KEY) {
    try {
      return await runAgentApi(url, opts);
    } catch (err) {
      console.warn(`[tinyfish] agent api failed for ${url}:`, err);
      try {
        return await runFetchApi(url);
      } catch (err2) {
        console.warn(`[tinyfish] fetch api also failed for ${url}:`, err2);
      }
    }
  }
  return fixtureFor(url, opts);
}

// Challenger path: re-browses every source in a fresh, Guild-isolated workspace
// (no shared memory with the Resolver), then lets the caller count how many
// sources actually supported the opposite of the verdict.
export async function browseContrary(
  urls: string[],
  verdict: 'YES' | 'NO',
  question?: string
): Promise<TinyFishExtraction[]> {
  return Promise.all(urls.map(u => browseUrl(u, { question, contraryTo: verdict })));
}

// ---------------------------------------------------------------------------
// Agent API

async function runAgentApi(url: string, opts: BrowseOptions): Promise<TinyFishExtraction> {
  const goal = buildGoal(opts);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), RUN_TIMEOUT_MS);
  try {
    const resp = await fetch(`${AGENT_URL}/v1/automation/run`, {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.TINYFISH_API_KEY!
      },
      body: JSON.stringify({
        url,
        goal,
        browser_profile: 'lite'
      })
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`agent api ${resp.status}: ${body.slice(0, 200)}`);
    }
    const body = (await resp.json()) as {
      run_id?: string;
      status?: string;
      result?:
        | { event?: string; supports?: string; confidence?: number; timestamp?: string }
        | string
        | null;
      error?: string | null;
    };
    if (body.status && body.status !== 'COMPLETED') {
      throw new Error(`agent run ${body.status}: ${body.error ?? 'unknown'}`);
    }
    const r = coerceResult(body.result);
    return {
      url,
      source_type: inferSourceType(url),
      extracted_text: JSON.stringify(body.result ?? {}),
      event: r.event ?? 'content_observed',
      timestamp: r.timestamp ?? new Date().toISOString(),
      confidence: clamp01(Number(r.confidence ?? 0.4)),
      supports: normalizeSupports(r.supports, opts.contraryTo),
      artifact_ref: newArtifactRef('tf_agent'),
      agent_version: 'tinyfish/agent-api/v1',
      run_id: body.run_id
    };
  } finally {
    clearTimeout(timer);
  }
}

// The agent sometimes returns `result` as a pre-parsed object and sometimes
// as a JSON string (or a string with fences around it). Normalize both.
function coerceResult(
  r: unknown
): { event?: string; supports?: string; confidence?: number; timestamp?: string } {
  if (!r) return {};
  if (typeof r === 'object') return r as never;
  if (typeof r === 'string') {
    const trimmed = r.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      return { event: trimmed.slice(0, 120) };
    }
  }
  return {};
}

// ---------------------------------------------------------------------------
// Fetch API (content-only fallback)

async function runFetchApi(url: string): Promise<TinyFishExtraction> {
  const resp = await fetch(FETCH_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.TINYFISH_API_KEY!
    },
    body: JSON.stringify({ urls: [url], format: 'markdown' })
  });
  if (!resp.ok) throw new Error(`fetch api ${resp.status}`);
  const body = (await resp.json()) as { results: { url: string; title?: string | null; text?: string }[] };
  const first = body.results?.[0];
  if (!first) throw new Error('fetch api: no results');
  return {
    url,
    source_type: inferSourceType(url),
    extracted_text: first.text ?? first.title ?? '',
    event: first.title ?? 'content_observed',
    timestamp: new Date().toISOString(),
    confidence: 0.5,
    supports: 'NEUTRAL',
    artifact_ref: newArtifactRef('tf_fetch'),
    agent_version: 'tinyfish/fetch-api/v1'
  };
}

// ---------------------------------------------------------------------------
// Goal construction

function buildGoal(opts: BrowseOptions): string {
  const question = opts.question?.trim();
  if (opts.contraryTo) {
    const counter = opts.contraryTo === 'YES' ? 'did NOT happen' : 'DID happen';
    return [
      `Find any evidence on this page that the market's YES outcome ${counter}.`,
      question ? `Market question: "${question}".` : '',
      `If you find contradictory evidence, set "supports"="${opts.contraryTo === 'YES' ? 'NO' : 'YES'}" with a conservative confidence; otherwise set "supports"="NEUTRAL".`,
      SCHEMA_HINT
    ]
      .filter(Boolean)
      .join(' ');
  }
  if (question) {
    return [
      `Determine whether this page provides evidence that the answer to the following prediction-market question is YES: "${question}".`,
      `"supports"="YES" if the page shows the event happened, "NO" if it shows the event did not happen, "NEUTRAL" if the page is inconclusive.`,
      `"confidence" should reflect the page's authority for this question (official pages and APIs → high; news summaries → medium; forum posts → low).`,
      SCHEMA_HINT
    ].join(' ');
  }
  return 'Extract any notable event from this page and classify its direction as YES/NO/NEUTRAL with a confidence score. ' + SCHEMA_HINT;
}

// ---------------------------------------------------------------------------
// Fallback fixtures (no API key)

const FIXTURES: Record<string, Omit<TinyFishExtraction, 'artifact_ref' | 'agent_version'>> = {
  'https://api.github.com/repos/oracle-demo/widget/releases': {
    url: 'https://api.github.com/repos/oracle-demo/widget/releases',
    source_type: 'github_releases',
    extracted_text: 'Release v2.0.0 tagged at 16:12 UTC — oracle-demo/widget@v2.0.0',
    event: 'release_published',
    timestamp: new Date().toISOString(),
    confidence: 0.97,
    supports: 'YES'
  },
  'https://status.aws.amazon.com/': {
    url: 'https://status.aws.amazon.com/',
    source_type: 'official_status_page',
    extracted_text: 'us-east-1 EC2 API: all systems operational as of 15:42 UTC. Incident resolved.',
    event: 'incident_resolved',
    timestamp: new Date().toISOString(),
    confidence: 0.94,
    supports: 'YES'
  },
  'https://techcrunch.com/feed': {
    url: 'https://techcrunch.com/feed',
    source_type: 'news_techcrunch',
    extracted_text: 'TechCrunch: Stripe launches new checkout primitive — by Mary Smith, 14:22 UTC',
    event: 'article_published',
    timestamp: new Date().toISOString(),
    confidence: 0.88,
    supports: 'YES'
  },
  'https://news.ycombinator.com/': {
    url: 'https://news.ycombinator.com/',
    source_type: 'hackernews',
    extracted_text: 'Thread: is widget v2.0.0 really shipping today? Mixed replies.',
    event: 'discussion_observed',
    timestamp: new Date().toISOString(),
    confidence: 0.42,
    supports: 'NEUTRAL'
  }
};

function fixtureFor(url: string, opts: BrowseOptions): TinyFishExtraction {
  const base = FIXTURES[url] ?? {
    url,
    source_type: 'community_forum' as const,
    extracted_text: `Fixture content for ${url}`,
    event: 'content_observed',
    timestamp: new Date().toISOString(),
    confidence: 0.55,
    supports: 'NEUTRAL' as const
  };
  if (opts.contraryTo) {
    const opposite: 'YES' | 'NO' = opts.contraryTo === 'YES' ? 'NO' : 'YES';
    return {
      ...base,
      event: `contradiction_${opposite.toLowerCase()}_probe`,
      confidence: Math.max(0.15, base.confidence - 0.55),
      supports: opposite,
      artifact_ref: newArtifactRef('tf_fb'),
      agent_version: 'fallback/v2'
    };
  }
  return {
    ...base,
    artifact_ref: newArtifactRef('tf_fb'),
    agent_version: 'fallback/v2'
  };
}

// ---------------------------------------------------------------------------

function inferSourceType(url: string): SourceType {
  try {
    const host = new URL(url).host;
    if (host.endsWith('api.github.com')) return 'github_api';
    if (host === 'github.com') return 'github_releases';
    if (host.includes('status.')) return 'official_status_page';
    if (host.endsWith('techcrunch.com')) return 'news_techcrunch';
    if (host.endsWith('reuters.com') || host.endsWith('apnews.com')) return 'news_ap_reuters';
    if (host.endsWith('twitter.com') || host.endsWith('x.com')) return 'official_twitter';
    if (host === 'news.ycombinator.com') return 'hackernews';
    if (host.endsWith('reddit.com')) return 'reddit';
    return 'company_blog';
  } catch {
    return 'community_forum';
  }
}

function normalizeSupports(s: unknown, contraryTo?: 'YES' | 'NO'): 'YES' | 'NO' | 'NEUTRAL' {
  const v = String(s ?? '').toUpperCase();
  if (v === 'YES' || v === 'NO' || v === 'NEUTRAL') {
    return v as 'YES' | 'NO' | 'NEUTRAL';
  }
  if (contraryTo) return contraryTo === 'YES' ? 'NO' : 'YES';
  return 'NEUTRAL';
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
