import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });
  const rows = await sql`SELECT "normalizedName", "detectedAts", "atsId", status FROM discovered_companies WHERE status = 'approved' AND "detectedAts" IS NOT NULL LIMIT 20`;
  await sql.end();
  console.log('Approved companies with ATS:', rows.length);
  rows.forEach(r => console.log(r.normalizedName, r.detectedAts, r.atsId));
}

main().catch(e => { console.error(e); process.exit(1); });