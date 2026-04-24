'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MarketStage } from '@shared/types';

export function MarketActions({ marketId, stage }: { marketId: string; stage: MarketStage }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function gather() {
    setBusy('gather');
    setToast('Browsing sources via TinyFish Agent API…');
    await fetch(`/api/markets/${marketId}/evidence`, { method: 'POST' });
    router.refresh();
    setBusy(null);
    setToast('+evidence landed in Redis Streams');
    setTimeout(() => setToast(null), 2500);
  }

  async function resolve() {
    setBusy('resolve');
    setToast('Firing full 5-agent pipeline…');
    await fetch(`/api/markets/${marketId}/resolve`, { method: 'POST' });
    router.refresh();
    setBusy(null);
    setToast('Verdict written to Ghost + cited.md signed');
    setTimeout(() => setToast(null), 3000);
  }

  async function challenge() {
    setBusy('challenge');
    setToast('Paying x402 gate · challenger starting…');
    const resp = await fetch(`/api/markets/${marketId}/challenge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });
    if (resp.status === 402) {
      setToast('x402: insufficient paper balance');
    }
    router.refresh();
    setBusy(null);
    setTimeout(() => setToast(null), 3000);
  }

  const resolved = stage === 'resolved' || stage === 'disputed' || stage === 'no_consensus';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={gather} disabled={busy !== null} className="btn">
        {busy === 'gather' ? '⟳' : '🔎'} Gather evidence
      </button>
      {!resolved && (
        <button onClick={resolve} disabled={busy !== null} className="btn btn-yellow">
          {busy === 'resolve' ? '⟳' : '⚡'} Run full pipeline
        </button>
      )}
      {resolved && (
        <button onClick={challenge} disabled={busy !== null} className="btn btn-pink">
          {busy === 'challenge' ? '⟳' : '⚔'} Challenge (0.25)
        </button>
      )}
      {toast && (
        <span className="chip chip-ink animate-wobble">{toast}</span>
      )}
    </div>
  );
}
