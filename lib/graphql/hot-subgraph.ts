// Oracle "hot" subgraph — market state served from Redis (spec §4.2, §8.4).
//
// Owns the fields that change on every tick: odds, confidence, stage, live
// evidence stream, order book. Federates with the `warm` subgraph via the
// shared Market key.

import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';

const gql = (strings: TemplateStringsArray, ...values: unknown[]) =>
  parse(String.raw({ raw: strings }, ...values.map(v => String(v))));

import type { EvidenceObject, MarketCard } from '@shared/types';
import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';

export const hotTypeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.3"
      import: ["@key", "@shareable"]
    )

  type Market @key(fields: "id") {
    id: ID!
    question: String!
    category: String!
    stage: String!
    cycle: Int!
    oddsYes: Float!
    confidence: Float!
    outcome: String!
    closeTime: String!
    createdAt: String!
    evidenceCount: Int!
    sourceUrls: [String!]!
    evidence: [EvidenceEvent!]!
    oddsHistory: [OddsPoint!]!
  }

  type EvidenceEvent {
    evidenceId: String!
    source: String!
    sourceType: String!
    event: String!
    confidence: Float!
    supports: String!
    timestamp: String!
    fetchedBy: String!
  }

  type OddsPoint {
    ts: Float!
    value: Float!
  }

  type Query {
    market(id: ID!): Market
    markets: [Market!]!
  }
`;

type ReferenceMarket = { __typename: 'Market'; id: string };

export const hotResolvers = {
  Query: {
    async market(_: unknown, args: { id: string }): Promise<MarketCard | null> {
      const bus = await getBus();
      return bus.jsonGet<MarketCard>(keys.marketState(args.id));
    },
    async markets(): Promise<MarketCard[]> {
      const bus = await getBus();
      const ids = await bus.smembers(keys.marketIndex);
      const out: MarketCard[] = [];
      for (const id of ids) {
        const m = await bus.jsonGet<MarketCard>(keys.marketState(id));
        if (m) out.push(m);
      }
      out.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return out;
    }
  },

  Market: {
    __resolveReference(ref: ReferenceMarket) {
      return (async () => {
        const bus = await getBus();
        return bus.jsonGet<MarketCard>(keys.marketState(ref.id));
      })();
    },
    id: (m: MarketCard) => m.market_id,
    oddsYes: (m: MarketCard) => m.odds_yes,
    evidenceCount: (m: MarketCard) => m.evidence_count,
    sourceUrls: (m: MarketCard) => m.source_urls,
    closeTime: (m: MarketCard) => m.close_time,
    createdAt: (m: MarketCard) => m.created_at,
    async evidence(m: MarketCard) {
      const bus = await getBus();
      const stream = await bus.xrange<EvidenceObject>(keys.marketEvents(m.market_id));
      return stream
        .map(s => s.data)
        .filter((e): e is EvidenceObject => typeof (e as EvidenceObject).source_type === 'string')
        .map(e => ({
          evidenceId: e.evidence_id,
          source: e.source,
          sourceType: e.source_type,
          event: e.event,
          confidence: e.confidence,
          supports: e.supports,
          timestamp: e.timestamp,
          fetchedBy: e.fetched_by
        }));
    },
    async oddsHistory(m: MarketCard) {
      const bus = await getBus();
      return bus.tsRange(keys.oddsTs(m.market_id));
    }
  }
};

export const hotSchema = buildSubgraphSchema({ typeDefs: hotTypeDefs, resolvers: hotResolvers });
