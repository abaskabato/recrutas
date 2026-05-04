import 'dotenv/config';
import postgres from 'postgres';
import { isUSLocation } from '../server/location-filter';

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 2, prepare: false });

(async () => {
  // Sample 2,000 active jobs and run isUSLocation in JS — count what slips through
  const rows = await sql`
    SELECT id, title, company, location, external_url
    FROM job_postings
    WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY random() LIMIT 2000
  `;

  let usPass = 0, nonUsCaught = 0;
  const suspects: Array<{ location: string | null; reason: string; url: string }> = [];

  for (const r of rows as any[]) {
    if (isUSLocation(r.location)) {
      usPass++;
      // Heuristic: if location contains "://" or is very long or has non-ASCII or contains words like "office", "various", suspect
      const loc = (r.location ?? '').toLowerCase();
      const looksNonUs =
        loc === '' ||
        loc === 'various' ||
        loc === 'worldwide' ||
        loc === 'global' ||
        loc === 'office' ||
        /[^\x00-\x7f]/.test(loc) ||
        /\b(spain|italy|france|germany|uk|england|argentina|brazil|chile|peru|mexico|colombia|nigeria|kenya|egypt|south africa|thailand|vietnam|philippines|indonesia|malaysia|singapore|hong kong|taiwan|korea|japan|china|india|pakistan|bangladesh|turkey|greece|romania|bulgaria|ukraine|russia|israel|uae|dubai|abu dhabi|qatar|saudi|jordan|lebanon)\b/i.test(loc);
      if (looksNonUs && suspects.length < 30) {
        suspects.push({ location: r.location, reason: 'isUS=true but looks non-US', url: r.external_url });
      }
    } else {
      nonUsCaught++;
    }
  }

  console.log(`Sampled ${rows.length} active jobs.`);
  console.log(`isUSLocation passed:    ${usPass}`);
  console.log(`isUSLocation rejected:  ${nonUsCaught}`);

  // Bucket the empty-location count
  const emptyLoc = (rows as any[]).filter(r => !r.location || r.location.trim() === '').length;
  console.log(`Empty/null location rows in sample: ${emptyLoc}  (these all return true from isUSLocation)`);

  console.log(`\nSuspect rows (isUSLocation=true but location looks non-US):`);
  for (const s of suspects) console.log(`  loc="${s.location}"  url=${s.url}`);

  // Direct SQL check: how many rows in entire DB have empty/null location?
  const total = await sql`
    SELECT COUNT(*)::int AS n FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
      AND (location IS NULL OR TRIM(location) = '')
  `;
  console.log(`\nTotal active jobs with empty/null location (passes isUSLocation): ${total[0].n}`);

  // Search for obvious non-US country mentions in the entire active set
  const nonUsCountries = await sql`
    SELECT location, COUNT(*)::int AS n FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
      AND location ~* '\\m(spain|italy|france|germany|england|argentina|brazil|chile|mexico|colombia|nigeria|kenya|egypt|thailand|vietnam|philippines|indonesia|malaysia|singapore|hong kong|taiwan|korea|japan|china|india|pakistan|bangladesh|turkey|greece|romania|bulgaria|ukraine|russia|israel|uae|dubai|abu dhabi|qatar|saudi|jordan|lebanon|peru)\\M'
    GROUP BY location
    ORDER BY n DESC
    LIMIT 25
  `;
  console.log(`\nActive locations mentioning non-US country names (top 25):`);
  for (const r of nonUsCountries as any[]) console.log(`  ${String(r.n).padStart(5)}  ${r.location}`);

  await sql.end();
})();
