import 'dotenv/config';
import postgres from 'postgres';
import { resolveAdzunaLink } from '../server/lib/adzuna-link-resolver';

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });
  const jobs = await sql`SELECT title, company, location FROM job_postings WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%' AND location IS NOT NULL ORDER BY RANDOM() LIMIT 15`;
  await sql.end();

  console.log('Sample generated links:\n');
  for (const j of jobs) {
    const r = await resolveAdzunaLink({ title: j.title, company: j.company, location: j.location, fallbackUrl: 'https://adzuna.com' });

    let type = 'Adzuna';
    if (r.url.includes('gh_jid=') || r.url.includes('lever') || r.url.includes('ashby')) type = 'ATS';
    else if (r.url.includes('/careers?q=')) type = 'Career Search';
    else if (r.url.includes('adzuna')) type = 'Fallback';

    console.log(`${type.padEnd(12)} ${j.company.slice(0, 18).padEnd(18)} ${j.title.slice(0, 20)}`);
    console.log(`  → ${r.url.slice(0, 70)}`);
    console.log();
  }
}

main().catch(console.error);