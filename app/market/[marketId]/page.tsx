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

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link href="/" className="text-xs text-oracle-mute hover:text-oracle-ink">← back to dashboard</Link>
      <header className="mt-2 mb-6 flex items-start justify-between gap-6">
        <div>
          <div className="text-xs text-oracle-mute mb-1">{view.market.market_id}</div>
          <h1 className="text-2xl text-oracle-ink">{view.market.question}</h1>
          <div className="mt-3 flex items-center gap-3">
            <StageBadge stage={view.market.stage} outcome={view.market.outcome} />
            <div className="chip">
              YES {(view.market.odds_yes * 100).toFixed(1)}%
            </div>
            <div className="chip">conf {(view.market.confidence * 100).toFixed(1)}%</div>
            <div className="chip">cycle {view.market.cycle}</div>
          </div>
        </div>
        <MarketActions marketId={view.market.market_id} stage={view.market.stage} />
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="text-sm uppercase tracking-wider text-oracle-mute mb-4">Live odds</h2>
          <OddsSparkline points={view.currentOdds} />
        </div>
        <div className="panel p-5">
          <h2 className="text-sm uppercase tracking-wider text-oracle-mute mb-4">Agent runs</h2>
          <ul className="space-y-2 text-sm">
            {view.agentRuns.slice(0, 8).map((r, i) => (
              <li key={i} className="flex items-start justify-between gap-2">
                <span className="text-oracle-ink truncate">
                  {(r as { agent: string }).agent}
                </span>
                <span className="text-oracle-mute text-xs shrink-0">
                  {(r as { outcome: string }).outcome}
                </span>
              </li>
            ))}
            {view.agentRuns.length === 0 && <li className="text-oracle-mute">no runs yet</li>}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-5">
          <h2 className="text-sm uppercase tracking-wider text-oracle-mute mb-4">Evidence stream</h2>
          <EvidenceStream evidence={evidence} />
        </div>
        <div className="panel p-5">
          <h2 className="text-sm uppercase tracking-wider text-oracle-mute mb-4">cited.md</h2>
          <CitedMdPanel marketId={params.marketId} />
        </div>
      </section>
    </div>
  );
}
