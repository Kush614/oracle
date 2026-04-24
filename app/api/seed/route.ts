import { NextResponse } from 'next/server';
import { autoCreateFromFeeds } from '@lib/agents/market-creator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// One-click reseed used by the dashboard "Seed demo markets" button.
export async function POST() {
  const markets = await autoCreateFromFeeds();
  return NextResponse.json({ markets });
}
