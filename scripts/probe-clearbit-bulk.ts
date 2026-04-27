import 'dotenv/config';
import postgres from 'postgres';

/**
 * Bulk Clearbit probe: 100 random Adzuna cards, naive first-result.
 *
 * Per card, record: got-result, token-match, domain, company, city.
 * Measure: hit rate, obvious false-positive rate, latency distribution,
 * unresolved list (so we can see what Clearbit doesn't know about).
 */

const AGGREGATOR_DOMAINS = [
  'adzuna','indeed','linkedin','glassdoor','ziprecruiter','monster',
  'simplyhired','careerbuilder','jobcase','jooble','dice','google.com',
  'bing.com','duckduckgo.com','yahoo.com','wikipedia','bloomberg',
  'craigslist','facebook.com','twitter.com','x.com','instagram.com',
  'youtube.com','reddit.com','talent.com','snagajob','jobs2careers',
  'jobright','lensa','usajobs','builtin','salary.com','payscale',
  'trustpilot','bbb.org','yelp.com','greatschools','crunchbase',
  'mapquest','maps.google','yellowpages','greenhouse.io','lever.co',
  'myworkday','workday.com','smartrecruiters','ashbyhq.com','jobvite',
  'icims.com','successfactors','taleo.net','bamboohr','recruitee.com',
  'workable.com','breezy.hr','veterans.jobs','.jobs',
];

const COMPANY_SUFFIXES = new Set([
  'inc','llc','corp','corporation','company','co','ltd','limited',
  'group','careers','usa','na','plc','holdings','international',
  'industries','enterprises','solutions','services','partners',
  'bank','center','systems','foundation','stores','development',
  'motors','technologies','consulting','associates','the','and',
]);

function isAggregator(domain: string): boolean {
  const lower = domain.toLowerCase();
  return AGGREGATOR_DOMAINS.some(d => lower === d || lower.endsWith(`.${d}`) || lower.includes(d));
}

function companyTokens(name: string): string[] {
  return name.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !COMPANY_SUFFIXES.has(t));
}

function hostTokenMatch(domain: string, tokens: string[]): boolean {
  if (!tokens.length) return false;
  const h = domain.replace(/\.(com|net|org|io|co|us|ai|app|google|ru|uk|de|fr)$/i, '')
                  .replace(/\.co\.uk$/i, '')
                  .replace(/[^a-z0-9]/gi, '')
                  .toLowerCase();
  return tokens.some(t => h.includes(t));
}

async function clearbitFirst(companyName: string, city: string | null): Promise<{ name: string; domain: string } | null> {
  const query = city ? `${companyName}, ${city}` : companyName;
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: ctrl.signal });
    if (!r.ok) return null;
    const arr = await r.json() as Array<{ name: string; domain: string }>;
    for (const x of arr ?? []) {
      if (x.domain && !isAggregator(x.domain)) return { name: x.name, domain: x.domain };
    }
    return null;
  } catch { return null; } finally { clearTimeout(timer); }
}

async function main() {
  const dburl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dburl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dburl, { max: 1, prepare: false });

  const rows = await sql<Array<{ company: string; location: string | null }>>`
    SELECT company, location
    FROM job_postings
    WHERE source = 'Adzuna' AND company IS NOT NULL AND company != ''
    ORDER BY RANDOM()
    LIMIT 100
  `;
  await sql.end();

  console.log(`Bulk Clearbit probe: ${rows.length} random Adzuna cards\n`);

  let resolved = 0, tokenMatched = 0, noResult = 0;
  const unresolved: string[] = [];
  const nonTokenMatch: string[] = [];
  const latencies: number[] = [];
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const job = rows[i];
    const tokens = companyTokens(job.company);
    const t = Date.now();
    const city = (() => {
      if (!job.location) return null;
      const first = job.location.split(',')[0].trim();
      if (!first || /^(remote|united states|us|usa|anywhere)$/i.test(first)) return null;
      return first;
    })();
    const result = await clearbitFirst(job.company, city);
    const ms = Date.now() - t;
    latencies.push(ms);

    if (result) {
      resolved++;
      const match = hostTokenMatch(result.domain, tokens);
      if (match) {
        tokenMatched++;
      } else {
        nonTokenMatch.push(`${job.company} → ${result.domain} (clearbit name: "${result.name}")`);
      }
    } else {
      noResult++;
      unresolved.push(`${job.company}  (city="${job.location?.split(',')[0] ?? '-'}")`);
    }
    // Minimal pacing — Clearbit autocomplete has no published limit but be polite.
    await new Promise(r => setTimeout(r, 50));
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  console.log(`\n=== Summary ===`);
  console.log(`Total: ${rows.length}`);
  console.log(`Got any result:          ${resolved}/${rows.length} (${((resolved/rows.length)*100).toFixed(0)}%)`);
  console.log(`Of those, token-match:   ${tokenMatched}/${resolved} (${resolved ? ((tokenMatched/resolved)*100).toFixed(0) : 0}%)`);
  console.log(`No result at all:        ${noResult}/${rows.length}`);
  console.log(`Latency: avg=${avg}ms  p50=${p50}ms  p95=${p95}ms  total=${Date.now()-t0}ms`);

  console.log(`\n--- Non-token-match (inspect for false positives) ---`);
  nonTokenMatch.forEach(l => console.log(`  ${l}`));

  console.log(`\n--- Unresolved (Clearbit doesn't know them) ---`);
  unresolved.forEach(l => console.log(`  ${l}`));
}

main().catch(e => { console.error(e); process.exit(1); });
