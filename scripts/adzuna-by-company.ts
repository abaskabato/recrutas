import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const dburl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!dburl) throw new Error('POSTGRES_URL not set');
  const sql = postgres(dburl, { max: 1, prepare: false });

  const companies = await sql<Array<{ company: string; count: number }>>`
    SELECT company, COUNT(*) as count
    FROM job_postings
    WHERE source = 'Adzuna' AND external_url LIKE '%adzuna%'
    GROUP BY company
    ORDER BY count DESC
    LIMIT 30
  `;

  console.log(`Top 30 companies with Adzuna redirects:\n`);
  let total = 0;
  companies.forEach(c => {
    total += Number(c.count);
    console.log(`${String(c.count).padStart(5)}  ${c.company.slice(0, 50)}`);
  });
  console.log(`\nTotal: ${total}`);

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });