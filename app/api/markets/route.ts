import { NextRequest, NextResponse } from 'next/server';
import { createMarket } from '@lib/agents/market-creator';
import { listMarkets } from '@lib/clients/wundergraph';
import { charge } from '@lib/clients/x402';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const markets = await listMarkets();
  return NextResponse.json({ markets });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    question: string;
    category?: string;
    source_urls: string[];
    deadline_hours?: number;
    user_id?: string;
    skip_payment?: boolean;
  };

  // x402 gate — market creation costs paper USDC.
  if (!body.skip_payment) {
    const charged = await charge(body.user_id ?? 'demo_user', 'market_create');
    if (!charged.ok) {
      return NextResponse.json({ error: charged.reason, quote: charged.quote }, { status: 402 });
    }
  }

  try {
    const card = await createMarket({
      question: body.question,
      category: body.category ?? 'general',
      source_urls: body.source_urls,
      deadline_hours: body.deadline_hours
    });
    return NextResponse.json({ market: card });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
