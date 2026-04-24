/**
 * Batch-migrates all Adzuna jobs in job_postings that still have redirect URLs.
 * Runs the link resolver over them in chunks and writes resolved URLs + trust scores back.
 *
 * Usage: npx tsx scripts/migrate-adzuna-links.ts [--dry-run] [--limit N]
 */
import 'dotenv/config';
import postgres from 'postgres';
import { resolveAdzunaLinksBatch } from '../server/lib/adzuna-link-resolver';

const DRY_RUN   = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.indexOf('--limit');
const MAX_JOBS  = LIMIT_ARG !== -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : Infinity;

const CHUNK    = 50;   // jobs per batch
const CONC     = 10;   // resolver concurrency
const TIMEOUT  = 15_000; // ms per chunk

// Trust scores matching aggregator
const TRUST = { ats: 90, careers_page: 85 };

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL, { max: 3, prepare: false });

  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*) as count FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
  `;
  const total = Math.min(parseInt(count, 10), MAX_JOBS === Infinity ? Infinity : MAX_JOBS);
  console.log(`Found ${count} unresolved Adzuna jobs${MAX_JOBS !== Infinity ? ` (limiting to ${MAX_JOBS})` : ''}`);
  if (DRY_RUN) console.log('DRY RUN — no writes\n');

  let processed = 0, resolved = 0, atsDl = 0, careersPage = 0, fallback = 0, offset = 0;
  const startedAt = Date.now();

  while (processed < total) {
    const jobs = await sql<Array<{ id: number; title: string; company: string; location: string; external_url: string }>>`
      SELECT id, title, company, location, external_url
      FROM job_postings
      WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
      ORDER BY id
      LIMIT ${CHUNK} OFFSET ${offset}
    `;
    if (jobs.length === 0) break;
    offset += jobs.length;

    const inputs = jobs.map(j => ({
      title: j.title, company: j.company,
      location: j.location ?? '', fallbackUrl: j.external_url,
    }));

    const results = await resolveAdzunaLinksBatch(inputs, { concurrency: CONC, timeoutMs: TIMEOUT });

    const updates: Array<{ id: number; url: string; trustScore: number }> = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      processed++;
      if (!r.resolved) { fallback++; continue; }
      resolved++;
      const trustScore = r.resolvedVia === 'ats' ? TRUST.ats : TRUST.careers_page;
      if (r.resolvedVia === 'ats') atsDl++; else careersPage++;
      updates.push({ id: jobs[i].id, url: r.url, trustScore });
    }

    if (!DRY_RUN && updates.length > 0) {
      for (const u of updates) {
        await sql`
          UPDATE job_postings
          SET external_url = ${u.url}, trust_score = ${u.trustScore}
          WHERE id = ${u.id}
        `;
      }
    }

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
    const pct = ((processed / total) * 100).toFixed(1);
    const line = `[${elapsed}s] ${processed}/${total} (${pct}%) | resolved=${resolved} ats=${atsDl} hp=${careersPage} fallback=${fallback}`;
    if (process.env.CI) {
      console.log(line);
    } else {
      process.stdout.write(`\r${line}   `);
    }

    if (processed >= MAX_JOBS) break;
  }

  console.log(`\n\nDone in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  console.log(`Resolved: ${resolved}/${processed} (${((resolved/processed)*100).toFixed(1)}%)`);
  console.log(`  ATS deep-links:  ${atsDl}`);
  console.log(`  Careers pages:   ${careersPage}`);
  console.log(`  Fallback:        ${fallback}`);

  await sql.end();
}
main().catch(err => { console.error(err); process.exit(1); });
