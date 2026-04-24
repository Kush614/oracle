import type { EvidenceObject } from '@shared/types';
import { tierForSource } from '@shared/types';

export function EvidenceStream({ evidence }: { evidence: EvidenceObject[] }) {
  if (evidence.length === 0) {
    return (
      <div className="font-mono text-xs text-oracle-ink/70 p-6 text-center pattern-dots rounded-lg">
        no evidence collected yet.
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {evidence.slice(-8).reverse().map(e => {
        const tier = tierForSource(e.source_type);
        const chipCls =
          e.supports === 'YES' ? 'chip-yes' : e.supports === 'NO' ? 'chip-no' : '';
        const tierLabel = ['', 'T1 · official', 'T2 · primary', 'T3 · news', 'T4 · community'][tier];
        const tierColor = ['', 'chip-yes', 'chip-sky', 'chip-lav', 'chip-warn'][tier];
        return (
          <li key={e.evidence_id} className="panel-flat bg-oracle-card p-3">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`chip ${chipCls}`}>{e.supports}</span>
              <span className={`chip ${tierColor}`}>{tierLabel}</span>
              <span className="chip font-mono text-[10px]">{e.source_type}</span>
              <span className="ml-auto font-display text-sm">
                {(e.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <a
              href={e.source}
              target="_blank"
              rel="noreferrer"
              className="block font-mono text-xs text-oracle-ink truncate"
            >
              {e.source}
            </a>
            <div className="font-mono text-[11px] text-oracle-ink/70 mt-0.5 truncate">
              {e.event}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
