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

  if (loading) {
    return <div className="font-mono text-xs text-oracle-ink/70">loading…</div>;
  }

  if (!data || data.error) {
    return (
      <div className="panel-flat bg-oracle-card p-4 text-center">
        <div className="sticker text-lg mx-auto mb-2">⏳</div>
        <div className="font-display text-sm">cited.md pending</div>
        <div className="text-xs font-mono text-oracle-ink/70 mt-1">run the pipeline above</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`chip ${data.verification?.ok ? 'chip-yes' : 'chip-warn'}`}>
          {data.verification?.ok ? '✓ sha256 verified' : '⚠ hash mismatch'}
        </span>
        {data.ghost_url && (
          <a
            href={data.ghost_url}
            target="_blank"
            rel="noreferrer"
            className="chip chip-ink font-mono text-[10px]"
          >
            ghost.build ↗
          </a>
        )}
      </div>
      <pre className="code-box max-h-96">{data.markdown}</pre>
    </div>
  );
}
