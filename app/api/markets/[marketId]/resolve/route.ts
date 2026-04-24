import { NextRequest, NextResponse } from 'next/server';
import { runFullPipeline } from '@lib/agents/pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { marketId: string } }) {
  try {
    const run = await runFullPipeline(params.marketId);
    return NextResponse.json({ run });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
