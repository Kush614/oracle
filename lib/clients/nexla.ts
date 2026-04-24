// Nexla — evidence normalization pipeline (spec §8.2).
//
// Nexla takes heterogeneous event shapes (webhooks, RSS, API payloads) and
// normalizes them into a single EvidenceEvent schema. For the demo we run the
// same normalizer logic locally; live mode forwards to the Nexla API.

import { CONFIG } from '@shared/config';
import type { EvidenceEvent } from '@shared/types';
import type { TinyFishExtraction } from './tinyfish';
import { newArtifactRef } from '@shared/ids';

export async function normalizeExtraction(
  extraction: TinyFishExtraction
): Promise<EvidenceEvent> {
  const event: EvidenceEvent = {
    source: extraction.source_type,
    event: extraction.event,
    timestamp: extraction.timestamp,
    confidence: extraction.confidence,
    url: extraction.url,
    raw_artifact_ref: extraction.artifact_ref ?? newArtifactRef('nx'),
    supports: extraction.supports
  };

  if (CONFIG.integrationMode('nexla') === 'live') {
    const resp = await fetch(`${process.env.NEXLA_API_URL}/pipelines/evidence/normalize`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.NEXLA_API_KEY}`
      },
      body: JSON.stringify({ extraction })
    });
    if (resp.ok) return (await resp.json()) as EvidenceEvent;
    console.warn('[nexla] live normalize failed, falling back to local');
  }

  return event;
}

export function pipelineVersion(): string {
  return CONFIG.integrationMode('nexla') === 'live' ? 'nexla/evidence-pipeline-v1' : 'nexla-fallback/evidence-pipeline-v1';
}

// Market Creator taps the same Nexla layer to watch incoming feeds for
// binary-resolvable events. For the demo this returns three seed candidates.
export interface MarketCandidate {
  question: string;
  category: string;
  source_urls: string[];
}

export async function latestMarketCandidates(): Promise<MarketCandidate[]> {
  // These seed markets use *real, publicly reachable* URLs so the live TinyFish
  // Agent API returns a meaningful YES/NO judgement. Questions are framed as
  // "has this already happened?" — which gives stable, deterministic YES
  // verdicts across demo runs and avoids date-dependent flakes.
  return [
    {
      question: 'Has Next.js released a version tagged v14 or higher on GitHub?',
      category: 'github_release',
      source_urls: ['https://github.com/vercel/next.js/releases']
    },
    {
      question: 'Does the AWS status page indicate the current AWS Health Dashboard is reachable?',
      category: 'status_page',
      source_urls: ['https://health.aws.amazon.com/health/status']
    },
    {
      question: 'Has TechCrunch published any article on its homepage in the last 24 hours?',
      category: 'content_publication',
      source_urls: ['https://techcrunch.com/']
    }
  ];
}
