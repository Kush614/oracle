// Seed three demo markets and pre-resolve one of them so the dashboard has
// instant content (a resolved market with cited.md + challenge record).

import { autoCreateFromFeeds } from '../lib/agents/market-creator';
import { runFullPipeline } from '../lib/agents/pipeline';

async function main() {
  console.log('Seeding demo markets via Nexla candidate feed...');
  const markets = await autoCreateFromFeeds();
  for (const m of markets) {
    console.log(`  · ${m.market_id}  ${m.question.slice(0, 60)}...`);
  }

  // Pre-resolve the first market so the dashboard has a cited.md on load.
  const preResolve = markets[0];
  if (preResolve) {
    console.log(`\nRunning full pipeline on ${preResolve.market_id}...`);
    const run = await runFullPipeline(preResolve.market_id);
    console.log(`  verdict: ${run.verdict?.outcome}  conf: ${run.verdict?.confidence?.toFixed(3)}`);
    console.log(`  cited_md: ${run.cited_md_hash}`);
    console.log(`  ghost:    ${run.ghost_url}`);
  }
}

main().then(
  () => process.exit(0),
  err => {
    console.error(err);
    process.exit(1);
  }
);
