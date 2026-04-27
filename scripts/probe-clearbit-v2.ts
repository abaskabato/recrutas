import 'dotenv/config';
import postgres from 'postgres';

/**
 * Clearbit v2: two wins on top of naive.
 *   (a) Strip company suffixes before query — "Lockheed Martin Corp" → "Lockheed Martin".
 *   (b) Among top-5 results, prefer the one whose `name` field equals the
 *       stripped query (case-insensitive, suffix-insensitive). Falls back
 *       to first result if no exact match.
 *
 * Same 100-card sample (ORDER BY RANDOM, but seed via redoing the SELECT — so
 * the "random" sample this run won't be the same 100 as the previous probe).
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

const COMPANY_SUFFIXES = [
  'inc','llc','corp','corporation','company','co','ltd','limited',
  'group','careers','usa','na','plc','holdings','international',
  'industries','enterprises','services','partners',
];

function isAggregator(domain: string): boolean {
  const lower = domain.toLowerCase();
  return AGGREGATOR_DOMAINS.some(d => lower === d || lower.endsWith(`.${d}`) || lower.includes(d));
}

// Strip "inc", "llc", "corp" etc from a company name; collapse commas and noise.
// "Lockheed Martin Corporation" → "Lockheed Martin"
// "Vuori, Inc" → "Vuori"
// "Advantage Sales & Marketing LLC dba Advantage Solutions" → "Advantage Sales & Marketing" (take pre-"dba")
function stripSuffix(name: string): string {
  let s = name;
  // Take everything before "dba" / "d/b/a" if present
  s = s.replace(/\s+d\/?b\/?a\s+.*/i, '').trim();
  // Remove trailing commas + suffix tokens
  s = s.replace(/[,]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = s.split(' ');
  while (words.length > 1) {
    const last = words[words.length - 1].toLowerCase().replace(/\./g, '');
    if (COMPANY_SUFFIXES.includes(last)) {
      words.pop();
    } else {
      break;
    }
  }
  return words.join(' ').trim();
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function clearbitTop5(query: string): Promise<Array<{ name: string; domain: string }>> {
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: ctrl.signal });
    if (!r.ok) return [];
    const arr = await r.json() as Array<{ name: string; domain: string }>;
    return (arr ?? []).filter(x => x.domain && !isAggregator(x.domain)).slice(0, 5);
  } catch { return []; } finally { clearTimeout(timer); }
}

async function resolveV2(companyName: string): Promise<{ name: string; domain: string } | null> {
  const stripped = stripSuffix(companyName);
  const query = stripped || companyName;
  const results = await clearbitTop5(query);
  if (results.length === 0) return null;

  // Prefer exact-normalized name match
  const target = norm(query);
  const exact = results.find(r => norm(r.name) === target);
  if (exact) return exact;

  // Prefer prefix match (e.g. "Google" matches "Google" first, not "Google Chrome Enterprise")
  const prefix = results.find(r => norm(r.name).startsWith(target));
  if (prefix) return prefix;

  return results[0];
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

  console.log(`Clearbit v2 (suffix-strip + exact-name preference): ${rows.length} random Adzuna cards\n`);

  let resolved = 0, exactMatched = 0;
  const unresolved: string[] = [];
  const suspiciousMatch: string[] = [];
  const latencies: number[] = [];
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const job = rows[i];
    const stripped = stripSuffix(job.company);
    const t = Date.now();
    const result = await resolveV2(job.company);
    const ms = Date.now() - t;
    latencies.push(ms);

    if (result) {
      resolved++;
      const isExact = norm(result.name) === norm(stripped);
      if (isExact) exactMatched++;
      else suspiciousMatch.push(`${job.company}  (stripped="${stripped}")  →  ${result.domain}  (clearbit="${result.name}")`);
    } else {
      unresolved.push(`${job.company}  (stripped="${stripped}")`);
    }
    await new Promise(r => setTimeout(r, 50));
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];

  console.log(`\n=== Summary ===`);
  console.log(`Resolved (got any result):  ${resolved}/${rows.length} (${((resolved/rows.length)*100).toFixed(0)}%)`);
  console.log(`Exact name match:           ${exactMatched}/${resolved} (${resolved ? ((exactMatched/resolved)*100).toFixed(0) : 0}%)`);
  console.log(`Latency: p50=${p50}ms  p95=${p95}ms  total=${Date.now()-t0}ms`);

  console.log(`\n--- Suspicious / not-exact-name (${suspiciousMatch.length}) ---`);
  suspiciousMatch.forEach(l => console.log(`  ${l}`));

  console.log(`\n--- Still unresolved (${unresolved.length}) ---`);
  unresolved.forEach(l => console.log(`  ${l}`));
}

main().catch(e => { console.error(e); process.exit(1); });
