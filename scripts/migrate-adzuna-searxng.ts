/**
 * Resolve remaining Adzuna job URLs by searching "<title> <company> <city>"
 * via a local SearXNG instance (JSON API).
 *
 * Usage:
 *   npx tsx scripts/migrate-adzuna-searxng.ts [--dry-run] [--limit N] [--after-id N]
 *
 * SearXNG must be running at SEARXNG_URL (default: http://localhost:8080)
 */
import 'dotenv/config';
import postgres from 'postgres';

const DRY_RUN  = process.argv.includes('--dry-run');
const LIMIT    = (() => { const i = process.argv.indexOf('--limit');    return i !== -1 ? parseInt(process.argv[i + 1], 10) : 0; })();
const AFTER_ID = (() => { const i = process.argv.indexOf('--after-id'); return i !== -1 ? parseInt(process.argv[i + 1], 10) : 0; })();
const SEARXNG  = (process.env.SEARXNG_URL ?? 'http://localhost:8080').replace(/\/$/, '');

const DELAY_MS = parseInt(process.env.SEARXNG_DELAY_MS ?? '800', 10);

const AGGREGATOR_DOMAINS = [
  'adzuna', 'indeed', 'linkedin', 'glassdoor', 'ziprecruiter', 'monster',
  'simplyhired', 'careerbuilder', 'jobcase', 'jooble', 'dice',
  'talent.com', 'snagajob', 'jobs2careers', 'jobright', 'lensa',
  'usajobs', 'builtin', 'salary.com', 'crunchbase', 'bloomberg',
  'wikipedia', 'reddit', 'facebook', 'twitter', 'youtube',
  'google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com',
];

function isAggregator(url: string): boolean {
  const lower = url.toLowerCase();
  return AGGREGATOR_DOMAINS.some(d => lower.includes(d));
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
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!r.ok) {
      console.error(`  SearXNG HTTP ${r.status} for: ${query.slice(0, 60)}`);
      return null;
    }
    const json = await r.json() as { results?: Array<{ url: string }> };
    for (const result of json.results ?? []) {
      if (result.url?.startsWith('http') && !isAggregator(result.url)) {
        return result.url;
      }
    }
    return null;
  } catch (e: any) {
    console.error(`  SearXNG ${e.name === 'AbortError' ? 'timeout' : `error: ${e.message}`} for: ${query.slice(0, 60)}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const dbUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dbUrl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dbUrl, { max: 3, prepare: false });

  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`SearXNG: ${SEARXNG}`);
  console.log(`After ID: ${AFTER_ID}, Limit: ${LIMIT || 'all'}\n`);

  const totalResult = await sql<[{ count: number }]>`
    SELECT COUNT(*)::int AS count FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%' AND id > ${AFTER_ID}
  `;
  const total = totalResult[0].count;
  console.log(`Jobs to process: ${total}\n`);

  let processed = 0, resolved = 0, skipped = 0;
  let lastId = AFTER_ID;
  const batchSize = 50;

  while (true) {
    const rows = await sql<Array<{
      id: number; title: string; company: string; location: string | null;
    }>>`
      SELECT id, title, company, location
      FROM job_postings
      WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%' AND id > ${lastId}
      ORDER BY id
      LIMIT ${batchSize}
    `;
    if (!rows.length) break;

    for (const job of rows) {
      lastId = job.id;
      const city = extractCity(job.location);
      const query = [job.title, job.company, city].filter(Boolean).join(' ');

      const url = await searchSearXNG(query);

      processed++;
      if (url) {
        resolved++;
        console.log(`✓ [${job.id}] ${job.title.slice(0, 50)} | ${job.company.slice(0, 30)}`);
        console.log(`    → ${url.slice(0, 100)}`);
        if (!DRY_RUN) {
          await sql`
            UPDATE job_postings SET external_url = ${url}
            WHERE id = ${job.id}
          `;
        }
      } else {
        skipped++;
        if (skipped % 50 === 0) {
          console.log(`  [${job.id}] no result — ${job.company.slice(0, 40)}`);
        }
      }

      const pct = ((processed / total) * 100).toFixed(1);
      process.stdout.write(`  Progress: ${processed}/${total} (${pct}%) | resolved=${resolved} skipped=${skipped} | last_id=${lastId}\r`);

      await new Promise(r => setTimeout(r, DELAY_MS));

      if (LIMIT && processed >= LIMIT) break;
    }

    if (LIMIT && processed >= LIMIT) break;
  }

  await sql.end();

  console.log('\n\n=== Summary ===');
  console.log(`Processed: ${processed}`);
  console.log(`Resolved:  ${resolved} (${((resolved / processed) * 100).toFixed(1)}%)`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Last ID:   ${lastId}`);
  if (DRY_RUN) console.log('\n[DRY-RUN] No DB writes made.');
}

main().catch(err => { console.error(err); process.exit(1); });
