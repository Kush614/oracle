// Smoke test — runs the full local pipeline in-process and prints a one-line
// PASS/FAIL summary. Invoked manually before demos.

import { autoCreateFromFeeds } from '../lib/agents/market-creator';
import { runFullPipeline } from '../lib/agents/pipeline';
import { verifyCitedMd } from '../lib/cited-md/generator';
import { getPublishedCitedMd } from '../lib/clients/ghost';

async function main() {
  const markets = await autoCreateFromFeeds();
  if (markets.length === 0) throw new Error('no markets seeded');

  const first = markets[0];
  const run = await runFullPipeline(first.market_id);

  if (!run.verdict) throw new Error('no verdict produced');

  const published = await getPublishedCitedMd(first.market_id);
  if (!published) throw new Error('cited.md not published to Ghost warm store');

  const verify = verifyCitedMd(published.markdown);
  if (!verify.ok) throw new Error(`cited.md hash mismatch: ${verify.claimed} vs ${verify.computed}`);

  console.log('PASS');
  console.log(`  market      : ${first.market_id}`);
  console.log(`  verdict     : ${run.verdict.outcome}  conf=${run.verdict.confidence.toFixed(3)}`);
  console.log(`  cycles      : ${run.cycles_run}`);
  console.log(`  cited_md    : ${run.cited_md_hash}`);
  console.log(`  ghost       : ${run.ghost_url}`);
  console.log(`  hash verify : OK`);
}

main().catch(err => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
