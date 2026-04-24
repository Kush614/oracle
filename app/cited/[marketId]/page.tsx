import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedCitedMd } from '@lib/clients/ghost';
import { verifyCitedMd } from '@lib/cited-md/generator';

export const dynamic = 'force-dynamic';

export default async function CitedPage({ params }: { params: { marketId: string } }) {
  const published = await getPublishedCitedMd(params.marketId);
  if (!published) notFound();
  const verification = verifyCitedMd(published.markdown);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href={`/market/${params.marketId}`} className="link-chunky text-xs">
        ← back to market
      </Link>

      <header className="panel bg-oracle-yellow p-8 mt-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="sticker text-lg">📜</div>
          <span className="chip chip-ink font-mono text-[10px]">{params.marketId}</span>
          <span className={`chip ${verification.ok ? 'chip-yes' : 'chip-warn'}`}>
            {verification.ok ? '✓ sha256 verified' : '⚠ hash mismatch'}
          </span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none">cited.md</h1>
        <div className="mt-3 text-sm font-mono text-oracle-ink/80">
          published {published.publishedAt}
        </div>
      </header>

      <pre className="code-box">{published.markdown}</pre>

      <section className="panel bg-oracle-card p-6 mt-6">
        <div className="kicker mb-3">Self-verifying hash</div>
        <p className="text-sm mb-4">
          The file's sha256 is computed with the hash line itself excluded — anyone can re-derive it
          and compare against <code className="font-mono bg-oracle-bg border-2 border-oracle-line px-1.5 py-0.5 rounded">cited_md_hash</code>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          <div>
            <div className="kicker text-oracle-mute mb-1">claimed</div>
            <div className="break-all">{verification.claimed}</div>
          </div>
          <div>
            <div className="kicker text-oracle-mute mb-1">recomputed</div>
            <div className="break-all">{verification.computed}</div>
          </div>
        </div>
      </section>

      <section className="panel bg-oracle-mint p-6 mt-6">
        <div className="kicker mb-2">Stored in</div>
        <p className="text-sm">
          This artifact lives as a row in Ghost.build Postgres (<code className="font-mono">cited_md</code> table).
          The resolver container digest is pinned to Chainguard's signed <code className="font-mono">cgr.dev/chainguard/node:latest</code>;
          run the sigstore-verify command in the attestation block above and you'll get a green ✓.
        </p>
      </section>
    </div>
  );
}
