'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewMarketPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('Has Next.js released a version tagged v14 or higher on GitHub?');
  const [sources, setSources] = useState('https://github.com/vercel/next.js/releases');
  const [deadline, setDeadline] = useState(4);
  const [category, setCategory] = useState('github_release');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setStatus('Charging x402 market_create (0.10 USDC)…');
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
      setStatus('Payment required — paper balance insufficient');
      setSubmitting(false);
      return;
    }
    const body = await resp.json();
    if (!resp.ok) {
      setStatus(`error: ${body.error}`);
      setSubmitting(false);
      return;
    }
    setStatus('Market created. Redirecting…');
    router.push(`/market/${body.market.market_id}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/" className="link-chunky text-xs">← back</Link>

      <header className="panel bg-oracle-pink p-8 mt-4 mb-6">
        <span className="chip chip-ink">create</span>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-3">A brand new market.</h1>
        <p className="mt-3 max-w-xl">
          Paper USDC only. Creation costs <b>0.10</b> via x402.
          Market Creator validates the question is binary-resolvable, writes a
          MarketCard into Redis JSON, and opens the paper order book at 50/50.
        </p>
      </header>

      <div className="panel bg-oracle-card p-6 md:p-8 space-y-5">
        <Field label="Question" hint="Must start with Will / Does / Is / Has. Max 400 chars.">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="w-full bg-oracle-bg border-3 border-oracle-line rounded-lg px-4 py-3 font-sans text-base focus:outline-none focus:shadow-brut"
          />
        </Field>

        <Field label="Source URLs" hint="One per line — TinyFish will browse each one.">
          <textarea
            rows={4}
            value={sources}
            onChange={e => setSources(e.target.value)}
            className="w-full bg-oracle-bg border-3 border-oracle-line rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:shadow-brut"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Deadline (hours)">
            <input
              type="number"
              min={1}
              max={24}
              value={deadline}
              onChange={e => setDeadline(Number(e.target.value))}
              className="w-full bg-oracle-bg border-3 border-oracle-line rounded-lg px-4 py-3 font-display text-lg"
            />
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-oracle-bg border-3 border-oracle-line rounded-lg px-4 py-3 font-sans text-sm"
            >
              <option value="github_release">github_release</option>
              <option value="status_page">status_page</option>
              <option value="content_publication">content_publication</option>
              <option value="api_health">api_health</option>
              <option value="open_source_pr">open_source_pr</option>
            </select>
          </Field>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t-2 border-oracle-line/20">
          <button onClick={submit} disabled={submitting} className="btn btn-yellow">
            {submitting ? '⟳ creating…' : '⚡ Create market (0.10 USDC)'}
          </button>
          {status && <span className="chip chip-ink animate-wobble">{status}</span>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="kicker mb-2">{label}</div>
      {children}
      {hint && <div className="text-xs text-oracle-mute mt-1.5">{hint}</div>}
    </label>
  );
}
