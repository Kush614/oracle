// Agent — Resolver (spec §5.4).
//
// Aggregates evidence, applies resolution rules (§6), produces a verdict,
// drafts cited.md, and pushes the verdict onto the challenge queue. The
// Resolver never reads Challenger state — Guild.ai enforces that isolation.

import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import { CONFIG } from '@shared/config';
import type { EvidenceObject, MarketCard, MarketOutcome, VerdictObject } from '@shared/types';
import { generateVerdictNarrative } from '@lib/clients/insforge';
import { resolveAttestation } from '@lib/clients/chainguard';
import { computeOdds } from './odds-adjuster';
import { governedRun, sealedWorkspace } from '@lib/clients/guild';

export async function resolveMarket(marketId: string): Promise<VerdictObject> {
  const ws = sealedWorkspace('resolver', 'guild-resolver-strict-v1');
  const { output } = await governedRun(ws, marketId, async () => {
    const bus = await getBus();
    const card = await bus.jsonGet<MarketCard>(keys.marketState(marketId));
    if (!card) throw new Error(`market not found: ${marketId}`);

    await bus.jsonPatch(keys.marketState(marketId), { stage: 'resolving' });

    const stream = await bus.xrange<EvidenceObject>(keys.marketEvents(marketId));
    const evidence = stream
      .map(e => e.data)
      .filter((e): e is EvidenceObject => typeof (e as EvidenceObject).source_type === 'string' && typeof (e as EvidenceObject).confidence === 'number')
      .filter(e => e.confidence >= CONFIG.minEvidenceConfidence);

    const { odds, confidence } = computeOdds(evidence);
    const outcome = decideOutcome(odds, confidence);
    ws.log('verdict_decided', { outcome, confidence, odds });

    const narrative = await generateVerdictNarrative({ market: card, evidence, outcome, confidence });
    const attestation = resolveAttestation();

    const verdict: VerdictObject = {
      market_id: marketId,
      cycle: card.cycle,
      outcome,
      confidence,
      narrative,
      cited_sources: evidence
        .filter(e => e.supports === outcomeToSupports(outcome))
        .sort((a, b) => b.confidence - a.confidence)
        .map(e => e.evidence_id),
      resolver_agent: ws.agent,
      resolver_image: attestation.image,
      resolver_digest: attestation.digest,
      resolved_at: new Date().toISOString(),
      sbom_ref: attestation.sbom_ref
    };

    await bus.xadd(keys.challengeQueue(marketId), {
      kind: 'verdict_queued',
      outcome: verdict.outcome,
      confidence: verdict.confidence,
      cycle: verdict.cycle,
      at: verdict.resolved_at
    });
    await bus.jsonPatch(keys.marketState(marketId), { stage: 'challenge_queued' });

    return { output: verdict, outcome: verdict.outcome, confidence: verdict.confidence };
  });
  return output;
}

function decideOutcome(odds: number, confidence: number): MarketOutcome {
  if (confidence < CONFIG.noConsensusThreshold) return 'NO_CONSENSUS';
  if (confidence >= CONFIG.resolveThreshold) return odds >= 0.5 ? 'YES' : 'NO';
  return odds >= 0.5 ? 'LIKELY_YES' : 'LIKELY_NO';
}

function outcomeToSupports(outcome: MarketOutcome): 'YES' | 'NO' | 'NEUTRAL' {
  if (outcome === 'YES' || outcome === 'LIKELY_YES') return 'YES';
  if (outcome === 'NO' || outcome === 'LIKELY_NO') return 'NO';
  return 'NEUTRAL';
}
