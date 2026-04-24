import { NextRequest, NextResponse } from 'next/server';
import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import type { MarketCard } from '@shared/types';
import { getPublishedCitedMd } from '@lib/clients/ghost';
import { verifyCitedMd } from '@lib/cited-md/generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { marketId: string } }) {
  const bus = await getBus();
  const card = await bus.jsonGet<MarketCard>(keys.marketState(params.marketId));
  if (!card) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const published = await getPublishedCitedMd(params.marketId);
  if (!published) {
    return NextResponse.json(
      { error: 'not_published', reason: 'market not yet resolved or cited.md not stored in fallback store' },
      { status: 404 }
    );
  }
  const verification = verifyCitedMd(published.markdown);
  return NextResponse.json({
    market_id: params.marketId,
    markdown: published.markdown,
    ghost_url: published.url,
    published_at: published.publishedAt,
    verification
  });
}
