import 'dotenv/config';
import postgres from 'postgres';

/**
 * Production candidate: Clearbit (company-only) → domain-guess fallback.
 *
 * Step 1: Clearbit autocomplete with just the company name. First non-aggregator
 *         result wins. Covers ~68% on random Adzuna sample.
 * Step 2: If Clearbit misses, run the domain-guess (strip suffix, concat/hyphen/
 *         acronym variants, fetch homepage, validate company tokens appear in <title>).
 *
 * Measure: combined hit rate + which source resolved each, latency distribution,
 * list of still-unresolved cards.
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
  'industries','enterprises','solutions','services','partners',
  'bank','center','systems','foundation','stores','development',
  'motors','technologies','consulting','associates',
];
const STOPWORDS = new Set(['and','or','the','a','an','of','for','with']);

function isAggregator(domain: string): boolean {
  const lower = domain.toLowerCase();
  return AGGREGATOR_DOMAINS.some(d => lower === d || lower.endsWith(`.${d}`) || lower.includes(d));
}

function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSuffixes(normalized: string): string {
  const words = normalized.split(' ').filter(w => w && !STOPWORDS.has(w));
  while (words.length > 1 && COMPANY_SUFFIXES.includes(words[words.length - 1])) {
    words.pop();
  }
  return words.join(' ');
}

function tokensFrom(name: string): Set<string> {
  return new Set(
    normalizeName(name).split(' ').filter(t => t.length >= 2 && !STOPWORDS.has(t))
  );
}

function candidateDomains(companyName: string): string[] {
  const stripped = stripSuffixes(normalizeName(companyName));
  const words = stripped.split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const concat = words.join('');
  const hyphen = words.join('-');
  const set = new Set<string>();
  set.add(concat);
  if (hyphen !== concat) set.add(hyphen);
  if (words.length >= 3) {
    const acronym = words.map(w => w[0]).join('');
    if (acronym.length >= 3 && acronym.length <= 8) set.add(acronym);
  }
  return Array.from(set).filter(d => d.length >= 3 && d.length <= 40);
}

async function clearbitFirst(companyName: string): Promise<string | null> {
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(companyName)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: ctrl.signal });
    if (!r.ok) return null;
    const arr = await r.json() as Array<{ name: string; domain: string }>;
    for (const x of arr ?? []) {
      if (x.domain && !isAggregator(x.domain)) return x.domain;
    }
    return null;
  } catch { return null; } finally { clearTimeout(timer); }
}

async function fetchHomepage(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; } finally { clearTimeout(timer); }
}

function extractTitle(html: string): string {
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const ogT = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  return [t?.[1], og?.[1], ogT?.[1]].filter(Boolean).join(' | ').toLowerCase();
}

function titleMatches(tokens: Set<string>, title: string): boolean {
  if (!title) return false;
  const titleTokens = new Set(title.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean));
  let hits = 0;
  for (const t of tokens) if (titleTokens.has(t)) hits++;
  const size = tokens.size;
  if (size === 0) return false;
  if (size === 1) return hits === 1;
  if (size === 2) return hits === 2;
  return hits / size >= 0.67;
}

async function domainGuess(companyName: string): Promise<string | null> {
  const tokens = tokensFrom(companyName);
  if (tokens.size === 0) return null;
  const cands = candidateDomains(companyName);
  for (const cand of cands) {
    for (const prefix of ['https://www.', 'https://']) {
      const url = `${prefix}${cand}.com`;
      const html = await fetchHomepage(url);
      if (!html) continue;
      const title = extractTitle(html);
      if (titleMatches(tokens, title)) return `${cand}.com`;
    }
  }
  return null;
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

  console.log(`Combined probe (Clearbit → domain-guess fallback): ${rows.length} random Adzuna cards\n`);

  let clearbitHits = 0, fallbackHits = 0, stillMissing = 0;
  const unresolved: string[] = [];
  const latencies: number[] = [];
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const job = rows[i];
    const t = Date.now();
    let source = '', domain: string | null = null;

    domain = await clearbitFirst(job.company);
    if (domain) { source = 'clearbit'; clearbitHits++; }
    else {
      domain = await domainGuess(job.company);
      if (domain) { source = 'guess'; fallbackHits++; }
      else { stillMissing++; unresolved.push(`${job.company}  (city="${job.location?.split(',')[0] ?? '-'}")`); }
    }

    const ms = Date.now() - t;
    latencies.push(ms);
    console.log(`[${String(i+1).padStart(3)}] ${domain ? '✓' : '✗'} ${(source || '-').padEnd(8)} ${(domain ?? '').padEnd(32)} ${job.company}  (${ms}ms)`);

    await new Promise(r => setTimeout(r, 50));
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  console.log(`\n=== Summary ===`);
  console.log(`Total:         ${rows.length}`);
  console.log(`Clearbit:      ${clearbitHits}/${rows.length} (${((clearbitHits/rows.length)*100).toFixed(0)}%)`);
  console.log(`Domain-guess:  +${fallbackHits} (${((fallbackHits/rows.length)*100).toFixed(0)}%)`);
  console.log(`Combined:      ${clearbitHits + fallbackHits}/${rows.length} (${(((clearbitHits+fallbackHits)/rows.length)*100).toFixed(0)}%)`);
  console.log(`Still missing: ${stillMissing}/${rows.length}`);
  console.log(`Latency (inc. fallback when triggered): avg=${avg}ms  p50=${p50}ms  p95=${p95}ms  total=${Date.now()-t0}ms`);
  console.log(`\n--- Still unresolved ---`);
  unresolved.forEach(l => console.log(`  ${l}`));
}

main().catch(e => { console.error(e); process.exit(1); });
