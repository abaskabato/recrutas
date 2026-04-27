import 'dotenv/config';
import postgres from 'postgres';

/**
 * Domain guess + homepage validate:
 *   1. Derive candidate domains from company name (strip suffixes, concat + hyphenate)
 *   2. GET https://www.<candidate>.com (follow redirects, 5s timeout)
 *   3. Extract <title> and <meta og:site_name>
 *   4. Accept if the company name tokens overlap with the page title
 */

const COMPANY_SUFFIXES = [
  'inc', 'llc', 'corp', 'corporation', 'company', 'co', 'ltd', 'limited',
  'group', 'careers', 'usa', 'na', 'plc', 'holdings', 'international',
  'industries', 'enterprises', 'solutions', 'services', 'partners',
  'bank', 'center', 'systems', 'foundation', 'stores', 'development',
  'motors', 'technologies', 'consulting', 'associates',
];
const STOPWORDS = new Set(['and', 'or', 'the', 'a', 'an', 'of', 'for', 'with']);

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
  // Use PRE-suffix-strip tokens for validation, so "Spartan Solutions" requires
  // both "spartan" AND "solutions" to appear in the homepage title — filtering
  // out single-word collisions (e.g. spartan.com = Spartan Race).
  return new Set(
    normalizeName(name).split(' ')
      .filter(t => t.length >= 2 && !STOPWORDS.has(t))
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
  // Acronym variant (e.g., "United Services Automobile Association" → "usaa")
  if (words.length >= 3) {
    const acronym = words.map(w => w[0]).join('');
    if (acronym.length >= 3 && acronym.length <= 8) set.add(acronym);
  }
  return Array.from(set).filter(d => d.length >= 3 && d.length <= 40);
}

async function fetchHomepage(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractTitle(html: string): string {
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  return [t?.[1], og?.[1], ogTitle?.[1]].filter(Boolean).join(' | ').toLowerCase();
}

// Strip HTML tags + collapse whitespace to get visible text for city scan.
function extractVisibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Adzuna "location.display_name" → usable city, or null.
// "San Diego, San Diego County" → "San Diego"
// "Remote, United States" → null
function extractCity(location: string | null | undefined): string | null {
  if (!location) return null;
  const first = location.split(',')[0].trim();
  if (!first) return null;
  if (/^(remote|united states|us|usa|anywhere)$/i.test(first)) return null;
  return first.toLowerCase();
}

function titleMatches(companyTokens: Set<string>, title: string): { match: boolean; score: number } {
  if (!title) return { match: false, score: 0 };
  const titleTokens = new Set(title.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean));
  let hits = 0;
  for (const t of companyTokens) if (titleTokens.has(t)) hits++;
  const size = companyTokens.size;
  if (size === 0) return { match: false, score: 0 };
  const score = hits / size;
  // Require stricter match for short company names (1 token = exact, 2 tokens = both)
  if (size === 1) return { match: hits === 1, score };
  if (size === 2) return { match: hits === 2, score };
  return { match: score >= 0.67, score };
}

// Does the candidate homepage mention the job's city? If yes, that's a strong
// signal we found the right company (not a name-collision with a different firm).
function cityMentioned(city: string | null, text: string): boolean {
  if (!city) return false;
  // Word-boundary match so "york" doesn't hit "New York" and "york" doesn't match inside "yorkshire".
  const re = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return re.test(text);
}

async function resolveViaDomainGuess(
  companyName: string,
  locationRaw: string | null | undefined,
): Promise<{ domain: string; title: string; score: number; citySeen: boolean } | null> {
  const tokens = tokensFrom(companyName);
  if (tokens.size === 0) return null;
  const city = extractCity(locationRaw);
  const candidates = candidateDomains(companyName);

  // Prefer a candidate that matches on name AND mentions the city. Fall back to a
  // name-only match if nothing better turns up (some companies don't list every office).
  let fallback: { domain: string; title: string; score: number; citySeen: boolean } | null = null;

  for (const cand of candidates) {
    for (const prefix of ['https://www.', 'https://']) {
      const url = `${prefix}${cand}.com`;
      const html = await fetchHomepage(url);
      if (!html) continue;
      const title = extractTitle(html);
      const { match, score } = titleMatches(tokens, title);
      if (!match) continue;

      const text = extractVisibleText(html);
      const citySeen = cityMentioned(city, text);
      const result = { domain: `${cand}.com`, title: title.slice(0, 80), score, citySeen };

      // Strong match: name hits AND city appears on the page.
      if (citySeen) return result;

      // Name-only match: keep as fallback. Multi-token names are specific enough to trust
      // without city confirmation; single-token collisions we'll reject unless city confirms.
      if (!fallback && tokens.size >= 2) fallback = result;
    }
  }
  return fallback;
}

async function main() {
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL not set');
  const sql = postgres(url, { max: 1, prepare: false });

  const rows = await sql<Array<{ title: string; company: string; location: string | null }>>`
    SELECT title, company, location
    FROM job_postings
    WHERE source = 'Adzuna'
    ORDER BY RANDOM()
    LIMIT 25
  `;
  await sql.end();

  let resolved = 0;
  let resolvedWithCity = 0;
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const job = rows[i];
    const result = await resolveViaDomainGuess(job.company, job.location);
    if (result) {
      resolved++;
      if (result.citySeen) resolvedWithCity++;
      const cityMark = result.citySeen ? '[city✓]' : '[city✗]';
      console.log(`[${String(i + 1).padStart(2)}] ✓ ${cityMark} ${job.company.padEnd(40)} → ${result.domain}  (score=${result.score.toFixed(2)}, title="${result.title}", loc="${job.location ?? ''}")`);
    } else {
      console.log(`[${String(i + 1).padStart(2)}] ✗ ${job.company.padEnd(40)}  (loc="${job.location ?? ''}")`);
    }
  }

  console.log(`\nResolved ${resolved}/${rows.length} (${((resolved / rows.length) * 100).toFixed(0)}%) in ${Date.now() - t0}ms`);
  console.log(`  of which city-confirmed: ${resolvedWithCity}/${resolved}`);
}

main().catch(err => { console.error(err); process.exit(1); });
