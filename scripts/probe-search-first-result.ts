import 'dotenv/config';
import postgres from 'postgres';

// Extract a usable city from Adzuna's "location.display_name" string.
// Examples:
//   "San Diego, San Diego County" → "San Diego"
//   "Grand Forks, ND"             → "Grand Forks"
//   "Remote, United States"       → null (not useful)
function extractCity(location: string | null): string | null {
  if (!location) return null;
  const first = location.split(',')[0].trim();
  if (!first) return null;
  if (/^(remote|united states|us|usa)$/i.test(first)) return null;
  return first;
}

// Aggregator / job-board domains we should never treat as a company homepage
const AGGREGATOR_DOMAINS = [
  'adzuna', 'indeed', 'linkedin', 'glassdoor', 'ziprecruiter', 'monster',
  'simplyhired', 'careerbuilder', 'jobcase', 'jooble', 'dice', 'google.com',
  'bing.com', 'duckduckgo.com', 'yahoo.com', 'wikipedia.org', 'bloomberg',
  'craigslist', 'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com',
  'reddit.com', 'talent.com', 'snagajob', 'jobs2careers', 'jobs.jobcase',
  'jobright', 'lensa', 'beebe.com', 'glassdoor.com', 'usajobs',
];

function looksLikeAggregator(url: string): boolean {
  const lower = url.toLowerCase();
  return AGGREGATOR_DOMAINS.some(d => lower.includes(`://${d}`) || lower.includes(`.${d}`));
}

// Extract first organic result URL from DuckDuckGo HTML
async function searchFirstResult(query: string): Promise<string | null> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
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
    if (!r.ok) {
      console.log(`     DDG HTTP ${r.status}`);
      return null;
    }
    const html = await r.text();
    
    if (html.length < 1000) {
      console.log(`     DDG short: ${html.slice(0,200)}`);
      return null;
    }

    if (!html.includes('uddg=')) {
      console.log(`     DDG no uddg, len=${html.length}`);
      return null;
    }

    // DuckDuckGo HTML wraps each result URL in an /l/?uddg=<encoded-url> redirect
    const redirectMatches = Array.from(html.matchAll(/\/l\/\?(?:kh=-1&)?uddg=([^&"]+)/gi));
    for (const m of redirectMatches) {
      try {
        const decoded = decodeURIComponent(m[1]);
        if (!looksLikeAggregator(decoded)) return decoded;
      } catch { /* keep trying */ }
    }

    return null;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.log(`     DDG timeout`);
    } else {
      console.log(`     DDG error: ${e.message}`);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function getHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
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

  console.log(`Testing ${rows.length} random Adzuna jobs\n`);

  let withCity = 0;
  let gotResult = 0;
  let plausibleHomepage = 0;
  const samples: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const job = rows[i];
    const city = extractCity(job.location);
    if (city) withCity++;

    const query = city ? `${job.company}, ${city}` : job.company;
    const firstUrl = await searchFirstResult(query);
    const host = firstUrl ? getHost(firstUrl) : '-';

    // Plausible company homepage heuristic: top-level path, not obviously aggregator
    const plausible = firstUrl != null && !looksLikeAggregator(firstUrl);
    if (firstUrl) gotResult++;
    if (plausible) plausibleHomepage++;

    console.log(`[${String(i + 1).padStart(2)}] ${plausible ? '✓' : '✗'}  ${job.company}  (${city ?? 'no-city'})`);
    console.log(`     query: "${query}"`);
    console.log(`     →     ${firstUrl ? firstUrl.slice(0, 110) : '(no result)'}`);
    if (plausible && samples.length < 5) samples.push(`${job.company} → ${host}`);

    await new Promise(r => setTimeout(r, 1200)); // polite pacing; DDG rate-limits aggressively
  }

  console.log(`\n=== Summary ===`);
  console.log(`With usable city: ${withCity}/${rows.length}`);
  console.log(`Got any result:   ${gotResult}/${rows.length}`);
  console.log(`Plausible homepage (non-aggregator): ${plausibleHomepage}/${rows.length} (${((plausibleHomepage / rows.length) * 100).toFixed(0)}%)`);
}

main().catch(err => { console.error(err); process.exit(1); });
