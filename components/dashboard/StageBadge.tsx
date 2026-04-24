import type { MarketOutcome, MarketStage } from '@shared/types';

export function StageBadge({ stage, outcome }: { stage: MarketStage; outcome: MarketOutcome }) {
  let label = stage.replace(/_/g, ' ');
  let cls = 'chip';

  if (stage === 'resolved') {
    if (outcome === 'YES' || outcome === 'LIKELY_YES') {
      cls = 'chip chip-yes';
      label = `✓ ${outcome}`;
    } else if (outcome === 'NO' || outcome === 'LIKELY_NO') {
      cls = 'chip chip-no';
      label = `✗ ${outcome}`;
    } else {
      cls = 'chip chip-warn';
      label = outcome;
    }
  } else if (stage === 'disputed') {
    cls = 'chip chip-warn';
    label = '⚔ disputed';
  } else if (stage === 'challenging' || stage === 'challenge_queued') {
    cls = 'chip chip-pink';
    label = '⚡ challenging';
  } else if (stage === 'resolving') {
    cls = 'chip chip-lav';
    label = '◎ resolving';
  } else if (stage === 'evidence_collection') {
    cls = 'chip chip-sky';
    label = '⟳ gathering';
  }
  return <span className={cls}>{label}</span>;
}
