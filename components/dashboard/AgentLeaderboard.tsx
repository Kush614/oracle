import type { AgentScore } from '@shared/types';

export function AgentLeaderboard({ scores }: { scores: AgentScore[] }) {
  if (scores.length === 0) {
    return <div className="text-oracle-mute text-xs">no runs yet</div>;
  }
  return (
    <table className="w-full text-xs">
      <thead className="text-oracle-mute">
        <tr>
          <th className="text-left py-1">agent</th>
          <th className="text-right">runs</th>
          <th className="text-right">acc</th>
          <th className="text-right">cit</th>
          <th className="text-right">ms</th>
        </tr>
      </thead>
      <tbody>
        {scores.map(s => (
          <tr key={s.agent} className="border-t border-oracle-line">
            <td className="py-1 text-oracle-ink truncate max-w-[160px]">{s.agent}</td>
            <td className="text-right">{s.runs}</td>
            <td className="text-right">{(s.verdict_accuracy * 100).toFixed(0)}%</td>
            <td className="text-right">{s.citation_coverage.toFixed(1)}</td>
            <td className="text-right text-oracle-mute">{Math.round(s.resolution_latency_ms)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
