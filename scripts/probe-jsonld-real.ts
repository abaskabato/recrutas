import 'dotenv/config';
import postgres from 'postgres';

async function fetchJsonLdJobs(url: string) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RecrutasJobAggregator/1.0', 'Accept': 'text/html' },
      signal: ctrl.signal,
      redirect: 'follow',
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return { ok: false, status: res.status, blocks: 0, jobs: 0, sample: null as any };
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
    return {
      ok: true,
      status: res.status,
      blocks,
      jobs: postings.length,
      sample: postings[0] ? { title: postings[0].title, url: postings[0].url || postings[0].sameAs } : null,
    };
  } catch (err: any) {
    return { ok: false, status: 0, blocks: 0, jobs: 0, sample: null, err: err.message };
  }
}

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 3, prepare: false });

  // Pull real careers URLs from Adzuna-resolved small/non-tech jobs.
  // Truncate to host + first 2 path segments in JS to avoid SQL backref escaping.
  const raw = await sql`
    SELECT DISTINCT company, external_url
    FROM job_postings
    WHERE source = 'Adzuna'
      AND external_url IS NOT NULL
      AND external_url NOT ILIKE '%adzuna%'
      AND external_url NOT ILIKE '%greenhouse.io%'
      AND external_url NOT ILIKE '%lever.co%'
      AND external_url NOT ILIKE '%ashbyhq.com%'
      AND external_url NOT ILIKE '%myworkdayjobs.com%'
      AND external_url NOT ILIKE '%recruitee.com%'
      AND external_url NOT ILIKE '%workable.com%'
      AND created_at >= NOW() - INTERVAL '7 days'
    ORDER BY company
    LIMIT 30
  `;
  const rows = raw.map((r: any) => {
    let sample_url = r.external_url as string;
    try {
      const u = new URL(sample_url);
      const segs = u.pathname.split('/').filter(Boolean).slice(0, 2);
      sample_url = `${u.protocol}//${u.host}${segs.length ? '/' + segs.join('/') : ''}`;
    } catch { /* keep as-is */ }
    return { company: r.company as string, sample_url };
  });

  console.log(`\nTesting ${rows.length} real Adzuna-resolved careers URLs from small/non-tech jobs:\n`);

  let totalJobs = 0;
  let withJsonLd = 0;
  for (const row of rows) {
    // Try the URL as-is first; if it's just a domain, try /careers too
    const candidates = [row.sample_url];
    if (!/\/careers|\/jobs/.test(row.sample_url)) {
      candidates.push(row.sample_url.replace(/\/$/, '') + '/careers');
    }

    let best: any = { ok: false, status: 0, blocks: 0, jobs: 0, sample: null };
    let bestUrl = candidates[0];
    for (const url of candidates) {
      const r = await fetchJsonLdJobs(url);
      const better = r.jobs > best.jobs || (!best.ok && r.ok) || (best.jobs === 0 && r.blocks > best.blocks);
      if (better) { best = r; bestUrl = url; }
      if (r.jobs > 0) break;
    }

    const flag = best.jobs > 0 ? '✓' : (best.ok ? '·' : '✗');
    const note = best.jobs > 0
      ? `${best.jobs} jobs | sample: "${best.sample?.title || '?'}"`
      : best.ok ? `0 jobs (${best.blocks} JSON-LD blocks)` : `HTTP ${best.status}`;
    console.log(`${flag} [${row.company.padEnd(35)}] ${bestUrl.padEnd(55)} ${note}`);

    if (best.jobs > 0) { totalJobs += best.jobs; withJsonLd++; }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Companies tested: ${rows.length}`);
  console.log(`Companies with JobPosting JSON-LD: ${withJsonLd} (${((withJsonLd / rows.length) * 100).toFixed(0)}%)`);
  console.log(`Total jobs extracted: ${totalJobs}`);

  await sql.end();
}

main().catch(err => { console.error(err); process.exit(1); });
