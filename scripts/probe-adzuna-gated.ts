import 'dotenv/config';
import { JobAggregator } from '../server/job-aggregator';

async function main() {
  const agg = new JobAggregator();

  delete process.env.ADZUNA_ENABLED;
  const gated = await agg.fetchFromAdzuna([]);
  console.log(`[gated]   ADZUNA_ENABLED unset → ${gated.length} jobs (expected 0)`);

  process.env.ADZUNA_ENABLED = 'false';
  const explicitFalse = await agg.fetchFromAdzuna([]);
  console.log(`[gated]   ADZUNA_ENABLED=false → ${explicitFalse.length} jobs (expected 0)`);

  const allZero = gated.length === 0 && explicitFalse.length === 0;
  console.log(`\nGate works: ${allZero ? 'YES ✓' : 'NO ✗'}`);
  process.exit(allZero ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
