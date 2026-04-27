import 'dotenv/config';
import postgres from 'postgres';
import { resolveAdzunaLink } from '../server/lib/adzuna-link-resolver';

async function main() {
  const dburl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dburl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dburl, { max: 1, prepare: false });

  // Just count and sample
  const jobs = await sql<Array<{ id: number; title: string; company: string; external_url: string }>>`
    SELECT id, title, company, external_url
    FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
    LIMIT 20
  `;

  console.log(`Sample of Adzuna URLs to migrate:\n`);
  for (const job of jobs) {
    const res = await resolveAdzunaLink({
      title: job.title,
      company: job.company,
      location: undefined,
      fallbackUrl: job.external_url,
    });
    console.log(`${job.company}`);
    console.log(`  OLD: ${job.external_url.slice(0, 60)}`);
    console.log(`  NEW: ${res.url.slice(0, 60)}`);
    console.log(`  -> ${res.resolved ? 'CHANGED' : 'SAME'}`);
    console.log();
  }

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });