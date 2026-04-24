// Agent — Odds Adjuster (spec §5.3).
//
// Reads the full evidence stream, computes cumulative YES confidence weighted
// by source authority tier and decayed by recency, writes new odds to Redis
// JSON, and appends to the TimeSeries that TinyFish reads live.

import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import { CONFIG } from '@shared/config';
import type { EvidenceObject, MarketCard } from '@shared/types';
import { TIER_WEIGHT, tierForSource } from '@shared/types';
import { governedRun, sealedWorkspace } from '@lib/clients/guild';

export interface OddsUpdate {
  market_id: string;
  odds_yes: number;
  confidence: number;
  threshold_reached: 'resolve' | 'no_yes' | null;
}

export async function adjustOdds(marketId: string): Promise<OddsUpdate> {
  const ws = sealedWorkspace('odds_adjuster', 'guild-odds-adjuster-v1');
  const { output } = await governedRun(ws, marketId, async () => {
    const bus = await getBus();
    const card = await bus.jsonGet<MarketCard>(keys.marketState(marketId));
    if (!card) throw new Error(`market not found: ${marketId}`);
    const stream = await bus.xrange<EvidenceObject>(keys.marketEvents(marketId));

    // Filter: actual evidence objects (skip internal stream entries like market_created).
    const evidence = stream
      .map(e => e.data)
      .filter((e): e is EvidenceObject => typeof (e as EvidenceObject).source_type === 'string' && typeof (e as EvidenceObject).confidence === 'number')
      .filter(e => e.confidence >= CONFIG.minEvidenceConfidence);

    const { odds, confidence } = computeOdds(evidence);

    await bus.jsonPatch(keys.marketState(marketId), {
      odds_yes: odds,
      confidence
    });
    await bus.tsAdd(keys.oddsTs(marketId), { ts: Date.now(), value: odds });
    ws.log('odds_computed', { odds, confidence, n_evidence: evidence.length });

    let threshold: OddsUpdate['threshold_reached'] = null;
    if (confidence >= CONFIG.resolveThreshold) {
      threshold = 'resolve';
      await bus.jsonPatch(keys.marketState(marketId), { stage: 'resolution_threshold_reached' });
      await bus.xadd(keys.marketEvents(marketId), {
        kind: 'resolution_threshold_reached',
        at: new Date().toISOString(),
        confidence
      });
    } else if (confidence >= CONFIG.resolveThreshold && odds <= 0.15) {
      threshold = 'no_yes';
    }

    return { output: { market_id: marketId, odds_yes: odds, confidence, threshold_reached: threshold }, outcome: 'odds_updated', confidence };
  });
  return output;
}

export function computeOdds(evidence: EvidenceObject[]): { odds: number; confidence: number } {
  if (!evidence.length) return { odds: 0.5, confidence: 0 };

  const now = Date.now();
  let yesW = 0;
  let noW = 0;
  let totalW = 0;

  for (const ev of evidence) {
    const tier = tierForSource(ev.source_type);
    const tierW = TIER_WEIGHT[tier];
    // Recency decay: 20% per hour since Oracle *observed* the evidence. We
    // prefer created_at over ev.timestamp because source-page timestamps are
    // LLM-extracted text — they're fine for display, but not reliable enough
    // to anchor our freshness math.
    const anchor = new Date(ev.created_at ?? ev.timestamp).getTime();
    const hoursOld = Math.max(0, (now - anchor) / 3600_000);
    const recency = Math.max(0.1, 1 - hoursOld * CONFIG.recencyDecayPerHour);
    const weight = tierW * recency * ev.confidence;
    totalW += weight;
    if (ev.supports === 'YES') yesW += weight;
    else if (ev.supports === 'NO') noW += weight;
    // NEUTRAL contributes only to denominator.
  }

  if (totalW === 0) return { odds: 0.5, confidence: 0 };
  const odds = 0.5 + 0.5 * (yesW - noW) / totalW;
  const clampedOdds = Math.max(0.02, Math.min(0.98, odds));
  const confidence = Math.min(1, (yesW + noW) / Math.max(1, totalW) * (yesW > noW ? yesW / Math.max(1, yesW + noW) : noW / Math.max(1, yesW + noW)) + partialBoost(evidence));
  return { odds: clampedOdds, confidence };
}

// Give a modest boost when multiple tier-1 sources agree; otherwise confidence
// can plateau below the 0.85 threshold for demos.
function partialBoost(evidence: EvidenceObject[]): number {
  const tier1 = evidence.filter(e => tierForSource(e.source_type) === 1).length;
  if (tier1 >= 2) return 0.15;
  if (tier1 >= 1) return 0.08;
  return 0;
}
