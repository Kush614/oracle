// Oracle "warm" subgraph — resolution records served from Ghost.build Postgres
// (spec §4.2, §8.4). Extends Market with resolution / challenge / cited.md,
// and owns the agent tournament leaderboard.

import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';

const gql = (strings: TemplateStringsArray, ...values: unknown[]) =>
  parse(String.raw({ raw: strings }, ...values.map(v => String(v))));

import {
  listAgentRuns,
  listAgentScores,
  listChallenges,
  listResolutions,
  getPublishedCitedMd
} from '@lib/clients/ghost';

export const warmTypeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.3"
      import: ["@key", "@external"]
    )

  type Market @key(fields: "id") {
    id: ID! @external
    resolution: Resolution
    challenges: [Challenge!]!
    citedMd: CitedMd
  }

  type Resolution {
    cycle: Int!
    outcome: String!
    confidence: Float!
    narrative: String!
    resolverAgent: String!
    resolverDigest: String!
    resolvedAt: String!
    sbomRef: String!
  }

  type Challenge {
    cycle: Int!
    challengerAgent: String!
    counterSourcesFound: Int!
    maxContradictionConfidence: Float!
    threshold: Float!
    result: String!
    ranAt: String!
  }

  type CitedMd {
    hash: String!
    url: String!
    publishedAt: String!
    markdown: String!
  }

  type AgentScore {
    agent: String!
    runs: Int!
    verdictAccuracy: Float!
    citationCoverage: Float!
    confidenceCalibration: Float!
    resolutionLatencyMs: Float!
    challengeSuccessRate: Float
  }

  type AgentRun {
    runId: String!
    agent: String!
    marketId: String!
    startedAt: String!
    endedAt: String!
    outcome: String!
    confidence: Float
  }

  type Query {
    resolution(marketId: ID!): Resolution
    resolutions: [Resolution!]!
    agentScores: [AgentScore!]!
    agentRuns(marketId: ID): [AgentRun!]!
  }
`;

type MarketRef = { __typename: 'Market'; id: string };

export const warmResolvers = {
  Query: {
    async resolution(_: unknown, args: { marketId: string }) {
      return (await listResolutions()).find(r => r.market_id === args.marketId) ?? null;
    },
    async resolutions() {
      return listResolutions();
    },
    async agentScores() {
      return listAgentScores();
    },
    async agentRuns(_: unknown, args: { marketId?: string }) {
      const runs = await listAgentRuns();
      return args.marketId ? runs.filter(r => r.market_id === args.marketId) : runs;
    }
  },

  Market: {
    async resolution(m: MarketRef | { id: string }) {
      return (await listResolutions()).find(r => r.market_id === m.id) ?? null;
    },
    async challenges(m: MarketRef | { id: string }) {
      return (await listChallenges()).filter(c => c.market_id === m.id);
    },
    async citedMd(m: MarketRef | { id: string }) {
      const p = await getPublishedCitedMd(m.id);
      if (!p) return null;
      return { hash: p.hash, url: p.url, publishedAt: p.publishedAt, markdown: p.markdown };
    }
  },

  Resolution: {
    cycle: (r: { cycle: number }) => r.cycle,
    resolverAgent: (r: { resolver_agent: string }) => r.resolver_agent,
    resolverDigest: (r: { resolver_digest: string }) => r.resolver_digest,
    resolvedAt: (r: { resolved_at: string }) => r.resolved_at,
    sbomRef: (r: { sbom_ref: string }) => r.sbom_ref
  },
  Challenge: {
    challengerAgent: (c: { challenger_agent: string }) => c.challenger_agent,
    counterSourcesFound: (c: { counter_sources_found: number }) => c.counter_sources_found,
    maxContradictionConfidence: (c: { max_contradiction_confidence: number }) => c.max_contradiction_confidence,
    ranAt: (c: { ran_at: string }) => c.ran_at
  },
  AgentScore: {
    verdictAccuracy: (s: { verdict_accuracy: number }) => s.verdict_accuracy,
    citationCoverage: (s: { citation_coverage: number }) => s.citation_coverage,
    confidenceCalibration: (s: { confidence_calibration: number }) => s.confidence_calibration,
    resolutionLatencyMs: (s: { resolution_latency_ms: number }) => s.resolution_latency_ms,
    challengeSuccessRate: (s: { challenge_success_rate?: number }) => s.challenge_success_rate ?? null
  },
  AgentRun: {
    runId: (r: { run_id: string }) => r.run_id,
    marketId: (r: { market_id: string }) => r.market_id,
    startedAt: (r: { started_at: string }) => r.started_at,
    endedAt: (r: { ended_at: string }) => r.ended_at
  }
};

export const warmSchema = buildSubgraphSchema({ typeDefs: warmTypeDefs, resolvers: warmResolvers });
