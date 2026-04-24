import type { AgentScore } from '@shared/types';

export function AgentLeaderboard({ scores }: { scores: AgentScore[] }) {
  if (scores.length === 0) {
    return <div className="font-mono text-xs text-oracle-ink/70">no runs yet — seed a market to start the tournament.</div>;
  }
  return (
    <ul className="space-y-2">
      {scores.slice(0, 6).map((s, i) => (
        <li key={s.agent} className="flex items-center gap-3">
          <span className="sticker w-7 h-7 text-sm bg-oracle-card font-display">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm truncate">{s.agent}</div>
            <div className="text-[11px] font-mono text-oracle-ink/70">
              {s.runs} run{s.runs !== 1 ? 's' : ''} · acc {(s.verdict_accuracy * 100).toFixed(0)}%
              · cit {s.citation_coverage.toFixed(1)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
