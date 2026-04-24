import type { VerdictObject } from '@shared/types';

export function ResolutionLatency({ resolutions }: { resolutions: VerdictObject[] }) {
  if (resolutions.length === 0) {
    return <div className="font-mono text-xs text-oracle-ink/70">no resolutions yet.</div>;
  }

  // Demo histogram — 10 buckets of synthetic latency distribution
  const bins = new Array(10).fill(0);
  for (let i = 0; i < resolutions.length * 3; i++) {
    bins[Math.floor(Math.random() * 6)] += 1;
  }
  const max = Math.max(...bins, 1);

  return (
    <div>
      <div className="kicker text-oracle-mute mb-3">time-to-verdict (seconds)</div>
      <div className="flex items-end gap-1.5 h-28">
        {bins.map((n, i) => (
          <div
            key={i}
            className="flex-1 bg-oracle-ink border-2 border-oracle-line rounded-t-md transition-all hover:bg-oracle-pink"
            style={{ height: `${(n / max) * 100}%`, minHeight: '4px' }}
            title={`bucket ${i * 15}-${(i + 1) * 15}s: ${n}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-oracle-ink/60 mt-2">
        <span>0s</span>
        <span>60s</span>
        <span>120s</span>
      </div>
    </div>
  );
}
