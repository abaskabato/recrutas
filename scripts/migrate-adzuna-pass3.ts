/**
 * Pass 3: resolve remaining Adzuna redirect URLs via Clearbit with progressive
 * word truncation. For each company, tries the full cleaned name, then drops
 * the last word repeatedly (down to 2 words) until Clearbit returns a result
 * that passes token-match validation.
 *
 * Usage:
 *   npx tsx scripts/migrate-adzuna-pass3.ts [--dry-run] [--limit N]
 */
import 'dotenv/config';
import postgres from 'postgres';

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.indexOf('--limit');
const MAX_COMPANIES = LIMIT_ARG !== -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : Infinity;

const TIMEOUT = 8_000;
const CONCURRENCY = 8;

// Words to strip before truncation
const STRIP_SUFFIX_RE = /\b(llc|inc|ltd|corp|corporation|co|plc|lp|llp|dba|bank|group|holdings|health|healthcare|services|solutions|systems|technologies|consulting|associates|partners|enterprises|industries|stores|foundation|development|motors|center|centres?|university|college|school|institute|hospital|clinic|medical|staffing|agency|management|trust|fund|capital|financial|insurance|real estate|realty|property|properties|logistics|transport|transportation|construction|engineering|manufacturing|retail|wholesale|distributors?|supply|chain|network|communications?|media|digital|online|global|international|national|regional|local|american|united states|usa|north america)\.?$/gi;

const STOPWORDS = new Set([
  'the', 'and', 'for', 'from', 'with', 'its', 'this', 'that', 'are', 'was',
  'inc', 'llc', 'ltd', 'corp', 'co', 'plc', 'the', 'of', 'in', 'at', 'to',
]);

function cleanCompanyName(company: string): string {
  return company
    .replace(/\bc\/o\b.*/i, '')
    .replace(/\b(llc|inc|ltd|corp|co|plc|lp|llp|dba)\.?\b/gi, '')
    .replace(/\s*[-–|]\s*.+$/, '')
    .replace(/[.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

function tokenMatch(query: string, result: { name: string; domain: string }): boolean {
  const tokens = significantTokens(query);
  if (!tokens.length) return false;
  const domainBase = result.domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const rName = result.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  // At least one significant token must appear in domain base or result name
  return tokens.some(t => domainBase.includes(t) || rName.includes(t));
}

async function clearbitQuery(query: string): Promise<Array<{ name: string; domain: string }>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`,
      { headers: { Accept: 'application/json' }, signal: ctrl.signal }
    );
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; } finally { clearTimeout(timer); }
}

async function resolveCompany(company: string): Promise<{ url: string; query: string } | null> {
  const cleaned = cleanCompanyName(company);
  const words = cleaned.split(/\s+/).filter(Boolean);

  // Try from full length down to 2 words
  for (let len = words.length; len >= 2; len--) {
    const query = words.slice(0, len).join(' ');
    const results = await clearbitQuery(query);
    if (!results.length) continue;
    for (const r of results) {
      if (r.domain && tokenMatch(query, r)) {
        return { url: `https://${r.domain}`, query };
      }
    }
  }
  return null;
}

// Process N tasks concurrently
async function pMap<T, R>(
  items: T[],
  fn: (item: T, i: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function main() {
  const dbUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dbUrl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dbUrl, { max: 5, prepare: false });

  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);
  console.log('Fetching distinct unresolved companies...');

  // Group by company to avoid redundant Clearbit calls
  const rows = await sql<Array<{ company: string; count: number }>>`
    SELECT company, COUNT(*)::int AS count
    FROM job_postings
    WHERE source = 'Adzuna'
      AND external_url LIKE '%adzuna%'
      AND company IS NOT NULL
      AND company != ''
    GROUP BY company
    ORDER BY count DESC
    LIMIT ${MAX_COMPANIES === Infinity ? 999999 : MAX_COMPANIES}
  `;
  console.log(`Found ${rows.length} distinct companies (${rows.reduce((s, r) => s + r.count, 0)} jobs)\n`);

  let resolved = 0, skipped = 0;
  const start = Date.now();

  const CHUNK = 100;
  for (let offset = 0; offset < rows.length; offset += CHUNK) {
    const chunk = rows.slice(offset, offset + CHUNK);

    const resolvedChunk = await pMap(chunk, async ({ company, count }) => {
      const hit = await resolveCompany(company);
      await new Promise(r => setTimeout(r, 150)); // Clearbit rate-limit headroom
      return { company, count, hit };
    }, CONCURRENCY);

    for (const { company, count, hit } of resolvedChunk) {
      if (!hit) { skipped++; continue; }
      resolved++;
      console.log(`✓ [${hit.query}] → ${hit.url}  (${count} job${count > 1 ? 's' : ''})`);
      if (!DRY_RUN) {
        await sql`
          UPDATE job_postings
          SET external_url = ${hit.url}
          WHERE source = 'Adzuna'
            AND external_url LIKE '%adzuna%'
            AND company = ${company}
        `;
      }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    process.stdout.write(
      `  Progress: ${offset + chunk.length}/${rows.length} companies | resolved=${resolved} skipped=${skipped} | ${elapsed}s elapsed\r`
    );
  }

  await sql.end();

  console.log('\n\n=== Summary ===');
  console.log(`Companies resolved: ${resolved}`);
  console.log(`Companies skipped:  ${skipped}`);
  const totalJobs = rows.filter((_, i) => {
    // approximate — we don't track which ones resolved
    return true;
  }).reduce((s, r) => s + r.count, 0);
  console.log(`(estimate: ${resolved} companies × avg jobs ≈ update ~${Math.round(totalJobs * resolved / rows.length)} job rows)`);
  if (DRY_RUN) console.log('\n[DRY-RUN] No DB updates made.');
}

main().catch(err => { console.error(err); process.exit(1); });
