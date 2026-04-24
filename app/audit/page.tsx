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
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Link href="/" className="link-chunky text-xs">← back</Link>

      <header className="panel bg-oracle-lavender p-8 mt-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="sticker text-lg">📒</div>
          <span className="chip chip-ink">audit log</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none">Full trace</h1>
        <p className="mt-3 max-w-xl">
          Every agent run, every challenge, every resolution — stored in Ghost.build Postgres.
          This is what a verifier reads to reproduce any verdict.
        </p>
      </header>

      <section className="panel bg-oracle-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="sticker bg-oracle-sky text-base">🤖</div>
          <h2 className="font-display text-2xl">Agent runs <span className="text-oracle-mute">({runs.length})</span></h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-oracle-mute border-b-2 border-oracle-line">
              <tr>
                <th className="text-left py-2 pr-4">started</th>
                <th className="text-left pr-4">agent</th>
                <th className="text-left pr-4">market</th>
                <th className="text-left pr-4">outcome</th>
                <th className="text-left pr-4">conf</th>
                <th className="text-left">duration</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 40).map(r => {
                const started = new Date(r.started_at);
                const ended = new Date(r.ended_at);
                return (
                  <tr key={r.run_id} className="border-b border-oracle-line/20 hover:bg-oracle-bg">
                    <td className="py-1.5 pr-4 text-oracle-mute">{started.toISOString().slice(11, 19)}</td>
                    <td className="pr-4">{r.agent}</td>
                    <td className="pr-4 text-oracle-mute truncate max-w-[200px]">{r.market_id}</td>
                    <td className="pr-4 text-oracle-ink">{r.outcome}</td>
                    <td className="pr-4">{r.confidence !== undefined && r.confidence !== null ? `${(Number(r.confidence) * 100).toFixed(0)}%` : '—'}</td>
                    <td className="text-oracle-mute">{ended.getTime() - started.getTime()}ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel bg-oracle-peach p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="sticker bg-oracle-card text-base">⚔</div>
            <h2 className="font-display text-xl">Challenges <span className="text-oracle-mute">({challenges.length})</span></h2>
          </div>
          <ul className="text-sm space-y-2">
            {challenges.map(c => (
              <li key={`${c.market_id}:${c.cycle}`} className="panel-flat bg-oracle-card p-3 flex items-center justify-between gap-2">
                <span className="font-mono text-xs truncate">{c.market_id} · c{c.cycle}</span>
                <span className={`chip ${c.result === 'VERDICT REVERSED' ? 'chip-warn' : 'chip-yes'}`}>
                  {c.result === 'VERDICT REVERSED' ? '⚡ reversed' : '✓ stands'} · {c.max_contradiction_confidence.toFixed(2)}
                </span>
              </li>
            ))}
            {challenges.length === 0 && (
              <li className="font-mono text-xs text-oracle-ink/70">none yet</li>
            )}
          </ul>
        </div>

        <div className="panel bg-oracle-mint p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="sticker bg-oracle-card text-base">📜</div>
            <h2 className="font-display text-xl">Resolutions <span className="text-oracle-mute">({resolutions.length})</span></h2>
          </div>
          <ul className="text-sm space-y-2">
            {resolutions.map(r => (
              <li key={r.market_id} className="panel-flat bg-oracle-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs truncate">{r.market_id}</span>
                  <span className={`chip ${r.outcome === 'YES' ? 'chip-yes' : r.outcome === 'NO' ? 'chip-no' : 'chip-warn'}`}>
                    {r.outcome}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-oracle-mute mt-1 truncate">
                  {r.resolver_digest}
                </div>
              </li>
            ))}
            {resolutions.length === 0 && (
              <li className="font-mono text-xs text-oracle-ink/70">none yet</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
