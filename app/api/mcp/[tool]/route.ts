// MCP-over-HTTP dispatcher. Same tool surface as mcp/server.ts (stdio), but
// reachable from browsers and from Claude Desktop's HTTP transport. Every tool
// name listed in spec §10 is dispatched here.

import { NextRequest, NextResponse } from 'next/server';
import { listMarkets, marketView, agentLeaderboard } from '@lib/clients/wundergraph';
import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import type { EvidenceObject, MarketCard } from '@shared/types';
import { createMarket } from '@lib/agents/market-creator';
import { challengeVerdict } from '@lib/agents/challenger';
import { listResolutions } from '@lib/clients/ghost';
import { getPublishedCitedMd } from '@lib/clients/ghost';
import { charge } from '@lib/clients/x402';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { tool: string } }) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tool = params.tool;

  try {
    switch (tool) {
      case 'get_market': {
        const view = await marketView(String(body.market_id));
        return NextResponse.json(view ?? { error: 'not_found' });
      }
      case 'get_evidence_chain': {
        const bus = await getBus();
        const stream = await bus.xrange<EvidenceObject>(keys.marketEvents(String(body.market_id)));
        return NextResponse.json({
          market_id: body.market_id,
          evidence: stream.map(s => s.data).filter(e => 'source_type' in (e as object))
        });
      }
      case 'get_resolution': {
        const verdicts = await listResolutions();
        const v = verdicts.find(r => r.market_id === body.market_id);
        return NextResponse.json(v ?? { error: 'not_found' });
      }
      case 'create_market': {
        const charged = await charge(String(body.user_id ?? 'demo_user'), 'market_create');
        if (!charged.ok) return NextResponse.json({ error: charged.reason }, { status: 402 });
        const card = await createMarket({
          question: String(body.question),
          category: String(body.category ?? 'general'),
          source_urls: (body.source_urls as string[]) ?? [String(body.event_url)],
          deadline_hours: body.deadline_hours as number | undefined
        });
        return NextResponse.json({ market: card });
      }
      case 'get_agent_scores': {
        const scores = await agentLeaderboard();
        return NextResponse.json({ scores });
      }
      case 'challenge_resolution': {
        const charged = await charge(String(body.user_id ?? 'demo_user'), 'challenge_request', String(body.market_id));
        if (!charged.ok) return NextResponse.json({ error: charged.reason }, { status: 402 });
        const bus = await getBus();
        const card = await bus.jsonGet<MarketCard>(keys.marketState(String(body.market_id)));
        if (!card) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        const verdicts = await listResolutions();
        const v = verdicts.find(r => r.market_id === body.market_id);
        if (!v) return NextResponse.json({ error: 'no_prior_verdict' }, { status: 400 });
        const challenge = await challengeVerdict({ market_id: v.market_id, cycle: card.cycle, outcome: v.outcome, confidence: v.confidence });
        return NextResponse.json({ challenge });
      }
      case 'fetch_cited_md': {
        const published = await getPublishedCitedMd(String(body.market_id));
        if (!published) return NextResponse.json({ error: 'not_published' }, { status: 404 });
        return NextResponse.json(published);
      }
      case 'search_resolutions': {
        const q = String(body.query ?? '').toLowerCase();
        const all = await listResolutions();
        const hits = all.filter(r => r.narrative.toLowerCase().includes(q) || r.market_id.toLowerCase().includes(q));
        return NextResponse.json({ hits });
      }
      case 'list_markets': {
        const ms = await listMarkets();
        return NextResponse.json({ markets: ms });
      }
      default:
        return NextResponse.json({ error: `unknown tool: ${tool}` }, { status: 404 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
