// Agent — Evidence Gatherer (spec §5.2).
//
// Fetches sources listed on the market card through TinyFish, normalizes via
// Nexla, deduplicates through Redis Set, and pushes typed evidence objects
// onto the market event stream.

import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import type { EvidenceObject, MarketCard, SourceType } from '@shared/types';
import { newEvidenceId } from '@shared/ids';
import { governedRun, sealedWorkspace } from '@lib/clients/guild';
import { browseUrl } from '@lib/clients/tinyfish';
import { normalizeExtraction, pipelineVersion } from '@lib/clients/nexla';

export interface GatherResult {
  new_evidence: EvidenceObject[];
  skipped_duplicates: string[];
  total_after: number;
}

export async function gatherEvidence(marketId: string, opts: { contraryTo?: 'YES' | 'NO' } = {}): Promise<GatherResult> {
  const ws = sealedWorkspace(opts.contraryTo ? 'challenger' : 'evidence_gatherer', `guild-evidence-gatherer-v2${opts.contraryTo ? '-contra' : ''}`);
  const { output } = await governedRun(ws, marketId, async () => {
    const bus = await getBus();
    const card = await bus.jsonGet<MarketCard>(keys.marketState(marketId));
    if (!card) throw new Error(`market not found: ${marketId}`);

    const newEvidence: EvidenceObject[] = [];
    const skipped: string[] = [];

    // Spec §6.3: same URL counted once; same domain counted at most 3 times.
    const existing = await bus.xrange<EvidenceObject>(keys.marketEvents(marketId));
    const domainCounts = new Map<string, number>();
    for (const ev of existing) {
      const url = (ev.data as Partial<EvidenceObject>).source;
      if (url) {
        const d = domain(url);
        domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
      }
    }

    for (const url of card.source_urls) {
      const dedupKey = opts.contraryTo ? `contra:${url}` : url;
      if (!(await bus.sadd(keys.evidenceDedup(marketId), dedupKey))) {
        skipped.push(url);
        continue;
      }
      const d = domain(url);
      if ((domainCounts.get(d) ?? 0) >= 3) {
        skipped.push(`${url} (domain cap)`);
        continue;
      }

      const extraction = await browseUrl(url, {
        question: card.question,
        contraryTo: opts.contraryTo
      });
      const normalized = await normalizeExtraction(extraction);
      const evidenceId = newEvidenceId(marketId, existing.length + newEvidence.length + 1);

      const evidence: EvidenceObject = {
        evidence_id: evidenceId,
        market_id: marketId,
        source: url,
        source_type: normalized.source as SourceType,
        event: normalized.event,
        timestamp: normalized.timestamp,
        confidence: normalized.confidence,
        fetched_by: `TinyFish/${extraction.agent_version}`,
        normalized_by: pipelineVersion(),
        artifact_ref: normalized.raw_artifact_ref,
        supports: opts.contraryTo
          ? (opts.contraryTo === 'YES' ? 'NO' : 'YES')
          : (normalized.supports ?? 'NEUTRAL'),
        created_at: new Date().toISOString()
      };

      await bus.xadd(keys.marketEvents(marketId), {
        ...evidence
      });
      newEvidence.push(evidence);
      domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
      ws.log('evidence_added', { evidence_id: evidenceId, source_type: evidence.source_type, confidence: evidence.confidence });
    }

    await bus.jsonPatch(keys.marketState(marketId), {
      evidence_count: (existing.length + newEvidence.length)
    });

    const result: GatherResult = {
      new_evidence: newEvidence,
      skipped_duplicates: skipped,
      total_after: existing.length + newEvidence.length
    };
    return { output: result, outcome: 'evidence_gathered', confidence: avg(newEvidence.map(e => e.confidence)) };
  });
  return output;
}

function domain(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function avg(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
