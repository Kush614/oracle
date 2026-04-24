import Link from 'next/link';
import { marketView } from '@lib/clients/wundergraph';
import { notFound } from 'next/navigation';
import { OddsSparkline } from '@/components/dashboard/OddsSparkline';
import { EvidenceStream } from '@/components/dashboard/EvidenceStream';
import { MarketActions } from '@/components/dashboard/MarketActions';
import { CitedMdPanel } from '@/components/dashboard/CitedMdPanel';
import { StageBadge } from '@/components/dashboard/StageBadge';
import { getBus } from '@lib/redis/bus';
import { keys } from '@lib/redis/keys';
import type { EvidenceObject } from '@shared/types';

export const dynamic = 'force-dynamic';

export default async function MarketDetail({ params }: { params: { marketId: string } }) {
  const view = await marketView(params.marketId);
  if (!view) notFound();

  const bus = await getBus();
  const stream = await bus.xrange<EvidenceObject>(keys.marketEvents(params.marketId));
  const evidence = stream
    .map(s => s.data)
    .filter((e): e is EvidenceObject => 'source_type' in (e as object));

  const odds = view.market.odds_yes * 100;
  const resolved = view.market.stage === 'resolved' || view.market.stage === 'disputed';

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/" className="link-chunky text-xs">← back to dashboard</Link>

      <header className="panel bg-oracle-pink p-8 mt-4 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="chip chip-ink font-mono text-[10px]">{view.market.market_id}</span>
              <span className="chip">{view.market.category}</span>
              <StageBadge stage={view.market.stage} outcome={view.market.outcome} />
              <span className="chip">cycle {view.market.cycle}</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl leading-tight">
              {view.market.question}
            </h1>
          </div>
          <div className="panel-flat bg-oracle-card p-5 min-w-[170px] text-center">
            <div className="kicker text-oracle-mute">YES</div>
            <div className="font-display text-5xl leading-none mt-1">{odds.toFixed(0)}%</div>
            <div className="mt-3 text-xs font-mono">conf {(view.market.confidence * 100).toFixed(1)}%</div>
          </div>
        </div>
        <div className="mt-6">
          <MarketActions marketId={view.market.market_id} stage={view.market.stage} />
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="panel p-6 lg:col-span-2 bg-oracle-card">
          <SectionHeader kicker="Live odds" title="From the moment evidence lands" sticker="📈" />
          <div className="mt-4">
            <OddsSparkline points={view.currentOdds} />
          </div>
        </div>
        <div className="panel p-6 bg-oracle-mint">
          <SectionHeader kicker="Agent activity" title={`${view.agentRuns.length} runs`} sticker="🤖" />
          <ul className="space-y-2 mt-4 text-sm">
            {view.agentRuns.slice(0, 8).map((r, i) => {
              const agent = (r as { agent: string }).agent;
              const outcome = (r as { outcome: string }).outcome;
              return (
                <li key={i} className="flex items-start justify-between gap-2 border-b-2 border-oracle-line/20 pb-2">
                  <span className="font-mono text-xs truncate">{agent}</span>
                  <span className="chip text-[10px]">{outcome}</span>
                </li>
              );
            })}
            {view.agentRuns.length === 0 && (
              <li className="font-mono text-xs text-oracle-ink/70">no runs yet — hit &laquo;Run pipeline&raquo;</li>
            )}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-6 bg-oracle-sky">
          <SectionHeader kicker="Evidence stream" title={`${evidence.length} objects`} sticker="🔎" />
          <div className="mt-4">
            <EvidenceStream evidence={evidence} />
          </div>
        </div>
        <div className="panel p-6 bg-oracle-yellow">
          <SectionHeader kicker="cited.md" title={resolved ? 'Published' : 'Pending verdict'} sticker="📜" />
          <div className="mt-4">
            <CitedMdPanel marketId={params.marketId} />
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ kicker, title, sticker }: { kicker: string; title: string; sticker: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="sticker bg-oracle-card text-lg">{sticker}</div>
      <div>
        <div className="kicker text-oracle-mute">{kicker}</div>
        <h3 className="font-display text-xl leading-none mt-1">{title}</h3>
      </div>
    </div>
  );
}
