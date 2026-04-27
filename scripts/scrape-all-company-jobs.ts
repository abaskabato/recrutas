/**
 * Full company job discovery pipeline:
 * 1. Resolves all unresolved Adzuna URLs
 * 2. Extracts ATS IDs from resolved URLs
 * 3. Scrapes all known ATS companies for fresh jobs
 *
 * Usage:
 *   npx tsx scripts/scrape-all-company-jobs.ts [--dry-run] [--limit N]
 */
import 'dotenv/config';
import postgres from 'postgres';
import { listAtsJobs, resolveAdzunaLink } from '../server/lib/adzuna-link-resolver';
import { jobIngestionService } from '../server/services/job-ingestion.service';

const DRY_RUN   = process.argv.includes('--dry-run');
const LIMIT_ARG  = process.argv.indexOf('--limit');
const MAX_ADZUNA = LIMIT_ARG !== -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : 500;
const CONC      = 8;
const ATS_TYPES = new Set(['greenhouse', 'lever', 'ashby', 'workable', 'recruitee']);

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 3, prepare: false });

  // --- PHASE 1: Resolve Adzuna redirect URLs ---
  console.log('=== PHASE 1: Resolving Adzuna URLs ===');
  const unresolved = await sql`
    SELECT id, title, company, location, external_url, description
    FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
    ORDER BY id DESC
    LIMIT ${MAX_ADZUNA}
  `;
  console.log(`Found ${unresolved.length} unresolved Adzuna jobs`);

  let resolved = 0, stillAdzuna = 0;
  const updates: Array<{ id: number; url: string; via: string }> = [];

  for (let i = 0; i < unresolved.length; i += CONC) {
    const slice = unresolved.slice(i, i + CONC);
    const results = await Promise.allSettled(
      slice.map(async (j) => {
        const r = await resolveAdzunaLink({
          title: j.title,
          company: j.company,
          location: j.location,
          fallbackUrl: j.external_url,
          description: j.description ?? undefined,
        });
        return { id: j.id, url: r.url, via: r.resolvedVia };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.url !== r.value.url) break; // noop
        if (!r.value.url.includes('adzuna')) {
          resolved++;
          updates.push(r.value);
        } else {
          stillAdzuna++;
        }
      }
    }

    process.stdout.write(`\r  [${i + CONC}/${unresolved.length}] resolved=${resolved} still_adzuna=${stillAdzuna}   `);
  }
  console.log(`\nPhase 1: ${resolved} resolved, ${stillAdzuna} still Adzuna`);

  if (!DRY_RUN && updates.length > 0) {
    // Bulk update via unnest — one round trip instead of N
    const ids  = updates.map(u => u.id);
    const urls = updates.map(u => u.url);
    await sql`
      UPDATE job_postings AS jp
      SET external_url = v.url
      FROM unnest(${sql.array(ids)}::int[], ${sql.array(urls)}::text[]) AS v(id, url)
      WHERE jp.id = v.id
    `;
  }

  // --- PHASE 2: Scrape ATS companies ---
  console.log('\n=== PHASE 2: Scraping ATS Companies ===');
  const atsCompanies = await sql`
    SELECT "normalizedName", "detectedAts", "atsId"
    FROM discovered_companies
    WHERE status = 'approved'
      AND "detectedAts" IN ('greenhouse', 'lever', 'ashby', 'workable', 'recruitee')
  `;
  console.log(`Found ${atsCompanies.length} companies with ATS APIs`);

  let scraped = 0, totalJobs = 0;
  const allJobs: any[] = [];

  for (let i = 0; i < atsCompanies.length; i += CONC) {
    const slice = atsCompanies.slice(i, i + CONC);
    const results = await Promise.allSettled(
      slice.map(async (entry) => {
        try {
          const jobs = await listAtsJobs(entry.detectedAts as any, entry.atsId);
          return jobs.length > 0 ? { company: entry.normalizedName, atsType: entry.detectedAts, jobs } : null;
        } catch { return null; }
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        scraped++;
        totalJobs += r.value.jobs.length;
        for (const j of r.value.jobs) {
          allJobs.push({
            title: j.title,
            company: r.value.company,
            location: j.location || '',
            description: '',
            requirements: [],
            skills: [],
            workType: 'hybrid',
            source: `ATS:${r.value.atsType}`,
            externalId: j.url,
            externalUrl: j.url,
            postedDate: new Date().toISOString(),
          });
        }
      }
    }

    process.stdout.write(`\r  [${Math.min(i + CONC, atsCompanies.length)}/${atsCompanies.length}] companies=${scraped} jobs=${totalJobs}   `);
  }

  console.log(`\nPhase 2: ${scraped} companies, ${totalJobs} fresh jobs`);

  if (!DRY_RUN && allJobs.length > 0) {
    console.log('\nIngesting...');
    const stats = await jobIngestionService.ingestExternalJobs(allJobs);
    console.log('Stats:', stats);
  }

  console.log('\n=== DONE ===');
  console.log(`Adzuna URLs resolved: ${resolved}`);
  console.log(`ATS companies scraped: ${scraped}`);
  console.log(`Fresh jobs found: ${totalJobs}`);

  await sql.end();
}

main().catch(err => { console.error(err); process.exit(1); });