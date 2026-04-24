// Oracle pipeline — runs the five-agent tournament for a single market, end to
// end. This is invoked on demand from the dashboard "resolve now" button, from
// the demo seed script, and from the scheduled tick.

import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import type { MarketCard, VerdictObject } from '@shared/types';
import { gatherEvidence } from './evidence-gatherer';
import { adjustOdds } from './odds-adjuster';
import { resolveMarket } from './resolver';
import { challengeVerdict } from './challenger';
import { CONFIG } from '@shared/config';
import { generateCitedMd, publishCitedMdForVerdict } from '@lib/cited-md/generator';
import { payout, refundMarket } from '@lib/clients/insforge';
import { saveResolution, updateAgentScore } from '@lib/clients/ghost';

export interface PipelineRun {
  market_id: string;
  verdict?: VerdictObject;
  final: MarketCard;
  cited_md_hash?: string;
  ghost_url?: string;
  cycles_run: number;
}

export async function runFullPipeline(marketId: string): Promise<PipelineRun> {
  const bus = await getBus();
  let cycles = 0;
  let verdict: VerdictObject | undefined;
  let citedMdHash: string | undefined;
  let ghostUrl: string | undefined;

  while (cycles < CONFIG.maxResolutionCycles) {
    cycles += 1;
    const started = Date.now();

    await gatherEvidence(marketId);
    const odds = await adjustOdds(marketId);
    if (odds.confidence < CONFIG.noConsensusThreshold) {
      // Try one more gather pass to give the demo a better chance of resolving.
      await gatherEvidence(marketId);
      await adjustOdds(marketId);
    }

    const v: VerdictObject = await resolveMarket(marketId);
    verdict = v;
    const challenge = await challengeVerdict(v);

    if (challenge.result === 'VERDICT REVERSED' && cycles < CONFIG.maxResolutionCycles) {
      // Market has been re-opened by challenger. Next loop iteration will
      // gather fresh evidence and re-resolve (cycle 2).
      continue;
    }

    // Verdict stands (or second-cycle dispute). Finalize.
    const bundle = await generateCitedMd({ marketId, verdict: v, challenge });
    citedMdHash = bundle.hash;
    const published = await publishCitedMdForVerdict({ marketId, markdown: bundle.markdown, hash: bundle.hash, outcome: v.outcome });
    ghostUrl = published.url;

    await bus.jsonPatch(keys.marketState(marketId), {
      stage: challenge.result === 'VERDICT REVERSED' ? 'disputed' : 'resolved',
      outcome: challenge.result === 'VERDICT REVERSED' ? 'DISPUTED' : v.outcome,
      cited_md_hash: citedMdHash,
      ghost_url: ghostUrl,
      resolved_at: v.resolved_at
    });

    await saveResolution(v);

    if (challenge.result === 'VERDICT REVERSED') {
      // Second cycle also reversed ⇒ DISPUTED ⇒ refund paper positions.
      await refundMarket(marketId);
    } else if (v.outcome === 'YES' || v.outcome === 'NO') {
      await payout(marketId, v.outcome, 1.0);
    } else if (v.outcome === 'NO_CONSENSUS') {
      await refundMarket(marketId);
    }

    await updateAgentScore(v.resolver_agent, prev => ({
      ...prev,
      runs: prev.runs + 1,
      verdict_accuracy: (prev.verdict_accuracy * prev.runs + (challenge.result === 'VERDICT STANDS' ? 1 : 0)) / (prev.runs + 1),
      citation_coverage: (prev.citation_coverage * prev.runs + v.cited_sources.length) / (prev.runs + 1),
      confidence_calibration: (prev.confidence_calibration * prev.runs + v.confidence) / (prev.runs + 1),
      resolution_latency_ms: (prev.resolution_latency_ms * prev.runs + (Date.now() - started)) / (prev.runs + 1)
    }));

    await updateAgentScore(challenge.challenger_agent, prev => ({
      ...prev,
      runs: prev.runs + 1,
      challenge_success_rate: ((prev.challenge_success_rate ?? 0) * prev.runs + (challenge.result === 'VERDICT REVERSED' ? 1 : 0)) / (prev.runs + 1)
    }));

    break;
  }

  const finalCard = (await bus.jsonGet<MarketCard>(keys.marketState(marketId)))!;
  return {
    market_id: marketId,
    verdict,
    final: finalCard,
    cited_md_hash: citedMdHash,
    ghost_url: ghostUrl,
    cycles_run: cycles
  };
}
