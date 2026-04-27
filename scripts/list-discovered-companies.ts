import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const c = postgres(process.env.POSTGRES_URL_NON_POOLING!, { max: 1, prepare: false });
  const rows = await c`
    SELECT name, "normalizedName", "detectedAts", "atsId"
    FROM discovered_companies
    WHERE status = 'approved' AND "detectedAts" IS NOT NULL
    ORDER BY name
  `;
  rows.forEach((r: any) => console.log(`  ${r.normalizedName.padEnd(30)} ${(r.detectedAts ?? '').padEnd(12)} ${r.atsId}`));
  console.log('\ntotal:', rows.length);
  await c.end();
}
main();
