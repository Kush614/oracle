// Redis key helpers. Centralized so the key schema matches spec §4.2 exactly
// and no two callsites ever compose keys by hand.

export const keys = {
  marketState: (id: string) => `oracle:market:${id}:state`,
  marketEvents: (id: string) => `oracle:market:${id}:events`,
  marketOrderBook: (id: string) => `oracle:market:${id}:orderbook`,
  evidenceDedup: (id: string) => `oracle:market:${id}:evidence_dedup`,
  challengeQueue: (id: string) => `oracle:market:${id}:challenge_queue`,
  oddsTs: (id: string) => `oracle:market:${id}:odds_ts`,
  agentMemory: (agentId: string) => `oracle:agent:${agentId}:memory`,
  semanticCache: (queryHash: string) => `oracle:semantic:${queryHash}`,
  agentRuns: 'oracle:agent_runs',
  marketIndex: 'oracle:markets:index',
  resolutions: 'oracle:resolutions'
};
