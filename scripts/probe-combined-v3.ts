import 'dotenv/config';
import postgres from 'postgres';

/**
 * Combined v3: v2 + host-token sanity gate.
 *
 * After Clearbit returns a domain, verify the domain stem shares a token with
 * the cleaned company name. Rejects collisions like NV5→nvidia.com,
 * Tend→tendergreens.com, PACS→pacsun.com. Falls back to domain-guess if rejected.
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

function cleanCompany(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^\d{4,}\s+/, '');
  s = s.replace(/\s+d\/?b\/?a\s+.*$/i, '');
  s = s.replace(/\s+c\/o\s+.*$/i, '');
  s = s.replace(/\s+-\s+[^-]+$/, '');
  const firstComma = s.indexOf(',');
  if (firstComma >= 0) {
    const head = s.slice(0, firstComma).trim();
    const tail = s.slice(firstComma + 1).trim().toLowerCase().replace(/\./g, '');
    const tailFirst = tail.split(/[\s,]/)[0];
    if (SUFFIXES.includes(tailFirst) || tailFirst === 'the' || tailFirst === 'jr') {
      s = head;
    }
  }
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

function tokensFrom(name: string): string[] {
  return normalizeName(name).split(' ').filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

// Sanity gate: does the domain stem share a substring with any company token?
// We're generous with substring because domain stems are often concatenated
// ("lockheedmartin") or abbreviated ("gdit" for "General Dynamics Information Technology").
function hostSharesToken(domain: string, queryTokens: string[]): boolean {
  if (queryTokens.length === 0) return false;
  // strip TLD
  const stem = domain
    .replace(/\.(com|net|org|io|co|us|ai|app|google|tech|info|biz)$/i, '')
    .replace(/\.co\.uk$/i, '')
    .replace(/^www\./, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  // Full-token substring: "northropgrumman" contains "northrop" and "grumman"
  for (const t of queryTokens) {
    if (t.length >= 3 && stem.includes(t)) return true;
  }
  // Acronym check: stem matches first letters of multi-word query
  // e.g. "gdit" matches "General Dynamics Information Technology"
  if (queryTokens.length >= 2) {
    const acronym = queryTokens.map(w => w[0]).join('');
    if (acronym.length >= 3 && stem.startsWith(acronym)) return true;
    // Also accept "lmco" for "Lockheed Martin Corp-ish" — first letters but extended
    if (acronym.length >= 2 && stem.length <= acronym.length + 3 && stem.startsWith(acronym)) return true;
  }
  return false;
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

type ClearbitHit = { name: string; domain: string };
async function clearbitTop5(query: string): Promise<ClearbitHit[]> {
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: ctrl.signal });
    if (!r.ok) return [];
    const arr = await r.json() as ClearbitHit[];
    return (arr ?? []).filter(x => x.domain && !isAggregator(x.domain)).slice(0, 5);
  } catch { return []; } finally { clearTimeout(timer); }
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

function titleMatches(tokens: string[], title: string): boolean {
  if (!title) return false;
  const titleTokens = new Set(title.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean));
  let hits = 0;
  for (const t of tokens) if (titleTokens.has(t)) hits++;
  const size = tokens.length;
  if (size === 0) return false;
  if (size === 1) return hits === 1;
  if (size === 2) return hits === 2;
  return hits / size >= 0.67;
}

async function domainGuess(companyName: string): Promise<string | null> {
  const tokens = tokensFrom(companyName);
  if (tokens.length === 0) return null;
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

async function resolve(companyName: string): Promise<{ domain: string; source: string } | null> {
  const cleaned = cleanCompany(companyName);
  const tokens = tokensFrom(cleaned);
  const hits = await clearbitTop5(cleaned);
  // Accept first Clearbit result whose domain passes the sanity gate
  for (const h of hits) {
    if (hostSharesToken(h.domain, tokens)) return { domain: h.domain, source: 'clearbit' };
  }
  // Fallback: domain-guess (concat/hyphen/acronym + title validate)
  const g = await domainGuess(cleaned);
  if (g) return { domain: g, source: 'guess' };
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

  console.log(`Combined v3 (cleanCompany → Clearbit + sanity gate → domain-guess) on ${rows.length} random Adzuna cards\n`);

  let clearbitHits = 0, guessHits = 0, missing = 0;
  const rejectedByGate: string[] = [];
  const unresolved: string[] = [];
  const latencies: number[] = [];
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const job = rows[i];
    const cleaned = cleanCompany(job.company);
    const tokens = tokensFrom(cleaned);

    // Peek at raw clearbit top-5 to see what the gate rejected (for reporting only)
    const rawHits = await clearbitTop5(cleaned);
    const firstRaw = rawHits[0];
    const firstPasses = firstRaw ? hostSharesToken(firstRaw.domain, tokens) : true;

    const t = Date.now();
    const result = await resolve(job.company);
    const ms = Date.now() - t + 50; // approx (we already did one clearbit call above)
    latencies.push(ms);

    if (result) {
      if (result.source === 'clearbit') clearbitHits++;
      else guessHits++;

      if (firstRaw && !firstPasses && firstRaw.domain !== result.domain) {
        rejectedByGate.push(`  ${job.company.padEnd(40)} rejected "${firstRaw.domain}" → kept "${result.domain}"`);
      }
      console.log(`[${String(i+1).padStart(3)}] ✓ ${result.source.padEnd(8)} ${result.domain.padEnd(32)} ${job.company}  (${ms}ms)`);
    } else {
      missing++;
      unresolved.push(`${job.company}  (cleaned="${cleaned}")${firstRaw ? `  [gate rejected: ${firstRaw.domain}]` : ''}`);
      console.log(`[${String(i+1).padStart(3)}] ✗ -        ${''.padEnd(32)} ${job.company}  (${ms}ms)`);
    }

    await new Promise(r => setTimeout(r, 50));
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  console.log(`\n=== Summary ===`);
  console.log(`Total:         ${rows.length}`);
  console.log(`Clearbit:      ${clearbitHits}/${rows.length}`);
  console.log(`Domain-guess:  +${guessHits}`);
  console.log(`Combined:      ${clearbitHits + guessHits}/${rows.length} (${(((clearbitHits+guessHits)/rows.length)*100).toFixed(0)}%)`);
  console.log(`Gate rejections (false positives prevented): ${rejectedByGate.length}`);
  console.log(`Latency: avg=${avg}ms  p50=${p50}ms  p95=${p95}ms  total=${Date.now()-t0}ms`);

  console.log(`\n--- Gate rejections ---`);
  rejectedByGate.forEach(l => console.log(l));

  console.log(`\n--- Still unresolved (${unresolved.length}) ---`);
  unresolved.forEach(l => console.log(`  ${l}`));
}

main().catch(e => { console.error(e); process.exit(1); });
