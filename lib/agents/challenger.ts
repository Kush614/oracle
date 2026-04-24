// Agent — Challenger (spec §5.5).
//
// Runs in an isolated Guild workspace. Sees *only* the verdict (outcome and
// confidence) — never the Resolver's working state, source list, or memory.
// Gathers counter-evidence independently through TinyFish → Nexla, computes a
// contradiction confidence, and either lets the verdict finalize or re-opens
// the market for a second resolution cycle.

import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import { CONFIG } from '@shared/config';
import type { ChallengeRecord, MarketCard, VerdictObject } from '@shared/types';
import { governedRun, sealedWorkspace } from '@lib/clients/guild';
import { browseContrary } from '@lib/clients/tinyfish';
import { normalizeExtraction, pipelineVersion } from '@lib/clients/nexla';
import { saveChallenge } from '@lib/clients/ghost';

export async function challengeVerdict(
  verdict: Pick<VerdictObject, 'market_id' | 'cycle' | 'outcome' | 'confidence'>
): Promise<ChallengeRecord> {
  const agentName =
    process.env.GUILD_CHALLENGER_AGENT_ID ?? 'guild-challenger-aggressive-v1';
  const ws = sealedWorkspace('challenger', agentName);
  const { output } = await governedRun(ws, verdict.market_id, async () => {
    const bus = await getBus();

    // Challenger only reads the market question and source list via a neutral
    // public view — NOT the resolver's working state. The spec guarantees
    // Guild.ai enforces this; we model it by reading only the market card.
    const card = await bus.jsonGet<MarketCard>(keys.marketState(verdict.market_id));
    if (!card) throw new Error(`market not found: ${verdict.market_id}`);

    await bus.jsonPatch(keys.marketState(verdict.market_id), { stage: 'challenging' });

    const direction = verdict.outcome === 'YES' || verdict.outcome === 'LIKELY_YES' ? 'YES' : verdict.outcome === 'NO' || verdict.outcome === 'LIKELY_NO' ? 'NO' : null;
    if (!direction) {
      // NO_CONSENSUS/DISPUTED can't be meaningfully challenged in the same way.
      const record: ChallengeRecord = {
        market_id: verdict.market_id,
        cycle: verdict.cycle,
        challenger_agent: ws.agent,
        counter_sources_found: 0,
        max_contradiction_confidence: 0,
        threshold: CONFIG.challengeThreshold,
        result: 'VERDICT STANDS',
        notes: 'verdict is inherently non-committal — no challenge direction available',
        ran_at: new Date().toISOString()
      };
      await saveChallenge(record);
      return { output: record, outcome: record.result, confidence: 0 };
    }

    // Contrary browsing: re-run extraction against the same URLs in an
    // isolated Guild workspace (no shared memory with Resolver). A source only
    // counts as contradiction if it *actually* supports the opposite outcome.
    const opposite: 'YES' | 'NO' = direction === 'YES' ? 'NO' : 'YES';
    const extractions = await browseContrary(card.source_urls, direction, card.question);
    const events = await Promise.all(extractions.map(normalizeExtraction));
    const contradictions = events.filter(e => e.supports === opposite);
    const maxContradiction = contradictions.reduce((m, e) => Math.max(m, e.confidence), 0);

    const reversed = maxContradiction >= CONFIG.challengeThreshold;
    ws.log('challenge_decided', { maxContradiction, reversed, contradictions: contradictions.length });

    const record: ChallengeRecord = {
      market_id: verdict.market_id,
      cycle: verdict.cycle,
      challenger_agent: ws.agent,
      counter_sources_found: contradictions.length,
      max_contradiction_confidence: maxContradiction,
      threshold: CONFIG.challengeThreshold,
      result: reversed ? 'VERDICT REVERSED' : 'VERDICT STANDS',
      notes: `contrary probe via TinyFish / ${pipelineVersion()}`,
      ran_at: new Date().toISOString()
    };
    await saveChallenge(record);

    if (reversed) {
      await bus.xadd(keys.marketEvents(verdict.market_id), {
        kind: 'challenge_succeeded',
        at: record.ran_at,
        max_contradiction: maxContradiction
      });
      // Re-open only if we haven't already used our second cycle.
      if (card.cycle < CONFIG.maxResolutionCycles) {
        await bus.jsonPatch(keys.marketState(verdict.market_id), {
          stage: 're_open',
          cycle: (card.cycle + 1) as 1 | 2
        });
      } else {
        await bus.jsonPatch(keys.marketState(verdict.market_id), {
          stage: 'disputed',
          outcome: 'DISPUTED'
        });
      }
    } else {
      await bus.xadd(keys.marketEvents(verdict.market_id), {
        kind: 'challenge_failed',
        at: record.ran_at,
        max_contradiction: maxContradiction
      });
    }

    return { output: record, outcome: record.result, confidence: maxContradiction };
  });
  return output;
}
