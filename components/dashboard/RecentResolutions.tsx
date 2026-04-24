import Link from 'next/link';
import type { VerdictObject } from '@shared/types';

export function RecentResolutions({ resolutions }: { resolutions: VerdictObject[] }) {
  if (resolutions.length === 0) {
    return (
      <div className="font-mono text-xs text-oracle-ink/70">
        no cited.md yet — run a pipeline.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {resolutions.slice(0, 5).map(r => (
        <li key={r.market_id} className="panel-flat bg-oracle-card p-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`chip ${
                  r.outcome === 'YES' || r.outcome === 'LIKELY_YES'
                    ? 'chip-yes'
                    : r.outcome === 'NO' || r.outcome === 'LIKELY_NO'
                    ? 'chip-no'
                    : 'chip-warn'
                }`}
              >
                {r.outcome}
              </span>
              <span className="text-[10px] font-mono text-oracle-ink/70">
                conf {(r.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="font-mono text-[10px] text-oracle-ink/70 truncate">
              {r.market_id}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={`/market/${r.market_id}`}
              className="chip chip-sky no-underline"
              title="Open market detail"
            >
              detail
            </Link>
            <Link
              href={`/cited/${r.market_id}`}
              className="chip chip-pink no-underline"
              title="View cited.md"
            >
              cited.md ↗
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
