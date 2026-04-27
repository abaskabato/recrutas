import 'dotenv/config';
import { JobAggregator } from '../server/job-aggregator';

async function main() {
  const agg = new JobAggregator();

  console.log('Running fetchFromAdzuna…');
  const t0 = Date.now();
  const jobs = await agg.fetchFromAdzuna([]);
  const elapsed = Date.now() - t0;
  console.log(`Got ${jobs.length} jobs in ${elapsed}ms\n`);

  if (jobs.length === 0) {
    console.log('No jobs — cannot assess swap rate.');
    return;
  }

  const swapped = jobs.filter(j => !j.externalUrl.includes('adzuna.com'));
  const kept = jobs.filter(j => j.externalUrl.includes('adzuna.com'));
  const nonAdzunaSource = jobs.filter(j => j.source !== 'Adzuna');

  console.log(`URL swapped (non-Adzuna link):  ${swapped.length} (${((swapped.length / jobs.length) * 100).toFixed(1)}%)`);
  console.log(`URL kept (Adzuna redirect):     ${kept.length} (${((kept.length / jobs.length) * 100).toFixed(1)}%)`);
  console.log(`Cards with source != 'Adzuna':  ${nonAdzunaSource.length}  (should be 0)`);

  console.log('\n=== Sample of swapped cards (up to 10) ===');
  swapped.slice(0, 10).forEach(j => {
    console.log(`[${j.source}] ${j.company} — ${j.title}`);
    console.log(`  → ${j.externalUrl.slice(0, 120)}`);
  });

  console.log('\n=== Sample of kept cards (up to 5) ===');
  kept.slice(0, 5).forEach(j => {
    console.log(`[${j.source}] ${j.company} — ${j.title}`);
    console.log(`  → ${j.externalUrl.slice(0, 120)}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
