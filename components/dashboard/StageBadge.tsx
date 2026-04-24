import type { MarketOutcome, MarketStage } from '@shared/types';

export function StageBadge({ stage, outcome }: { stage: MarketStage; outcome: MarketOutcome }) {
  let label = stage.replace(/_/g, ' ');
  let cls = 'chip';
  if (stage === 'resolved') {
    if (outcome === 'YES' || outcome === 'LIKELY_YES') {
      cls = 'chip chip-yes';
      label = `resolved ${outcome}`;
    } else if (outcome === 'NO' || outcome === 'LIKELY_NO') {
      cls = 'chip chip-no';
      label = `resolved ${outcome}`;
    } else {
      cls = 'chip chip-warn';
      label = `resolved ${outcome}`;
    }
  } else if (stage === 'challenging' || stage === 'challenge_queued') {
    cls = 'chip chip-warn';
  }
  return <span className={cls}>{label}</span>;
}
