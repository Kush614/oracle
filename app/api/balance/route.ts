import { NextRequest, NextResponse } from 'next/server';
import { getBalance } from '@lib/clients/insforge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('user_id') ?? 'demo_user';
  const bal = await getBalance(userId);
  return NextResponse.json(bal);
}
