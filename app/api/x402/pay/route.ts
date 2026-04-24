import { NextRequest, NextResponse } from 'next/server';
import { charge } from '@lib/clients/x402';
import type { X402Quote } from '@shared/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    gate: X402Quote['gate'];
    market_id?: string;
    user_id?: string;
  };
  if (!body.gate) return NextResponse.json({ error: 'gate required' }, { status: 400 });
  const result = await charge(body.user_id ?? 'demo_user', body.gate, body.market_id);
  if (!result.ok) return NextResponse.json(result, { status: 402 });
  return NextResponse.json(result);
}
