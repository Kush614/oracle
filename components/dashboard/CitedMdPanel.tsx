'use client';

import { useEffect, useState } from 'react';

interface CitedResp {
  markdown?: string;
  ghost_url?: string;
  published_at?: string;
  verification?: { claimed: string; computed: string; ok: boolean };
  error?: string;
}

export function CitedMdPanel({ marketId }: { marketId: string }) {
  const [data, setData] = useState<CitedResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const resp = await fetch(`/api/markets/${marketId}/cited`);
      const body = (await resp.json()) as CitedResp;
      if (!cancelled) {
        setData(body);
        setLoading(false);
      }
    }
    tick();
    const t = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [marketId]);

  if (loading) return <div className="text-oracle-mute text-xs">loading...</div>;
  if (!data || data.error) {
    return (
      <div className="text-oracle-mute text-xs">
        cited.md not yet published — resolve the market to generate one.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px]">
        <span className={`chip ${data.verification?.ok ? 'chip-yes' : 'chip-warn'}`}>
          {data.verification?.ok ? 'hash verified' : 'hash mismatch'}
        </span>
        {data.ghost_url && (
          <a href={data.ghost_url} target="_blank" rel="noreferrer" className="chip">
            ghost: {data.ghost_url}
          </a>
        )}
      </div>
      <pre className="text-[11px] whitespace-pre-wrap leading-relaxed bg-oracle-bg border border-oracle-line rounded p-3 max-h-96 overflow-auto text-oracle-ink">
        {data.markdown}
      </pre>
    </div>
  );
}
