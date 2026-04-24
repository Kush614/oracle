import type { EvidenceObject } from '@shared/types';
import { tierForSource } from '@shared/types';

export function EvidenceStream({ evidence }: { evidence: EvidenceObject[] }) {
  if (evidence.length === 0) {
    return <div className="text-oracle-mute text-xs">no evidence yet — run a gather pass</div>;
  }
  return (
    <ul className="space-y-2 text-xs">
      {evidence.slice(-10).reverse().map(e => {
        const tier = tierForSource(e.source_type);
        const tone =
          e.supports === 'YES' ? 'text-oracle-yes' : e.supports === 'NO' ? 'text-oracle-no' : 'text-oracle-mute';
        return (
          <li key={e.evidence_id} className="border-b border-oracle-line pb-2">
            <div className="flex items-center gap-2">
              <span className={`chip ${e.supports === 'YES' ? 'chip-yes' : e.supports === 'NO' ? 'chip-no' : ''}`}>
                {e.supports}
              </span>
              <span className="chip">tier {tier}</span>
              <span className="text-oracle-mute">{e.source_type}</span>
              <span className={tone}>{(e.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="text-oracle-ink mt-1 truncate">
              <a href={e.source} target="_blank" rel="noreferrer">{e.source}</a>
            </div>
            <div className="text-oracle-mute truncate">{e.event}</div>
          </li>
        );
      })}
    </ul>
  );
}
