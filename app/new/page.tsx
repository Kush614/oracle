'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewMarketPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('Will oracle-demo/widget release v2.0.0 before 17:00 UTC today?');
  const [sources, setSources] = useState(
    'https://api.github.com/repos/oracle-demo/widget/releases\nhttps://news.ycombinator.com/'
  );
  const [deadline, setDeadline] = useState(4);
  const [category, setCategory] = useState('github_release');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setStatus('charging x402 market_create...');
    const resp = await fetch('/api/markets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question,
        category,
        source_urls: sources.split('\n').map(s => s.trim()).filter(Boolean),
        deadline_hours: deadline
      })
    });
    if (resp.status === 402) {
      setStatus('payment required — paper balance insufficient');
      setSubmitting(false);
      return;
    }
    const body = await resp.json();
    if (!resp.ok) {
      setStatus(`error: ${body.error}`);
      setSubmitting(false);
      return;
    }
    setStatus('market created');
    router.push(`/market/${body.market.market_id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link href="/" className="text-xs text-oracle-mute hover:text-oracle-ink">← back</Link>
      <h1 className="text-2xl mt-2 mb-6">Create market</h1>
      <p className="text-oracle-mute text-sm mb-6">
        Paper market. Creation costs 0.10 paper USDC via x402. Market Creator agent validates the question
        is binary-resolvable, writes a MarketCard into Redis JSON, and opens the paper order book at 50/50.
      </p>

      <div className="space-y-4">
        <label className="block">
          <div className="text-xs text-oracle-mute uppercase mb-1">Question</div>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="w-full bg-oracle-bg border border-oracle-line rounded px-3 py-2 text-sm text-oracle-ink"
          />
          <div className="text-[11px] text-oracle-mute mt-1">Must start with Will / Does / Is / Has. Max 400 chars.</div>
        </label>

        <label className="block">
          <div className="text-xs text-oracle-mute uppercase mb-1">Source URLs (one per line)</div>
          <textarea
            rows={5}
            value={sources}
            onChange={e => setSources(e.target.value)}
            className="w-full bg-oracle-bg border border-oracle-line rounded px-3 py-2 text-sm text-oracle-ink font-mono"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <div className="text-xs text-oracle-mute uppercase mb-1">Deadline (hours)</div>
            <input
              type="number"
              min={1}
              max={24}
              value={deadline}
              onChange={e => setDeadline(Number(e.target.value))}
              className="w-full bg-oracle-bg border border-oracle-line rounded px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <div className="text-xs text-oracle-mute uppercase mb-1">Category</div>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-oracle-bg border border-oracle-line rounded px-3 py-2 text-sm"
            >
              <option value="github_release">github_release</option>
              <option value="status_page">status_page</option>
              <option value="content_publication">content_publication</option>
              <option value="api_health">api_health</option>
              <option value="open_source_pr">open_source_pr</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={submit} disabled={submitting} className="btn btn-primary">
            {submitting ? 'working...' : 'Create market (pay 0.10 USDC)'}
          </button>
          {status && <span className="text-xs text-oracle-mute">{status}</span>}
        </div>
      </div>
    </div>
  );
}
