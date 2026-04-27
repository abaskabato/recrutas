import 'dotenv/config';
import postgres from 'postgres';
import { resolveAdzunaLinksBatch, _resetCacheForTests } from '../server/lib/adzuna-link-resolver';

async function main() {
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL not set');

  const sql = postgres(url, { max: 1, prepare: false });

  console.log('Querying DB for Adzuna jobs…');
  const rows = await sql<Array<{ title: string; company: string; location: string | null; external_url: string }>>`
    SELECT title, company, location, external_url
    FROM job_postings
    WHERE source = 'Adzuna'
      AND (
        title ILIKE '%software%' OR title ILIKE '%engineer%'
        OR title ILIKE '%data%' OR title ILIKE '%product manager%'
        OR title ILIKE '%devops%' OR title ILIKE '%backend%'
      )
    ORDER BY RANDOM()
    LIMIT 25
  `;
  console.log(`Got ${rows.length} Adzuna jobs from DB\n`);

  if (rows.length === 0) {
    console.log('No Adzuna jobs in DB — nothing to test.');
    await sql.end();
    return;
  }

  _resetCacheForTests();

  const inputs = rows.map(j => ({
    title: j.title,
    company: j.company,
    location: j.location ?? undefined,
    fallbackUrl: j.external_url,
  }));

  console.log('Resolving…');
  const t0 = Date.now();
  const results = await resolveAdzunaLinksBatch(inputs, { concurrency: 5 });
  const elapsed = Date.now() - t0;

  let resolved = 0;
  results.forEach((r, i) => {
    if (r.resolved) resolved++;
    const status = r.resolved ? `✓ ${r.atsType} (${r.score?.toFixed(2)})` : '✗ kept';
    console.log(`[${i + 1}] ${status}  ${rows[i].company} — ${rows[i].title}`);
    if (r.resolved) console.log(`      → ${r.url.slice(0, 110)}`);
  });

  console.log(`\nSummary: ${resolved}/${rows.length} resolved in ${elapsed}ms`);
  await sql.end();
}

main().catch(err => { console.error(err); process.exit(1); });
