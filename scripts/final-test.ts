import 'dotenv/config';
import postgres from 'postgres';
import { resolveAdzunaLink } from '../server/lib/adzuna-link-resolver';

async function test() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });
  const jobs = await sql`SELECT title, company, location FROM job_postings WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%' AND location IS NOT NULL ORDER BY RANDOM() LIMIT 50`;
  await sql.end();

  let ats = 0, hp = 0, fb = 0;
  for (const j of jobs) {
    const r = await resolveAdzunaLink({ title: j.title, company: j.company, location: j.location, fallbackUrl: 'https://adzuna.com' });
    if (r.url.includes('gh_jid=') || r.url.includes('lever') || r.url.includes('ashby')) ats++;
    else if (!r.url.includes('adzuna')) hp++;
    else fb++;
  }
  console.log(`ATS: ${ats}, HP: ${hp}, FB: ${fb} | Swapped: ${ats+hp}/50 (${(ats+hp)*2}%)`);
}

test().catch(console.error);