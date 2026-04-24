import Link from 'next/link';
import { listMarkets, agentLeaderboard } from '@lib/clients/wundergraph';
import { listResolutions } from '@lib/clients/ghost';
import { MarketCardView } from '@/components/dashboard/MarketCardView';
import { AgentLeaderboard } from '@/components/dashboard/AgentLeaderboard';
import { ResolutionLatency } from '@/components/dashboard/ResolutionLatency';
import { SeedButton } from '@/components/dashboard/SeedButton';
import { SponsorMarquee } from '@/components/dashboard/SponsorMarquee';
import { QuickDemo } from '@/components/dashboard/QuickDemo';
import { RecentResolutions } from '@/components/dashboard/RecentResolutions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [markets, scores, resolutions] = await Promise.all([
    listMarkets(),
    agentLeaderboard(),
    listResolutions()
  ]);

  const resolved = markets.filter(m => m.stage === 'resolved' || m.stage === 'disputed');
  const open = markets.filter(m => !['resolved', 'disputed', 'no_consensus'].includes(m.stage));

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <Hero />
      <SponsorMarquee />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
        <Stat label="Markets" value={markets.length.toString()} tone="pink" />
        <Stat label="Open" value={open.length.toString()} tone="sky" />
        <Stat label="Resolved" value={resolved.length.toString()} tone="mint" />
        <Stat label="Cited.md" value={resolutions.length.toString()} tone="yellow" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <SectionHeader
              kicker="01 · Live markets"
              title="Every verdict is a cited.md"
              sticker="⚡"
            />
            <div className="flex items-center gap-2">
              <SeedButton />
              <Link href="/new" className="btn btn-pink">＋ New</Link>
            </div>
          </div>
          {markets.length === 0 ? <EmptyState /> : (
            <ul className="space-y-4">
              {markets.map((m, i) => (
                <li key={m.market_id} className={i % 2 === 0 ? 'rotate-m1' : 'rotate-p1'}>
                  <MarketCardView market={m} index={i} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <SectionHeader kicker="02 · Resolved" title="Cited artifacts" sticker="📜" />
            <div className="panel p-5 mt-4 bg-oracle-yellow">
              <RecentResolutions resolutions={resolutions} />
            </div>
          </div>
          <div>
            <SectionHeader kicker="03 · Tournament" title="Leaderboard" sticker="🏆" />
            <div className="panel p-5 mt-4 bg-oracle-lavender">
              <AgentLeaderboard scores={scores} />
            </div>
          </div>
          <div>
            <SectionHeader kicker="04 · Latency" title="End-to-end" sticker="⏱" />
            <div className="panel p-5 mt-4 bg-oracle-mint">
              <ResolutionLatency resolutions={resolutions} />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="panel bg-oracle-pink p-8 md:p-12 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div>
          <span className="chip chip-ink mb-4">attested resolution infrastructure</span>
          <h2 className="font-display text-4xl md:text-6xl leading-[1] mt-4">
            Five agents. <br />
            One <u className="decoration-oracle-ink decoration-4 underline-offset-4">cited.md</u>. <br />
            Zero hand-waving.
          </h2>
          <p className="mt-6 max-w-xl text-base md:text-lg leading-snug">
            Oracle gathers evidence, challenges itself, and publishes a cryptographically signed
            resolution for every prediction market. Nobody has to trust the resolver — verifiers
            re-run the published Guild agent against the same evidence chain.
          </p>
          <div className="mt-6">
            <QuickDemo />
          </div>
        </div>
        <div className="panel p-6 bg-oracle-card rotate-p2 hidden lg:block">
          <div className="kicker mb-3">cited.md · attestation</div>
          <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
{`## Attestation
resolver_image:   cgr.dev/chainguard/node:latest
resolver_digest:  sha256:9e33f02b…
resolver_version: kushise27/oracle-resolver@612364ca9c06
challenge:        FAILED
sigstore_verify: |
  cosign verify cgr.dev/chainguard/node:latest \\
    --certificate-identity-regexp='…' \\
    --certificate-oidc-issuer=https://…
cited_md_hash:    sha256:fca36380…`}
          </pre>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'pink' | 'sky' | 'mint' | 'yellow' }) {
  const bg = {
    pink: 'bg-oracle-pink',
    sky: 'bg-oracle-sky',
    mint: 'bg-oracle-mint',
    yellow: 'bg-oracle-yellow'
  }[tone];
  return (
    <div className={`panel p-5 ${bg}`}>
      <div className="kicker">{label}</div>
      <div className="font-display text-4xl md:text-5xl mt-2 leading-none">{value}</div>
    </div>
  );
}

function SectionHeader({ kicker, title, sticker }: { kicker: string; title: string; sticker?: string }) {
  return (
    <div className="flex items-center gap-3">
      {sticker && <div className="sticker text-lg">{sticker}</div>}
      <div>
        <div className="kicker text-oracle-mute">{kicker}</div>
        <h3 className="font-display text-xl md:text-2xl leading-none mt-1">{title}</h3>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="panel p-10 text-center bg-oracle-card pattern-grid">
      <div className="sticker text-2xl mx-auto mb-4">🌱</div>
      <p className="font-display text-2xl mb-2">No markets yet.</p>
      <p className="text-oracle-mute max-w-sm mx-auto">
        Hit <b className="text-oracle-ink">▶ Run end-to-end demo</b> above — one click seeds three markets
        and resolves the first one automatically.
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-12 pt-6 border-t-3 border-oracle-line">
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
        <div>
          <div className="kicker mb-1">Built on</div>
          <div className="font-display text-base">
            TinyFish · Nexla · Redis · Guild.ai · InsForge · Ghost.build · Wundergraph · Chainguard
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="http://localhost:3002" target="_blank" rel="noreferrer" className="link-chunky text-sm">
            Cosmo playground ↗
          </a>
          <Link href="/audit" className="link-chunky text-sm">
            Audit log →
          </Link>
        </div>
      </div>
    </footer>
  );
}
