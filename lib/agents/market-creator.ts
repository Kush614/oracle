// Agent — Market Creator (spec §5.1).
//
// Trigger: Nexla delivers a market_candidate.
// Output: MarketCard in Redis JSON + paper order book + 50/50 opening odds.

import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import { newMarketId } from '@shared/ids';
import { CONFIG } from '@shared/config';
import type { MarketCard, PaperOrderBook } from '@shared/types';
import { governedRun, sealedWorkspace } from '@lib/clients/guild';
import { latestMarketCandidates, type MarketCandidate } from '@lib/clients/nexla';

export interface CreateMarketArgs {
  question: string;
  category: string;
  source_urls: string[];
  deadline_hours?: number;
}

export async function createMarket(args: CreateMarketArgs): Promise<MarketCard> {
  validate(args);

  const ws = sealedWorkspace('market_creator', 'guild-market-creator-v1');
  ws.log('validate', { question: args.question, sources: args.source_urls.length });

  const { output } = await governedRun(ws, undefined, async () => {
    const bus = await getBus();
    const marketId = newMarketId();
    const deadlineHours = args.deadline_hours ?? CONFIG.defaultDeadlineHours;
    const now = new Date();
    const closeTime = new Date(now.getTime() + deadlineHours * 3600_000).toISOString();

    const card: MarketCard = {
      market_id: marketId,
      question: args.question,
      category: args.category,
      source_urls: args.source_urls,
      close_time: closeTime,
      created_at: now.toISOString(),
      stage: 'evidence_collection',
      cycle: 1,
      odds_yes: 0.5,
      confidence: 0,
      outcome: 'PENDING',
      evidence_count: 0
    };

    const orderBook: PaperOrderBook = {
      market_id: marketId,
      levels: [
        { side: 'YES', price: 0.5, size: 1000 },
        { side: 'NO', price: 0.5, size: 1000 }
      ],
      last_price: 0.5
    };

    await bus.jsonSet(keys.marketState(marketId), card);
    await bus.jsonSet(keys.marketOrderBook(marketId), orderBook);
    await bus.sadd(keys.marketIndex, marketId);
    await bus.tsAdd(keys.oddsTs(marketId), { ts: Date.now(), value: 0.5 });
    await bus.xadd(keys.marketEvents(marketId), {
      kind: 'market_created',
      at: now.toISOString(),
      market_id: marketId
    });

    ws.log('market_created', { market_id: marketId, close_time: closeTime });

    return { output: card, outcome: 'market_created', confidence: 1 };
  });

  return output;
}

export async function autoCreateFromFeeds(): Promise<MarketCard[]> {
  const cands: MarketCandidate[] = await latestMarketCandidates();
  const created: MarketCard[] = [];
  for (const c of cands) {
    created.push(await createMarket(c));
  }
  return created;
}

function validate(args: CreateMarketArgs) {
  if (!args.question || args.question.length < 6) {
    throw new Error('market question too short');
  }
  if (args.question.length > 400) {
    throw new Error('market question exceeds 400-char ceiling');
  }
  if (!isBinaryResolvable(args.question)) {
    throw new Error('market question must be binary-resolvable (start with Will/Does/Is/Has...)');
  }
  if (!args.source_urls.length) {
    throw new Error('at least one source URL required');
  }
}

function isBinaryResolvable(question: string): boolean {
  return /^(Will|Does|Is|Has|Have|Did|Was)\b/i.test(question.trim());
}
