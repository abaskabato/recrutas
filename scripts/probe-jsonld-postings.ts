import 'dotenv/config';
import postgres from 'postgres';

async function fetchAndCheck(url: string) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecrutasJobAggregator/1.0)', 'Accept': 'text/html' },
      signal: ctrl.signal,
      redirect: 'follow',
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return { ok: false, status: res.status, blocks: 0, jobPostings: 0, sample: null as any };
    const html = await res.text();

    let blocks = 0;
    const postings: any[] = [];
    for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      blocks++;
      try {
        const data = JSON.parse(m[1].trim());
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const t = item?.['@type'];
          if (t === 'JobPosting' || (Array.isArray(t) && t.includes('JobPosting'))) postings.push(item);
        }
      } catch {}
    }
    return { ok: true, status: res.status, blocks, jobPostings: postings.length, sample: postings[0] || null };
  } catch (err: any) {
    return { ok: false, status: 0, blocks: 0, jobPostings: 0, sample: null, err: err.message };
  }
}

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 3, prepare: false });

  // Pull individual posting URLs (deep links, not landing pages) from Adzuna-resolved jobs.
  // Exclude known-ATS domains since those scrape via API anyway.
  // Look for URLs that LOOK like actual job postings — path contains /job, /jobs/,
  // /opportunity, /opening, /position, /vacancy, /career-detail, or a numeric job id
  const rows = await sql`
    SELECT company, external_url, source
    FROM job_postings
    WHERE external_url IS NOT NULL
      AND external_url NOT ILIKE '%adzuna%'
      AND external_url NOT ILIKE '%jooble%'
      AND external_url NOT ILIKE '%indeed.com%'
      AND external_url NOT ILIKE '%jsearch%'
      AND external_url NOT ILIKE '%remoteok%'
      AND external_url NOT ILIKE '%greenhouse.io%'
      AND external_url NOT ILIKE '%lever.co%'
      AND external_url NOT ILIKE '%ashbyhq.com%'
      AND external_url NOT ILIKE '%myworkdayjobs.com%'
      AND external_url NOT ILIKE '%themuse.com%'
      AND (
        external_url ~* '/job[s]?/[0-9]'
        OR external_url ~* '/job-detail'
        OR external_url ~* '/opportunity/'
        OR external_url ~* '/opening/'
        OR external_url ~* '/position'
        OR external_url ~* '/vacancy'
        OR external_url ~* '/Jobs/Details/[0-9]'
      )
      AND created_at >= NOW() - INTERVAL '30 days'
    ORDER BY id DESC
    LIMIT 30
  `;
  console.log(`Got ${rows.length} rows`);

  console.log(`\nTesting ${rows.length} real Adzuna-resolved POSTING URLs:\n`);

  let withJobPosting = 0;
  let withAnyJsonLd = 0;
  let httpFail = 0;
  for (const row of rows) {
    const r = await fetchAndCheck(row.external_url as string);
    const flag = r.jobPostings > 0 ? '✓' : (r.ok ? (r.blocks > 0 ? '·' : '∅') : '✗');
    const note = r.jobPostings > 0
      ? `${r.jobPostings} JobPosting | "${r.sample?.title || '?'}"`
      : r.ok ? `0 JobPosting (${r.blocks} JSON-LD blocks)` : `HTTP ${r.status}`;
    const shortUrl = (row.external_url as string).slice(0, 75) + ((row.external_url as string).length > 75 ? '…' : '');
    console.log(`${flag} [${(row.company as string).slice(0, 28).padEnd(28)}] ${shortUrl.padEnd(80)} ${note}`);

    if (r.jobPostings > 0) withJobPosting++;
    if (r.blocks > 0) withAnyJsonLd++;
    if (!r.ok) httpFail++;
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Posting URLs tested: ${rows.length}`);
  console.log(`With JobPosting JSON-LD: ${withJobPosting} (${((withJobPosting / rows.length) * 100).toFixed(0)}%)`);
  console.log(`With any JSON-LD: ${withAnyJsonLd}`);
  console.log(`HTTP failures: ${httpFail}`);

  await sql.end();
}

main().catch(err => { console.error(err); process.exit(1); });
