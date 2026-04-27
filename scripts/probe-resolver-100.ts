import 'dotenv/config';
import postgres from 'postgres';
import { resolveAdzunaLink } from '../server/lib/adzuna-link-resolver';

async function main() {
  const dburl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dburl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dburl, { max: 1, prepare: false });

  const rows = await sql<Array<{ title: string; company: string; location: string | null; external_url: string | null }>>`
    SELECT title, company, location, external_url
    FROM job_postings
    WHERE source = 'Adzuna' AND company IS NOT NULL AND company != ''
    ORDER BY RANDOM()
    LIMIT 100
  `;
  await sql.end();

  console.log(`Resolver integration probe: ${rows.length} random Adzuna cards\n`);

  let ats = 0, hp = 0, adz = 0;
  const latencies: number[] = [];
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const t = Date.now();
    const res = await resolveAdzunaLink({
      title: r.title,
      company: r.company,
      location: r.location ?? undefined,
      fallbackUrl: r.external_url ?? '',
    });
    const ms = Date.now() - t;
    latencies.push(ms);

    if (res.resolved && res.atsType) { ats++; }
    else if (res.resolved) { hp++; }
    else { adz++; }

    if (i < 20 || (i+1) % 20 === 0) {
      const host = (() => {
        try { return new URL(res.url).host; } catch { return res.url.slice(0, 30); }
      })();
      console.log(`[${String(i+1).padStart(3)}] ${(res.atsType || 'HP ').padStart(10)} ${host.padEnd(35)} ${r.company.slice(0,30)}`);
    }
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  console.log(`\n=== Summary (100 jobs) ===`);
  console.log(`ATS deep-link:  ${ats}/100 (${ats}%)`);
  console.log(`Homepage:      ${hp}/100 (${hp}%)`);
  console.log(`Adzuna fb:    ${adz}/100 (${adz}%)`);
  console.log(`Swapped:      ${ats+hp}/100 (${ats+hp}%)`);
  console.log(`Latency: avg=${avg}ms  p50=${p50}ms  p95=${p95}ms  total=${Date.now()-t0}ms`);
}

main().catch(e => { console.error(e); process.exit(1); });