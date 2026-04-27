import 'dotenv/config';
import postgres from 'postgres';
import { resolveAdzunaLink } from '../server/lib/adzuna-link-resolver';

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });

  const jobs = await sql`
    SELECT title, company, location, external_url
    FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
    ORDER BY RANDOM()
    LIMIT 20
  `;
  await sql.end();

  console.log('Testing 20 random Adzuna jobs:\n');
  let ats = 0, hp = 0, fb = 0;

  for (const j of jobs) {
    const r = await resolveAdzunaLink({
      title: j.title,
      company: j.company,
      location: j.location,
      fallbackUrl: j.external_url,
    });

    if (r.atsType) ats++;
    else if (r.resolved) hp++;
    else fb++;

    console.log(`${j.company.slice(0, 25).padEnd(25)} | ${j.title.slice(0, 25)}`);
    console.log(`  → ${r.url.slice(0, 70)}`);
  }

  console.log(`\nATS: ${ats}, HP: ${hp}, FB: ${fb}`);
  console.log(`Swapped: ${ats+hp}/20 (${Math.round((ats+hp)/20*100)}%)`);
}

main().catch(e => { console.error(e); process.exit(1); });