import 'dotenv/config';
import postgres from 'postgres';

/**
 * Refined Clearbit resolver: fetch top-5 suggestions and disambiguate via:
 *   1) homepage mentions the Adzuna city (strong signal)
 *   2) US TLD preference (.com/.us/.org/.net) over foreign (.ru/.co.uk/etc)
 *   3) company-token match on domain (drop obvious junk like .jobs/.recruiter domains)
 *   4) first result as fallback
 *
 * Goal: beat naive first-result on false positives (Diaconia.ru, taylorcommunications.co.uk)
 * without hurting the 80% baseline.
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

const PREFERRED_TLDS = ['com','us','org','net','ai','io','co'];

function isAggregator(domain: string): boolean {
  const lower = domain.toLowerCase();
  return AGGREGATOR_DOMAINS.some(d => lower === d || lower.endsWith(`.${d}`) || lower.includes(d));
}

function tldOf(domain: string): string {
  const parts = domain.toLowerCase().split('.');
  // handle .co.uk style
  if (parts.length >= 3 && parts[parts.length - 2] === 'co') return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  return parts[parts.length - 1];
}

function tldScore(domain: string): number {
  const tld = tldOf(domain);
  if (PREFERRED_TLDS.includes(tld)) return PREFERRED_TLDS.length - PREFERRED_TLDS.indexOf(tld);
  return 0;
}

function extractCity(location: string | null): string | null {
  if (!location) return null;
  const first = location.split(',')[0].trim();
  if (!first) return null;
  if (/^(remote|united states|us|usa|anywhere)$/i.test(first)) return null;
  return first.toLowerCase();
}

async function fetchClearbitTop5(companyName: string): Promise<Array<{ name: string; domain: string }>> {
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(companyName)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: ctrl.signal });
    if (!r.ok) return [];
    const arr = await r.json() as Array<{ name: string; domain: string }>;
    return (arr ?? []).filter(x => x.domain && !isAggregator(x.domain)).slice(0, 5);
  } catch { return []; } finally { clearTimeout(timer); }
}

async function fetchHomepageText(domain: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(`https://${domain}`, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const html = await r.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
               .replace(/<style[\s\S]*?<\/style>/gi, ' ')
               .replace(/<[^>]+>/g, ' ')
               .replace(/\s+/g, ' ')
               .toLowerCase();
  } catch { return null; } finally { clearTimeout(timer); }
}

function cityMentioned(city: string | null, text: string | null): boolean {
  if (!city || !text) return false;
  const re = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return re.test(text);
}

type Candidate = { name: string; domain: string; citySeen: boolean; tldScore: number };

async function resolveRefined(companyName: string, city: string | null): Promise<Candidate | null> {
  const top5 = await fetchClearbitTop5(companyName);
  if (top5.length === 0) return null;

  // Fast path: only 1 result → return it (no homepage fetch needed).
  if (top5.length === 1) {
    return { name: top5[0].name, domain: top5[0].domain, citySeen: false, tldScore: tldScore(top5[0].domain) };
  }

  // Fetch homepage text in parallel (only if city is usable — otherwise skip the cost).
  const scored: Candidate[] = [];
  if (city) {
    const texts = await Promise.all(top5.map(c => fetchHomepageText(c.domain)));
    for (let i = 0; i < top5.length; i++) {
      scored.push({
        name: top5[i].name,
        domain: top5[i].domain,
        citySeen: cityMentioned(city, texts[i]),
        tldScore: tldScore(top5[i].domain),
      });
    }
  } else {
    for (const c of top5) {
      scored.push({ name: c.name, domain: c.domain, citySeen: false, tldScore: tldScore(c.domain) });
    }
  }

  // Sort: citySeen desc, tldScore desc, original order (stable).
  const stable = scored.map((s, i) => ({ ...s, idx: i }));
  stable.sort((a, b) => {
    if (a.citySeen !== b.citySeen) return a.citySeen ? -1 : 1;
    if (a.tldScore !== b.tldScore) return b.tldScore - a.tldScore;
    return a.idx - b.idx;
  });
  return stable[0];
}

async function main() {
  const dburl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dburl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dburl, { max: 1, prepare: false });

  const rows = await sql<Array<{ company: string; location: string | null }>>`
    SELECT company, location
    FROM job_postings
    WHERE source = 'Adzuna' AND company IS NOT NULL AND company != ''
    ORDER BY id
    LIMIT 25
  `;
  await sql.end();

  console.log(`Refined Clearbit: top-5 + city/TLD disambiguation on ${rows.length} Adzuna jobs\n`);

  let resolved = 0, cityConfirmed = 0;
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const job = rows[i];
    const city = extractCity(job.location);
    const t = Date.now();
    const result = await resolveRefined(job.company, city);
    const ms = Date.now() - t;
    if (result) {
      resolved++;
      if (result.citySeen) cityConfirmed++;
      const mark = result.citySeen ? '[city✓]' : '       ';
      console.log(`[${String(i+1).padStart(2)}] ✓ ${mark} ${job.company.padEnd(38)} → ${result.domain.padEnd(32)} (${ms}ms, tld=${tldOf(result.domain)}, city="${city ?? '-'}")`);
    } else {
      console.log(`[${String(i+1).padStart(2)}] ✗         ${job.company.padEnd(38)} (${ms}ms, city="${city ?? '-'}")`);
    }
  }

  console.log(`\nResolved ${resolved}/${rows.length} (${((resolved/rows.length)*100).toFixed(0)}%) in ${Date.now() - t0}ms`);
  console.log(`  of which city-confirmed: ${cityConfirmed}/${resolved}`);
}

main().catch(e => { console.error(e); process.exit(1); });
