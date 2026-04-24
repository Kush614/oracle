import Link from 'next/link';
import type { MarketCard } from '@shared/types';
import { StageBadge } from './StageBadge';

const CARD_BGS = [
  'bg-oracle-pink',
  'bg-oracle-mint',
  'bg-oracle-sky',
  'bg-oracle-peach',
  'bg-oracle-lavender',
  'bg-oracle-yellow'
];

export function MarketCardView({ market, index = 0 }: { market: MarketCard; index?: number }) {
  const bg = CARD_BGS[index % CARD_BGS.length];
  const odds = market.odds_yes * 100;
  return (
    <Link
      href={`/market/${market.market_id}`}
      className={`panel ${bg} block p-6 transition-all duration-150 hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-brutLg`}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="chip chip-ink">{market.category}</span>
            <StageBadge stage={market.stage} outcome={market.outcome} />
            <span className="chip">{market.evidence_count} evd</span>
            <span className="chip">cycle {market.cycle}</span>
          </div>
          <h3 className="font-display text-xl md:text-2xl leading-tight">
            {market.question}
          </h3>
          <div className="mt-3 text-xs font-mono text-oracle-ink/70 truncate">
            {market.market_id} · closes {new Date(market.close_time).toLocaleTimeString()}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="panel-flat bg-oracle-card p-4 min-w-[110px]">
            <div className="kicker text-oracle-mute">YES</div>
            <div className="font-display text-4xl leading-none mt-1">
              {odds.toFixed(0)}%
            </div>
            <div className="kicker text-oracle-mute mt-2">conf</div>
            <div className="font-display text-base">{(market.confidence * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 bg-oracle-card border-2 border-oracle-line rounded-full overflow-hidden">
        <div
          className="h-full bg-oracle-ink transition-all duration-500"
          style={{ width: `${odds}%` }}
        />
      </div>
    </Link>
  );
}
