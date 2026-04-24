import Link from 'next/link';
import type { MarketCard } from '@shared/types';
import { StageBadge } from './StageBadge';

export function MarketCardView({ market }: { market: MarketCard }) {
  return (
    <Link
      href={`/market/${market.market_id}`}
      className="block border border-oracle-line rounded-md p-4 hover:border-oracle-accent/40 transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] text-oracle-mute mb-1">{market.market_id} · {market.category}</div>
          <h3 className="text-oracle-ink text-sm leading-snug line-clamp-2">{market.question}</h3>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <StageBadge stage={market.stage} outcome={market.outcome} />
            <span className="chip">closes {new Date(market.close_time).toLocaleTimeString()}</span>
            <span className="chip">{market.evidence_count} evd</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xl text-oracle-ink">{(market.odds_yes * 100).toFixed(0)}%</div>
          <div className="text-[10px] text-oracle-mute uppercase">YES · conf {(market.confidence * 100).toFixed(0)}%</div>
        </div>
      </div>
    </Link>
  );
}
