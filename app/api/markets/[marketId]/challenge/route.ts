import { NextRequest, NextResponse } from 'next/server';
import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import type { MarketCard, VerdictObject } from '@shared/types';
import { challengeVerdict } from '@lib/agents/challenger';
import { listResolutions } from '@lib/clients/ghost';
import { charge } from '@lib/clients/x402';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { marketId: string } }) {
  const body = (await req.json().catch(() => ({}))) as { user_id?: string; skip_payment?: boolean };
  if (!body.skip_payment) {
    const charged = await charge(body.user_id ?? 'demo_user', 'challenge_request', params.marketId);
    if (!charged.ok) {
      return NextResponse.json({ error: charged.reason, quote: charged.quote }, { status: 402 });
    }
  }

  const bus = await getBus();
  const card = await bus.jsonGet<MarketCard>(keys.marketState(params.marketId));
  if (!card) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const verdicts = await listResolutions();
  const verdict = verdicts.find(v => v.market_id === params.marketId);
  if (!verdict) return NextResponse.json({ error: 'no_prior_verdict' }, { status: 400 });

  const record = await challengeVerdict({
    market_id: verdict.market_id,
    cycle: card.cycle,
    outcome: verdict.outcome,
    confidence: verdict.confidence
  } as Pick<VerdictObject, 'market_id' | 'cycle' | 'outcome' | 'confidence'>);

  return NextResponse.json({ challenge: record });
}
