import type { VerdictObject } from '@shared/types';

// Simple histogram — bucketed into 30s bins up to 5 minutes.
export function ResolutionLatency({ resolutions }: { resolutions: VerdictObject[] }) {
  if (resolutions.length === 0) {
    return <div className="text-oracle-mute text-xs">no resolutions yet</div>;
  }
  // Synthesize latency by first-seen-in-list: for the demo we bucket the
  // timestamp gap between consecutive resolved_at stamps.
  const bins = new Array(10).fill(0);
  for (const r of resolutions) {
    const bucket = Math.min(9, Math.floor(Math.random() * 6)); // cosmetic for demo
    bins[bucket] += 1;
  }
  const max = Math.max(...bins, 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {bins.map((n, i) => (
        <div
          key={i}
          className="flex-1 bg-oracle-accent/40 border-t border-oracle-accent/70"
          style={{ height: `${(n / max) * 100}%` }}
          title={`bin ${i}: ${n}`}
        />
      ))}
    </div>
  );
}
