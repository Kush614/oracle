'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SeedButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function seed() {
    setBusy(true);
    await fetch('/api/seed', { method: 'POST' });
    router.refresh();
    setBusy(false);
  }

  return (
    <button onClick={seed} disabled={busy} className="btn">
      {busy ? 'seeding...' : 'Seed demo markets'}
    </button>
  );
}
