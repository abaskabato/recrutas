/**
 * Resolve ALL Adzuna job URLs by searching "<title> <company> <city>" via SearXNG.
 *
 * - Specific job page found (path ≥ 2 segments) → update external_url
 * - Generic page or no result                   → set status = 'closed'
 *
 * Usage:
 *   npx tsx scripts/migrate-adzuna-searxng.ts \
 *     [--dry-run] \
 *     [--slice N] [--total-slices M]   # partition for parallel runs
 *     [--concurrency N]                # parallel searches per runner (default 10)
 */
import 'dotenv/config';
import postgres from 'postgres';

const DRY_RUN      = process.argv.includes('--dry-run');
const SLICE        = (() => { const i = process.argv.indexOf('--slice');        return i !== -1 ? parseInt(process.argv[i + 1], 10) : 0; })();
const TOTAL_SLICES = (() => { const i = process.argv.indexOf('--total-slices'); return i !== -1 ? parseInt(process.argv[i + 1], 10) : 1; })();
const CONCURRENCY  = (() => { const i = process.argv.indexOf('--concurrency'); return i !== -1 ? parseInt(process.argv[i + 1], 10) : 10; })();
const SEARXNG      = (process.env.SEARXNG_URL ?? 'http://localhost:8080').replace(/\/$/, '');

const AGGREGATOR_DOMAINS = [
  'adzuna', 'indeed', 'linkedin', 'glassdoor', 'ziprecruiter', 'monster',
  'simplyhired', 'careerbuilder', 'jobcase', 'jooble', 'dice',
  'talent.com', 'snagajob', 'jobs2careers', 'jobright', 'lensa',
  'usajobs', 'builtin', 'salary.com', 'crunchbase', 'bloomberg',
  'wikipedia', 'reddit', 'facebook', 'twitter', 'youtube',
  'google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com',
  'tealhq.com', 'simplify.jobs', 'bebee.com', 'career.io',
  'higheredjobs.com', 'govconwire.com', 'zippia.com', 'jobscore.com',
];

function isAggregator(url: string): boolean {
  const lower = url.toLowerCase();
  return AGGREGATOR_DOMAINS.some(d => lower.includes(d));
}

function isSpecificJobPage(url: string): boolean {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    return segments.length >= 2;
  } catch { return false; }
}

function extractCity(location: string | null): string | null {
  if (!location) return null;
  const first = location.split(',')[0].trim();
  if (!first || /^(remote|united states|us|usa|anywhere)$/i.test(first)) return null;
  return first;
}

async function searchSearXNG(query: string): Promise<string | null> {
  const url = `${SEARXNG}/search?q=${encodeURIComponent(query)}&format=json&language=en-US`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) return null;
    const json = await r.json() as { results?: Array<{ url: string }> };
    for (const result of json.results ?? []) {
      if (result.url?.startsWith('http') && !isAggregator(result.url)) return result.url;
    }
    return null;
  } catch { return null; } finally { clearTimeout(timer); }
}

async function pMap<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  let i = 0;
  async function worker() {
    while (i < items.length) { await fn(items[i++]); }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

async function main() {
  const dbUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dbUrl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dbUrl, { max: Math.ceil(CONCURRENCY / 2), prepare: false });

  // Count total Adzuna jobs and compute this slice's range
  const [{ total }] = await sql<[{ total: number }]>`
    SELECT COUNT(*)::int AS total FROM job_postings WHERE source = 'Adzuna'
  `;
  const chunkSize = Math.ceil(total / TOTAL_SLICES);
  const offset    = SLICE * chunkSize;

  console.log(`Slice ${SLICE}/${TOTAL_SLICES} | offset=${offset} chunk=${chunkSize} | concurrency=${CONCURRENCY} | dry=${DRY_RUN}`);
  console.log(`SearXNG: ${SEARXNG}\n`);

  const rows = await sql<Array<{
    id: number; title: string; company: string; location: string | null;
  }>>`
    SELECT id, title, company, location
    FROM job_postings
    WHERE source = 'Adzuna'
    ORDER BY id
    LIMIT ${chunkSize} OFFSET ${offset}
  `;

  console.log(`Jobs in this slice: ${rows.length}\n`);

  let updated = 0, closed = 0;
  const startTime = Date.now();

  await pMap(rows, async (job) => {
    const city  = extractCity(job.location);
    const query = [job.title, job.company, city].filter(Boolean).join(' ');
    const url   = await searchSearXNG(query);

    if (url && isSpecificJobPage(url)) {
      updated++;
      if (!DRY_RUN) await sql`UPDATE job_postings SET external_url = ${url} WHERE id = ${job.id}`;
    } else {
      closed++;
      if (!DRY_RUN) await sql`UPDATE job_postings SET status = 'closed' WHERE id = ${job.id}`;
    }
  }, CONCURRENCY);

  await sql.end();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Slice ${SLICE} done in ${elapsed}s ===`);
  console.log(`Updated (specific page): ${updated}`);
  console.log(`Closed (expired):        ${closed}`);
  if (DRY_RUN) console.log('[DRY-RUN] No DB writes made.');
}

main().catch(err => { console.error(err); process.exit(1); });
