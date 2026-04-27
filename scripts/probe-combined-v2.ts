import 'dotenv/config';
import postgres from 'postgres';

/**
 * Combined v2: Clearbit (with pre-query suffix strip) → domain-guess fallback.
 *
 * Pre-processing before Clearbit:
 *   - strip leading ZIP codes / numeric prefixes
 *   - strip ", Inc"/"LLC"/"Corp"/etc suffixes
 *   - strip " d/b/a" segments and trailing " - <city>" franchise tags
 *   - strip trailing " Careers" / " Jobs"
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

const SUFFIXES = [
  'inc','inc.','llc','corp','corp.','corporation','company','co','co.',
  'ltd','ltd.','limited','plc','holdings','careers','jobs',
];

const COMPANY_SUFFIX_TOKENS = [
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

// Clean a raw Adzuna company string into a Clearbit-friendly query.
function cleanCompany(raw: string): string {
  let s = raw.trim();

  // 1. Strip leading numeric/ZIP prefix like "01007 Heidelberg Materials"
  s = s.replace(/^\d{4,}\s+/, '');

  // 2. Strip " d/b/a ..." and everything after
  s = s.replace(/\s+d\/?b\/?a\s+.*$/i, '');

  // 3. Strip " c/o ..." (agency-to-client markers)
  s = s.replace(/\s+c\/o\s+.*$/i, '');

  // 4. Strip trailing " - <franchise city>" or " - <anything>"
  s = s.replace(/\s+-\s+[^-]+$/, '');

  // 5. Take pre-comma portion if postfix is clearly a suffix/hq marker
  //    "Computer Merchant, Ltd., The" → "Computer Merchant"
  //    "Vuori, Inc"                   → "Vuori"
  //    but keep "Baylor Scott & White Health" etc untouched (no offending comma)
  const firstComma = s.indexOf(',');
  if (firstComma >= 0) {
    const head = s.slice(0, firstComma).trim();
    const tail = s.slice(firstComma + 1).trim().toLowerCase().replace(/\./g, '');
    const tailFirst = tail.split(/[\s,]/)[0];
    if (SUFFIXES.includes(tailFirst) || tailFirst === 'the' || tailFirst === 'jr') {
      s = head;
    }
  }

  // 6. Collapse whitespace & drop trailing suffix tokens
  s = s.replace(/\s+/g, ' ').trim();
  const words = s.split(' ');
  while (words.length > 1) {
    const last = words[words.length - 1].toLowerCase().replace(/\./g, '');
    if (SUFFIXES.includes(last)) words.pop();
    else break;
  }
  return words.join(' ').trim();
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokensFrom(name: string): Set<string> {
  return new Set(normalizeName(name).split(' ').filter(t => t.length >= 2 && !STOPWORDS.has(t)));
}

function stripSuffixTokens(normalized: string): string {
  const words = normalized.split(' ').filter(w => w && !STOPWORDS.has(w));
  while (words.length > 1 && COMPANY_SUFFIX_TOKENS.includes(words[words.length - 1])) {
    words.pop();
  }
  return words.join(' ');
}

function candidateDomains(companyName: string): string[] {
  const stripped = stripSuffixTokens(normalizeName(companyName));
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

async function clearbitFirst(query: string): Promise<string | null> {
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`;
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

  console.log(`Combined v2 (cleanCompany → Clearbit → domain-guess) on ${rows.length} random Adzuna cards\n`);

  let clearbitHits = 0, fallbackHits = 0;
  const unresolved: string[] = [];
  const cleanedSamples: string[] = [];
  const latencies: number[] = [];
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const job = rows[i];
    const cleaned = cleanCompany(job.company);
    if (cleaned !== job.company && cleanedSamples.length < 15) {
      cleanedSamples.push(`"${job.company}" → "${cleaned}"`);
    }

    const t = Date.now();
    let source = '', domain: string | null = null;
    domain = await clearbitFirst(cleaned);
    if (domain) { source = 'clearbit'; clearbitHits++; }
    else {
      domain = await domainGuess(cleaned);
      if (domain) { source = 'guess'; fallbackHits++; }
      else unresolved.push(`${job.company} (cleaned="${cleaned}")`);
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
  console.log(`Latency: avg=${avg}ms  p50=${p50}ms  p95=${p95}ms  total=${Date.now()-t0}ms`);

  console.log(`\n--- Sample cleanings ---`);
  cleanedSamples.forEach(l => console.log(`  ${l}`));

  console.log(`\n--- Still unresolved (${unresolved.length}) ---`);
  unresolved.forEach(l => console.log(`  ${l}`));
}

main().catch(e => { console.error(e); process.exit(1); });
