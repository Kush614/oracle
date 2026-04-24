import Link from 'next/link';
import { listAgentRuns, listChallenges, listResolutions } from '@lib/clients/ghost';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const [runs, challenges, resolutions] = await Promise.all([
    listAgentRuns(),
    listChallenges(),
    listResolutions()
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link href="/" className="text-xs text-oracle-mute hover:text-oracle-ink">← back</Link>
      <h1 className="text-2xl mt-2 mb-6">Audit log</h1>

      <section className="panel p-5 mb-6">
        <h2 className="text-sm uppercase tracking-wider text-oracle-mute mb-3">Agent runs ({runs.length})</h2>
        <table className="w-full text-xs">
          <thead className="text-oracle-mute">
            <tr>
              <th className="text-left py-1">started</th>
              <th className="text-left">agent</th>
              <th className="text-left">market</th>
              <th className="text-left">outcome</th>
              <th className="text-left">conf</th>
              <th className="text-left">duration</th>
            </tr>
          </thead>
          <tbody>
            {runs.slice(0, 40).map(r => (
              <tr key={r.run_id} className="border-t border-oracle-line">
                <td className="py-1 text-oracle-mute">{r.started_at.slice(11, 19)}</td>
                <td>{r.agent}</td>
                <td className="text-oracle-mute">{r.market_id}</td>
                <td className="text-oracle-ink">{r.outcome}</td>
                <td>{r.confidence !== undefined ? (r.confidence * 100).toFixed(0) + '%' : ''}</td>
                <td className="text-oracle-mute">{(new Date(r.ended_at).getTime() - new Date(r.started_at).getTime())}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel p-5 mb-6">
        <h2 className="text-sm uppercase tracking-wider text-oracle-mute mb-3">Challenges ({challenges.length})</h2>
        <ul className="text-sm space-y-1">
          {challenges.map(c => (
            <li key={`${c.market_id}:${c.cycle}`} className="flex items-center justify-between border-b border-oracle-line py-1">
              <span>{c.market_id} <span className="text-oracle-mute">cycle {c.cycle}</span></span>
              <span className={c.result === 'VERDICT REVERSED' ? 'text-oracle-warn' : 'text-oracle-yes'}>
                {c.result} @ {c.max_contradiction_confidence.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-5">
        <h2 className="text-sm uppercase tracking-wider text-oracle-mute mb-3">Resolutions ({resolutions.length})</h2>
        <ul className="text-sm space-y-1">
          {resolutions.map(r => (
            <li key={r.market_id} className="flex items-center justify-between border-b border-oracle-line py-1">
              <span>{r.market_id}</span>
              <span>
                <span className="text-oracle-ink">{r.outcome}</span>
                <span className="text-oracle-mute ml-2">{r.resolver_digest.slice(0, 20)}...</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
