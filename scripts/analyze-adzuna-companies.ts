import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });

  console.log('=== Top 30 Adzuna companies in job_postings ===');
  const companies = await sql`
    SELECT company, COUNT(*) as count
    FROM job_postings
    WHERE source = 'Adzuna' AND company IS NOT NULL AND company != ''
    GROUP BY company
    ORDER BY count DESC
    LIMIT 30
  `;
  companies.forEach(r => console.log(`${r.count.toString().padStart(4)}  ${r.company}`));

  console.log('\n=== All approved companies with ATS ===');
  const approved = await sql`
    SELECT "normalizedName", "detectedAts", "atsId"
    FROM discovered_companies
    WHERE status = 'approved' AND "detectedAts" IS NOT NULL
  `;
  console.log(`Total: ${approved.length}`);
  approved.forEach(r => console.log(`${r.detectedAts.padEnd(10)} ${r.atsId.padEnd(20)} ${r.normalizedName}`));

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });