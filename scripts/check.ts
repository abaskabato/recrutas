import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { max: 1, prepare: false });

async function main() {
  const count = await sql`SELECT COUNT(*) as cnt FROM job_postings WHERE status = 'active' AND external_url IS NOT NULL`;
  console.log(`Total active jobs with external_url: ${count[0].cnt}`);
}
main().finally(() => sql.end());