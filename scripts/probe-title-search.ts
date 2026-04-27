/**
 * Probe: does searching "<title> <company> <city>" on Bing / DuckDuckGo
 * return the actual job posting page as the first non-aggregator result?
 *
 * Usage: npx tsx scripts/probe-title-search.ts [--limit N]
 */
import 'dotenv/config';
import postgres from 'postgres';

const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i !== -1 ? parseInt(process.argv[i + 1], 10) : 25;
})();

const AGGREGATOR_DOMAINS = [
  'adzuna', 'indeed', 'linkedin', 'glassdoor', 'ziprecruiter', 'monster',
  'simplyhired', 'careerbuilder', 'jobcase', 'jooble', 'dice',
  'talent.com', 'snagajob', 'jobs2careers', 'jobright', 'lensa',
  'usajobs', 'builtin', 'salary.com', 'crunchbase', 'bloomberg',
  'wikipedia', 'reddit.com', 'facebook.com', 'twitter.com', 'youtube.com',
  'google.com', 'bing.com', 'duckduckgo.com',
  'greenhouse.io', 'lever.co', 'myworkday', 'workday.com', 'smartrecruiters',
  'ashbyhq.com', 'jobvite', 'icims.com', 'successfactors', 'taleo.net',
];

function looksLikeAggregator(url: string): boolean {
  const lower = url.toLowerCase();
  return AGGREGATOR_DOMAINS.some(d => lower.includes(`://${d}`) || lower.includes(`.${d}`));
}

function extractCity(location: string | null): string | null {
  if (!location) return null;
  const first = location.split(',')[0].trim();
  if (!first || /^(remote|united states|us|usa|anywhere)$/i.test(first)) return null;
  return first;
}

function getHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function looksLikeJobPage(url: string): boolean {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    return segments.length >= 2;
  } catch { return false; }
}

async function fetchWithTimeout(url: string, ms: number, headers: Record<string, string>): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers, redirect: 'follow', signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; } finally { clearTimeout(timer); }
}

async function searchBing(query: string): Promise<string | null> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10`;
  const html = await fetchWithTimeout(url, 9000, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  });
  if (!html) return null;
  const matches = Array.from(html.matchAll(/<li class="b_algo"[^>]*>[\s\S]*?<h2[^>]*>\s*<a\s+href="([^"]+)"/gi));
  for (const m of matches) {
    const href = m[1];
    if (href.startsWith('http') && !looksLikeAggregator(href)) return href;
  }
  return null;
}

async function searchDDG(query: string): Promise<string | null> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://duckduckgo.com/',
        'Cache-Control': 'no-cache',
      },
      signal: ctrl.signal,
    });
    if (!r.ok) { console.log(`  DDG HTTP ${r.status}`); return null; }
    const html = await r.text();
    if (!html.includes('uddg=')) { console.log(`  DDG: no results (len=${html.length})`); return null; }
    const matches = Array.from(html.matchAll(/\/l\/\?(?:kh=-1&)?uddg=([^&"]+)/gi));
    for (const m of matches) {
      try {
        const decoded = decodeURIComponent(m[1]);
        if (!looksLikeAggregator(decoded)) return decoded;
      } catch { /* skip */ }
    }
    return null;
  } catch (e: any) {
    console.log(`  DDG ${e.name === 'AbortError' ? 'timeout' : `error: ${e.message}`}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function tag(url: string | null): string {
  if (!url) return '✗ none     ';
  if (looksLikeJobPage(url)) return '✓ job-page ';
  return '~ homepage ';
}

async function main() {
  const dbUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dbUrl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dbUrl, { max: 1, prepare: false });

  const rows = await sql<Array<{ title: string; company: string; location: string | null }>>`
    SELECT title, company, location
    FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
    ORDER BY RANDOM()
    LIMIT ${LIMIT}
  `;
  await sql.end();

  console.log(`Testing ${rows.length} random unresolved Adzuna jobs`);
  console.log('Query format: "<title> <company> <city>"\n');

  type Counts = { any: number; jobPage: number; homepage: number };
  const bing: Counts = { any: 0, jobPage: 0, homepage: 0 };
  const ddg: Counts = { any: 0, jobPage: 0, homepage: 0 };

  function tally(c: Counts, url: string | null) {
    if (!url) return;
    c.any++;
    if (looksLikeJobPage(url)) c.jobPage++; else c.homepage++;
  }

  for (let i = 0; i < rows.length; i++) {
    const job = rows[i];
    const city = extractCity(job.location);
    const query = [job.title, job.company, city].filter(Boolean).join(' ');

    console.log(`[${String(i + 1).padStart(2)}] ${job.title.slice(0, 60)}  |  ${job.company}  |  ${city ?? '(no city)'}`);
    console.log(`     query: ${query.slice(0, 100)}`);

    const [bingUrl, ddgUrl] = await Promise.all([searchBing(query), searchDDG(query)]);
    tally(bing, bingUrl);
    tally(ddg, ddgUrl);

    console.log(`     bing ${tag(bingUrl)}${bingUrl ? bingUrl.slice(0, 100) : ''}`);
    console.log(`     ddg  ${tag(ddgUrl)}${ddgUrl ? ddgUrl.slice(0, 100) : ''}`);
    console.log();

    await new Promise(r => setTimeout(r, 1500));
  }

  const n = rows.length;
  console.log('=== Summary ===');
  console.log(`         got-any  job-page  homepage  no-result`);
  console.log(`bing     ${fmt(bing.any, n)}   ${fmt(bing.jobPage, n)}    ${fmt(bing.homepage, n)}    ${fmt(n - bing.any, n)}`);
  console.log(`ddg      ${fmt(ddg.any, n)}   ${fmt(ddg.jobPage, n)}    ${fmt(ddg.homepage, n)}    ${fmt(n - ddg.any, n)}`);
  console.log('\nLegend: ✓ job-page = path≥2 segments (specific page), ~ homepage = root only, ✗ no non-aggregator result');
}

function fmt(a: number, b: number) {
  return `${String(a).padStart(2)}/${b} (${((a / b) * 100).toFixed(0)}%)`.padEnd(10);
}

main().catch(err => { console.error(err); process.exit(1); });
