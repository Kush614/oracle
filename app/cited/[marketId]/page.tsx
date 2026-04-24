import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedCitedMd } from '@lib/clients/ghost';
import { verifyCitedMd } from '@lib/cited-md/generator';

export const dynamic = 'force-dynamic';

// Public cited.md page. This is the URL that ends up in the attestation
// block's `published_to` field. Ghost.build stores the row, this route renders
// it. Authenticated evidence packet access still goes through the x402 gate on
// /api/markets/[id]/evidence — this page shows the canonical public artifact.

export default async function CitedPage({ params }: { params: { marketId: string } }) {
  const published = await getPublishedCitedMd(params.marketId);
  if (!published) notFound();
  const verification = verifyCitedMd(published.markdown);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href={`/market/${params.marketId}`} className="text-xs text-oracle-mute hover:text-oracle-ink">
        ← back to market
      </Link>

      <header className="mt-2 mb-6 flex items-start justify-between gap-6">
        <div>
          <div className="text-xs text-oracle-mute mb-1">{params.marketId}</div>
          <h1 className="text-2xl text-oracle-ink">cited.md</h1>
          <div className="text-xs text-oracle-mute mt-1">published {published.publishedAt}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`chip ${verification.ok ? 'chip-yes' : 'chip-warn'}`}>
            {verification.ok ? 'sha256 verified' : 'sha256 mismatch'}
          </span>
        </div>
      </header>

      <pre className="text-xs leading-relaxed whitespace-pre-wrap border border-oracle-line rounded bg-oracle-panel p-5 text-oracle-ink">
        {published.markdown}
      </pre>

      <section className="mt-6 text-xs text-oracle-mute">
        <div>
          Stored in Ghost.build as a row in <code className="text-oracle-ink">cited_md</code>.{' '}
          <code className="text-oracle-ink">sha256</code> is computed excluding the hash line itself.
        </div>
        <div className="mt-2">
          <b className="text-oracle-ink">Hash claimed:</b> {verification.claimed}
        </div>
        <div>
          <b className="text-oracle-ink">Hash recomputed:</b> {verification.computed}
        </div>
      </section>
    </div>
  );
}
