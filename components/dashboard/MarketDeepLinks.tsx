'use client';

import Link from 'next/link';
import type { MarketStage } from '@shared/types';

export function MarketDeepLinks({ marketId, stage }: { marketId: string; stage: MarketStage }) {
  const resolved = stage === 'resolved' || stage === 'disputed' || stage === 'no_consensus';
  const cosmoQuery = `query{market(id:"${marketId}"){id question oddsYes stage evidence{source supports confidence} resolution{outcome confidence narrative} citedMd{hash url}}}`;
  const cosmoHref = `http://localhost:3002/?query=${encodeURIComponent(cosmoQuery)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {resolved && (
        <Link href={`/cited/${marketId}`} className="chip chip-pink no-underline">
          📜 cited.md ↗
        </Link>
      )}
      <a href={cosmoHref} target="_blank" rel="noreferrer" className="chip chip-sky no-underline">
        🔮 query in Cosmo ↗
      </a>
      <a
        href={`/api/markets/${marketId}`}
        target="_blank"
        rel="noreferrer"
        className="chip no-underline"
      >
        {'{ }'} raw JSON
      </a>
    </div>
  );
}
