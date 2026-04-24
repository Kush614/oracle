// InsForge — AI reasoning engine + application shell (spec §8.7).
//
// InsForge is a BaaS for agentic apps. Relevant primitives for Oracle:
//
//   - POST /api/ai/chat/completion  — OpenRouter-backed chat completion, used
//     for Resolver verdict narratives (rich, grounded prose vs. the template).
//   - Postgres tables (we could use these for paper ledger, but we already
//     have Ghost.build for the warm store; InsForge is *just* the reasoning
//     layer in Oracle's architecture).
//
// Provisioning: a trial project was created via
//   POST https://api.insforge.dev/agents/v1/signup
// which returns {accessApiKey, projectUrl}. Trials last 24h unless claimed at
// the returned claimUrl. Both values are read from env.
//
// Live mode: INSFORGE_PROJECT_URL + INSFORGE_API_KEY set → real LLM.
// Fallback: deterministic template narrative so demos run with no LLM.

import { CONFIG } from '@shared/config';
import type { EvidenceObject, MarketCard, MarketOutcome, PaperBalance, PaperPosition } from '@shared/types';

const INSFORGE_MODEL = process.env.INSFORGE_MODEL ?? 'openai/gpt-4o-mini';
const INSFORGE_TIMEOUT_MS = Number(process.env.INSFORGE_TIMEOUT_MS ?? 20_000);

// ---------------------------------------------------------------------------
// Narrative generation (used inside Resolver.ts)

export interface NarrativeInput {
  market: MarketCard;
  evidence: EvidenceObject[];
  outcome: MarketOutcome;
  confidence: number;
}

export async function generateVerdictNarrative(input: NarrativeInput): Promise<string> {
  if (CONFIG.integrationMode('insforge') === 'live') {
    try {
      return await liveChatNarrative(input);
    } catch (err) {
      console.warn('[insforge] live narrative failed, using template fallback:', err);
    }
  }
  return localNarrative(input);
}

async function liveChatNarrative(input: NarrativeInput): Promise<string> {
  const { market, evidence, outcome, confidence } = input;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), INSFORGE_TIMEOUT_MS);

  const evidenceLines = evidence
    .slice(0, 8)
    .map(
      (e, i) =>
        `  [${i + 1}] ${e.source} — "${e.event}" — supports=${e.supports} conf=${e.confidence.toFixed(2)} tier=${e.source_type}`
    )
    .join('\n');

  const systemPrompt = [
    'You are Oracle, a prediction-market resolution engine.',
    'You produce concise, grounded verdict narratives for publication as `cited.md`.',
    'Rules:',
    '- 3–6 sentences, factual tone, no hedging.',
    '- Reference specific evidence by its bracket number in the input.',
    '- State the outcome and confidence in the first sentence.',
    '- Acknowledge source-authority tiers when relevant (official APIs > news > forums).',
    '- Never speculate beyond the evidence provided.'
  ].join('\n');

  const userPrompt = [
    `Market: "${market.question}"`,
    `Verdict: ${outcome} with cumulative confidence ${(confidence * 100).toFixed(1)}%.`,
    `Evidence (${evidence.length} objects, ordered by confidence descending):`,
    evidenceLines,
    '',
    'Write the verdict narrative for cited.md.'
  ].join('\n');

  try {
    const resp = await fetch(`${process.env.INSFORGE_PROJECT_URL}/api/ai/chat/completion`, {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.INSFORGE_API_KEY}`
      },
      body: JSON.stringify({
        model: INSFORGE_MODEL,
        messages: [{ role: 'user', content: userPrompt }],
        systemPrompt,
        stream: false,
        temperature: 0.2,
        maxTokens: 360
      })
    });
    if (!resp.ok) {
      throw new Error(`insforge ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    }
    const body = (await resp.json()) as { text?: string; metadata?: unknown };
    const text = (body.text ?? '').trim();
    if (!text) throw new Error('insforge returned empty narrative');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function localNarrative(input: NarrativeInput): string {
  const { market, evidence, outcome, confidence } = input;
  const supporting = evidence.filter(e => e.supports === outcomeToSupports(outcome)).slice(0, 5);
  const tiers = new Set(supporting.map(e => e.source_type));
  const lines: string[] = [];
  lines.push(
    `Oracle resolves market ${market.market_id} — "${market.question}" — as ${outcome} ` +
      `with cumulative confidence ${(confidence * 100).toFixed(1)}%.`
  );
  if (supporting.length > 0) {
    lines.push(
      `Verdict grounded in ${supporting.length} primary evidence objects spanning ` +
        `${tiers.size} distinct source type(s).`
    );
    for (const ev of supporting) {
      lines.push(
        `  • ${ev.source} — ${ev.event} (${(ev.confidence * 100).toFixed(0)}% conf, ${ev.source_type}).`
      );
    }
  }
  lines.push(
    `No single source determined the outcome; all evidence was deduplicated at the URL and domain level ` +
      `and weighted by source authority tier before aggregation.`
  );
  return lines.join('\n');
}

function outcomeToSupports(outcome: MarketOutcome): 'YES' | 'NO' | 'NEUTRAL' {
  if (outcome === 'YES' || outcome === 'LIKELY_YES') return 'YES';
  if (outcome === 'NO' || outcome === 'LIKELY_NO') return 'NO';
  return 'NEUTRAL';
}

// ---------------------------------------------------------------------------
// Paper ledger (fallback: in-process; live: InsForge API).
// For the hackathon we keep balances local so paper payouts work without auth.

interface LedgerGlobal {
  __oracle_insforge_balances?: Map<string, number>;
  __oracle_insforge_positions?: Map<string, PaperPosition>;
}
const g = globalThis as unknown as LedgerGlobal;
if (!g.__oracle_insforge_balances) {
  g.__oracle_insforge_balances = new Map([['demo_user', 100]]);
}
if (!g.__oracle_insforge_positions) {
  g.__oracle_insforge_positions = new Map();
}
const balances = g.__oracle_insforge_balances;
const positions = g.__oracle_insforge_positions;

export async function getBalance(userId: string): Promise<PaperBalance> {
  return { user_id: userId, balance: balances.get(userId) ?? 0 };
}

export async function adjustBalance(userId: string, delta: number): Promise<PaperBalance> {
  const next = (balances.get(userId) ?? 0) + delta;
  balances.set(userId, next);
  return { user_id: userId, balance: next };
}

export async function recordPosition(position: PaperPosition): Promise<void> {
  positions.set(`${position.user_id}:${position.market_id}`, position);
}

export async function payout(marketId: string, winningSide: 'YES' | 'NO', pricePerShare: number): Promise<number> {
  let total = 0;
  for (const [k, pos] of positions) {
    if (pos.market_id !== marketId) continue;
    if (pos.side !== winningSide) {
      positions.delete(k);
      continue;
    }
    const credit = pos.shares * pricePerShare;
    balances.set(pos.user_id, (balances.get(pos.user_id) ?? 0) + credit);
    total += credit;
    positions.delete(k);
  }
  return total;
}

export async function refundMarket(marketId: string): Promise<number> {
  let total = 0;
  for (const [k, pos] of positions) {
    if (pos.market_id !== marketId) continue;
    const credit = pos.shares * pos.avg_price;
    balances.set(pos.user_id, (balances.get(pos.user_id) ?? 0) + credit);
    total += credit;
    positions.delete(k);
  }
  return total;
}
