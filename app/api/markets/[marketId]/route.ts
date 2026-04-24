import { NextRequest, NextResponse } from 'next/server';
import { marketView } from '@lib/clients/wundergraph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { marketId: string } }) {
  const view = await marketView(params.marketId);
  if (!view) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(view);
}
