'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Step = 'idle' | 'seeding' | 'resolving' | 'redirecting';

export function QuickDemo() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('idle');
  const [err, setErr] = useState<string | null>(null);

  const labels: Record<Step, string> = {
    idle: '▶ Run end-to-end demo',
    seeding: '⟳ Seeding markets…',
    resolving: '⟳ Running pipeline (≈90s)…',
    redirecting: '✓ Redirecting…'
  };

  async function go() {
    setErr(null);
    try {
      setStep('seeding');
      const seedResp = await fetch('/api/seed', { method: 'POST' });
      if (!seedResp.ok) throw new Error(`seed failed: ${seedResp.status}`);
      const body = (await seedResp.json()) as { markets: { market_id: string }[] };
      const marketId = body.markets[0]?.market_id;
      if (!marketId) throw new Error('no market returned');

      // Don't await — pipeline takes ~90s. Navigate immediately so the
      // user sees odds/evidence populate live on the market detail page.
      fetch(`/api/markets/${marketId}/resolve`, { method: 'POST' }).catch(() => {
        /* ignore — live polling on the detail page will reveal errors */
      });
      setStep('resolving');

      // Small delay so the "resolving" label registers visually
      await new Promise(r => setTimeout(r, 400));
      setStep('redirecting');
      router.push(`/market/${marketId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStep('idle');
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={go}
        disabled={step !== 'idle'}
        className="btn btn-yellow"
      >
        {labels[step]}
      </button>
      {err && <span className="chip chip-warn">{err}</span>}
      {step !== 'idle' && (
        <span className="text-xs font-mono text-oracle-ink/70">
          Seeds 3 markets, fires the full 5-agent pipeline on the first, redirects you to its live detail view.
        </span>
      )}
    </div>
  );
}
