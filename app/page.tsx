import Link from 'next/link';
import { listMarkets, agentLeaderboard } from '@lib/clients/wundergraph';
import { listResolutions } from '@lib/clients/ghost';
import { MarketCardView } from '@/components/dashboard/MarketCardView';
import { AgentLeaderboard } from '@/components/dashboard/AgentLeaderboard';
import { ResolutionLatency } from '@/components/dashboard/ResolutionLatency';
import { SeedButton } from '@/components/dashboard/SeedButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [markets, scores, resolutions] = await Promise.all([
    listMarkets(),
    agentLeaderboard(),
    listResolutions()
  ]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-oracle-ink">Oracle</h1>
          <p className="text-oracle-mute text-sm mt-1">
            Attested resolution infrastructure for prediction markets. Every verdict is a{' '}
            <span className="text-oracle-accent">cited.md</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SeedButton />
          <Link href="/new" className="btn btn-primary">
            + Create market
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 panel p-5">
          <h2 className="text-sm uppercase tracking-wider text-oracle-mute mb-4">Live markets</h2>
          {markets.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-3">
              {markets.map(m => (
                <li key={m.market_id}>
                  <MarketCardView market={m} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="panel p-5">
            <h2 className="text-sm uppercase tracking-wider text-oracle-mute mb-4">Agent tournament</h2>
            <AgentLeaderboard scores={scores} />
          </div>
          <div className="panel p-5">
            <h2 className="text-sm uppercase tracking-wider text-oracle-mute mb-4">Resolution latency</h2>
            <ResolutionLatency resolutions={resolutions} />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-oracle-line rounded-md p-8 text-center text-oracle-mute">
      <p>No markets yet.</p>
      <p className="mt-2 text-sm">
        Click <b className="text-oracle-ink">Seed demo markets</b> to watch Nexla push three candidate markets into Redis and
        kick off the agent tournament.
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 pt-6 border-t border-oracle-line text-xs text-oracle-mute flex justify-between">
      <div>Oracle — five-agent adversarial resolution · TinyFish · Nexla · Redis · Guild.ai · InsForge · Ghost · Wundergraph · Chainguard</div>
      <div>
        <Link href="/audit">Audit log</Link>
      </div>
    </footer>
  );
}
