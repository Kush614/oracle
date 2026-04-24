// Oracle — shared type contracts.
// These are the typed objects that flow across the evidence pipeline,
// the agent tournament, and cited.md assembly.

export type SourceAuthorityTier = 1 | 2 | 3 | 4;

export const TIER_WEIGHT: Record<SourceAuthorityTier, number> = {
  1: 1.0,
  2: 0.85,
  3: 0.7,
  4: 0.4
};

export type SourceType =
  | 'official_status_page'
  | 'github_api'
  | 'github_releases'
  | 'government_site'
  | 'official_twitter'
  | 'company_blog'
  | 'press_release'
  | 'news_ap_reuters'
  | 'news_techcrunch'
  | 'reddit'
  | 'hackernews'
  | 'community_forum';

export function tierForSource(sourceType: SourceType): SourceAuthorityTier {
  switch (sourceType) {
    case 'official_status_page':
    case 'github_api':
    case 'github_releases':
    case 'government_site':
      return 1;
    case 'official_twitter':
    case 'company_blog':
    case 'press_release':
      return 2;
    case 'news_ap_reuters':
    case 'news_techcrunch':
      return 3;
    case 'reddit':
    case 'hackernews':
    case 'community_forum':
      return 4;
  }
}

// Incoming Nexla-normalized event shape
export interface EvidenceEvent {
  source: SourceType;
  event: string;
  timestamp: string; // ISO 8601
  confidence: number; // 0..1
  url: string;
  raw_artifact_ref: string;
  supports?: 'YES' | 'NO' | 'NEUTRAL';
}

// Evidence object written into the Redis stream for a market
export interface EvidenceObject {
  evidence_id: string;
  market_id: string;
  source: string; // URL
  source_type: SourceType;
  event: string;
  timestamp: string; // ISO at source
  confidence: number;
  fetched_by: string;
  normalized_by: string;
  artifact_ref: string;
  supports: 'YES' | 'NO' | 'NEUTRAL';
  created_at: string;
}

export type MarketStage =
  | 'open'
  | 'evidence_collection'
  | 'resolution_threshold_reached'
  | 'resolving'
  | 'challenge_queued'
  | 'challenging'
  | 're_open'
  | 'resolved'
  | 'disputed'
  | 'no_consensus';

export type MarketOutcome =
  | 'YES'
  | 'NO'
  | 'LIKELY_YES'
  | 'LIKELY_NO'
  | 'NO_CONSENSUS'
  | 'DISPUTED'
  | 'PENDING';

export interface MarketCard {
  market_id: string;
  question: string;
  category: string;
  source_urls: string[];
  close_time: string; // ISO
  created_at: string;
  stage: MarketStage;
  cycle: 1 | 2;
  odds_yes: number; // 0..1
  confidence: number; // 0..1
  outcome: MarketOutcome;
  resolved_at?: string;
  cited_md_hash?: string;
  ghost_url?: string;
  evidence_count: number;
}

export interface OrderBookLevel {
  side: 'YES' | 'NO';
  price: number; // 0..1
  size: number;
}

export interface PaperOrderBook {
  market_id: string;
  levels: OrderBookLevel[];
  last_price: number;
}

export interface VerdictObject {
  market_id: string;
  cycle: 1 | 2;
  outcome: MarketOutcome;
  confidence: number;
  narrative: string;
  cited_sources: string[]; // evidence_ids
  resolver_agent: string;
  resolver_image: string;
  resolver_digest: string;
  resolved_at: string;
  sbom_ref: string;
}

export interface ChallengeRecord {
  market_id: string;
  cycle: 1 | 2;
  challenger_agent: string;
  counter_sources_found: number;
  max_contradiction_confidence: number;
  threshold: number; // 0.70
  result: 'VERDICT STANDS' | 'VERDICT REVERSED';
  notes: string;
  ran_at: string;
}

export interface AgentRun {
  run_id: string;
  agent: string;
  market_id: string;
  started_at: string;
  ended_at: string;
  outcome: string;
  confidence?: number;
  inputs_ref: string;
  outputs_ref: string;
}

export interface AgentScore {
  agent: string;
  verdict_accuracy: number;
  citation_coverage: number;
  confidence_calibration: number;
  resolution_latency_ms: number;
  challenge_success_rate?: number;
  runs: number;
}

export interface CitedMdBundle {
  market_id: string;
  markdown: string;
  hash: string; // sha256
  ghost_url?: string;
  published_at: string;
}

export interface PaperBalance {
  user_id: string;
  balance: number; // paper USDC equivalent
}

export interface PaperPosition {
  user_id: string;
  market_id: string;
  side: 'YES' | 'NO';
  shares: number;
  avg_price: number;
}

export interface X402Quote {
  gate: 'market_create' | 'evidence_unlock' | 'challenge_request';
  market_id?: string;
  price: number;
  currency: 'USDC_PAPER';
  payment_url: string;
  expires_at: string;
}

// Agent IO envelopes (Guild.ai would wrap these in governed workers)

export interface AgentContext {
  run_id: string;
  agent: string;
  market_id?: string;
  started_at: string;
}

export interface AgentResult<T> {
  context: AgentContext;
  output: T;
  ended_at: string;
  notes?: string;
}
