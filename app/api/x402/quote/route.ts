import { NextRequest, NextResponse } from 'next/server';
import { quote } from '@lib/clients/x402';
import type { X402Quote } from '@shared/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gate = searchParams.get('gate') as X402Quote['gate'];
  const marketId = searchParams.get('market_id') ?? undefined;
  if (!gate) return NextResponse.json({ error: 'gate required' }, { status: 400 });
  return NextResponse.json({ quote: quote(gate, marketId) }, { status: 402 });
}
