import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL!, { max: 2, prepare: false });

const [stats] = await sql<[{ total: number; resolved: number; redirecting: number }]>`
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE external_url NOT LIKE '%adzuna%')::int AS resolved,
    COUNT(*) FILTER (WHERE external_url LIKE '%adzuna%')::int AS redirecting
  FROM job_postings
  WHERE source = 'Adzuna'
`;
console.log(`Total Adzuna:       ${stats.total}`);
console.log(`Resolved:           ${stats.resolved} (${(stats.resolved / stats.total * 100).toFixed(1)}%)`);
console.log(`Still redirecting:  ${stats.redirecting} (${(stats.redirecting / stats.total * 100).toFixed(1)}%)`);

await sql.end();
