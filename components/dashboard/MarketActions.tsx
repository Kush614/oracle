'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MarketStage } from '@shared/types';

export function MarketActions({ marketId, stage }: { marketId: string; stage: MarketStage }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function gather() {
    setBusy('gather');
    await fetch(`/api/markets/${marketId}/evidence`, { method: 'POST' });
    router.refresh();
    setBusy(null);
  }

  async function resolve() {
    setBusy('resolve');
    await fetch(`/api/markets/${marketId}/resolve`, { method: 'POST' });
    router.refresh();
    setBusy(null);
  }

  async function challenge() {
    setBusy('challenge');
    const resp = await fetch(`/api/markets/${marketId}/challenge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });
    if (resp.status === 402) {
      alert('x402: insufficient paper balance for challenge');
    }
    router.refresh();
    setBusy(null);
  }

  const resolved = stage === 'resolved' || stage === 'disputed' || stage === 'no_consensus';

  return (
    <div className="flex items-center gap-2">
      <button onClick={gather} disabled={busy !== null} className="btn">
        {busy === 'gather' ? '...' : 'Gather evidence'}
      </button>
      {!resolved && (
        <button onClick={resolve} disabled={busy !== null} className="btn btn-primary">
          {busy === 'resolve' ? '...' : 'Run full pipeline'}
        </button>
      )}
      {resolved && (
        <button onClick={challenge} disabled={busy !== null} className="btn">
          {busy === 'challenge' ? '...' : 'Challenge (0.25)'}
        </button>
      )}
    </div>
  );
}
