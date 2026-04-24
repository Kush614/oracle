// Evidence refresh tick — the spec says the Evidence Gatherer fires every 5
// minutes while a market is open. This script does one pass: for every open
// market, gather fresh evidence and re-run odds. Intended to be wrapped by a
// cron job or run loop.

import { listMarkets } from '../lib/clients/wundergraph';
import { gatherEvidence } from '../lib/agents/evidence-gatherer';
import { adjustOdds } from '../lib/agents/odds-adjuster';

async function main() {
  const markets = await listMarkets();
  for (const m of markets) {
    if (m.stage === 'resolved' || m.stage === 'disputed' || m.stage === 'no_consensus') continue;
    const gather = await gatherEvidence(m.market_id);
    const odds = await adjustOdds(m.market_id);
    console.log(
      `[tick] ${m.market_id} +${gather.new_evidence.length} evd, odds=${odds.odds_yes.toFixed(2)}, conf=${odds.confidence.toFixed(2)}`
    );
  }
}

main().then(() => process.exit(0), err => { console.error(err); process.exit(1); });
