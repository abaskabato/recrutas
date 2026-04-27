import 'dotenv/config';
import postgres from 'postgres';
import { resolveAdzunaLink } from '../server/lib/adzuna-link-resolver';

async function main() {
  const dburl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dburl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dburl, { max: 1, prepare: false });

  const jobs = await sql<Array<{ id: number; title: string; company: string; external_url: string }>>`
    SELECT id, title, company, external_url
    FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
    ORDER BY RANDOM()
    LIMIT 30
  `;
  await sql.end();

  let ats = 0, hp = 0, fb = 0;
  const t0 = Date.now();

  for (const job of jobs) {
    const res = await resolveAdzunaLink({
      title: job.title,
      company: job.company,
      location: undefined,
      fallbackUrl: job.external_url,
    });

    if (res.atsType) ats++;
    else if (res.resolved) hp++;
    else fb++;
  }

  console.log(`30 jobs in ${Date.now() - t0}ms`);
  console.log(`ATS: ${ats}, HP: ${hp}, Fallback: ${fb}`);
  console.log(`Swapped: ${ats + hp}/30 (${Math.round((ats + hp) / 30 * 100)}%)`);
}

main().catch(e => { console.error(e); process.exit(1); });