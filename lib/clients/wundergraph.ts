// Wundergraph — federated GraphQL facade (spec §8.4).
//
// Live mode points at a deployed Wundergraph endpoint that federates Redis,
// Ghost (Postgres), and in-Redis market state. Fallback mode reads directly
// from the same sources — same surface, same shapes.

import { CONFIG } from '@shared/config';
import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import type { MarketCard, VerdictObject } from '@shared/types';
import {
  listAgentRuns,
  listAgentScores,
  listResolutions,
  getPublishedCitedMd
} from './ghost';

export interface MarketView {
  market: MarketCard;
  currentOdds: { ts: number; value: number }[];
  evidenceCount: number;
  agentRuns: unknown[];
  resolution: VerdictObject | null;
  ghostUrl?: string;
}

// Shape returned by the federated MarketView query (hot ⊗ warm).
interface CosmoMarket {
  id: string;
  question: string;
  stage: string;
  cycle: number;
  oddsYes: number;
  confidence: number;
  outcome: string;
  closeTime: string;
  evidenceCount: number;
  sourceUrls: string[];
  evidence: unknown[];
  oddsHistory: { ts: number; value: number }[];
  resolution: {
    cycle: number;
    outcome: string;
    confidence: number;
    narrative: string;
    resolverDigest: string;
    resolvedAt: string;
  } | null;
  challenges: { cycle: number; result: string; maxContradictionConfidence: number }[];
  citedMd: { hash: string; url: string; publishedAt: string } | null;
}

function cosmoToMarketView(m: CosmoMarket): MarketView {
  const card: MarketCard = {
    market_id: m.id,
    question: m.question,
    category: 'general',
    source_urls: m.sourceUrls,
    close_time: m.closeTime,
    created_at: m.closeTime,
    stage: m.stage as MarketCard['stage'],
    cycle: (m.cycle as 1 | 2) ?? 1,
    odds_yes: m.oddsYes,
    confidence: m.confidence,
    outcome: m.outcome as MarketCard['outcome'],
    evidence_count: m.evidenceCount,
    ghost_url: m.citedMd?.url,
    cited_md_hash: m.citedMd?.hash
  };
  const resolution = m.resolution
    ? ({
        market_id: m.id,
        cycle: m.resolution.cycle as 1 | 2,
        outcome: m.resolution.outcome as VerdictObject['outcome'],
        confidence: m.resolution.confidence,
        narrative: m.resolution.narrative,
        cited_sources: [],
        resolver_agent: 'cosmo-federated',
        resolver_image: '',
        resolver_digest: m.resolution.resolverDigest,
        resolved_at: m.resolution.resolvedAt,
        sbom_ref: ''
      } satisfies VerdictObject)
    : null;
  return {
    market: card,
    currentOdds: m.oddsHistory,
    evidenceCount: m.evidenceCount,
    agentRuns: [],
    resolution,
    ghostUrl: m.citedMd?.url
  };
}

const FEDERATED_MARKET_VIEW = /* GraphQL */ `
  query MarketView($id: ID!) {
    market(id: $id) {
      id
      question
      stage
      cycle
      oddsYes
      confidence
      outcome
      closeTime
      evidenceCount
      sourceUrls
      evidence {
        evidenceId
        source
        sourceType
        event
        confidence
        supports
        timestamp
        fetchedBy
      }
      oddsHistory {
        ts
        value
      }
      resolution {
        cycle
        outcome
        confidence
        narrative
        resolverDigest
        resolvedAt
      }
      challenges {
        cycle
        result
        maxContradictionConfidence
      }
      citedMd {
        hash
        url
        publishedAt
      }
    }
  }
`;

export async function marketView(marketId: string): Promise<MarketView | null> {
  if (CONFIG.integrationMode('wundergraph') === 'live') {
    const resp = await fetch(`${process.env.WUNDERGRAPH_URL}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.WUNDERGRAPH_TOKEN ? { authorization: `Bearer ${process.env.WUNDERGRAPH_TOKEN}` } : {})
      },
      body: JSON.stringify({ query: FEDERATED_MARKET_VIEW, variables: { id: marketId } })
    });
    if (resp.ok) {
      const body = (await resp.json()) as {
        data?: { market: CosmoMarket | null };
        errors?: unknown;
      };
      if (body.data?.market) return cosmoToMarketView(body.data.market);
    }
  }

  const bus = await getBus();
  const market = await bus.jsonGet<MarketCard>(keys.marketState(marketId));
  if (!market) return null;
  const odds = await bus.tsRange(keys.oddsTs(marketId));
  const evidenceCount = await bus.xlen(keys.marketEvents(marketId));
  const resolution = (await listResolutions()).find(r => r.market_id === marketId) ?? null;
  const agentRuns = (await listAgentRuns()).filter(r => r.market_id === marketId);
  const cited = await getPublishedCitedMd(marketId);
  return {
    market,
    currentOdds: odds,
    evidenceCount,
    agentRuns,
    resolution,
    ghostUrl: market.ghost_url ?? cited?.url
  };
}

export async function listMarkets(): Promise<MarketCard[]> {
  const bus = await getBus();
  const index = await bus.smembers(keys.marketIndex);
  const out: MarketCard[] = [];
  for (const id of index) {
    const m = await bus.jsonGet<MarketCard>(keys.marketState(id));
    if (m) out.push(m);
  }
  out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return out;
}

export async function agentLeaderboard() {
  return listAgentScores();
}
