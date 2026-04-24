import { NextRequest, NextResponse } from 'next/server';
import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import type { EvidenceObject } from '@shared/types';
import { gatherEvidence } from '@lib/agents/evidence-gatherer';
import { adjustOdds } from '@lib/agents/odds-adjuster';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { marketId: string } }) {
  const bus = await getBus();
  const stream = await bus.xrange<EvidenceObject>(keys.marketEvents(params.marketId));
  const evidence = stream
    .map(s => ({ id: s.id, ...s.data }))
    .filter(e => 'source_type' in e);
  return NextResponse.json({ evidence });
}

export async function POST(_req: NextRequest, { params }: { params: { marketId: string } }) {
  const gather = await gatherEvidence(params.marketId);
  const odds = await adjustOdds(params.marketId);
  return NextResponse.json({ gather, odds });
}
