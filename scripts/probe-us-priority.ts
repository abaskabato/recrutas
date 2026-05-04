/**
 * Verify the US-priority sort:
 *   1. SQL classifier and JS mirror agree on 1,000 random rows
 *   2. The feed ORDER BY actually puts US rows first
 */
import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 2, prepare: false });

const NON_US = String.raw`\m(europe|european|emea|apac|latam|united kingdom|england|scotland|wales|germany|berlin|munich|frankfurt|hamburg|france|paris|lyon|netherlands|amsterdam|rotterdam|spain|madrid|barcelona|italy|milan|rome|portugal|lisbon|ireland|dublin|sweden|stockholm|norway|oslo|denmark|copenhagen|finland|helsinki|poland|warsaw|krakow|czech|prague|austria|vienna|switzerland|zurich|belgium|brussels|romania|bucharest|sofia|bulgaria|hungary|budapest|greece|athens|turkey|istanbul|ukraine|russia|moscow|israel|tel aviv|uae|dubai|abu dhabi|qatar|saudi|jordan|lebanon|cairo|egypt|south africa|nigeria|kenya|canada|toronto|vancouver|montreal|ottawa|mexico city|brazil|são paulo|sao paulo|argentina|buenos aires|chile|santiago|colombia|bogota|peru|lima|australia|sydney|melbourne|new zealand|auckland|india|bangalore|mumbai|hyderabad|delhi|pune|pakistan|karachi|bangladesh|china|beijing|shanghai|hong kong|taiwan|taipei|japan|tokyo|south korea|seoul|singapore|malaysia|kuala lumpur|indonesia|jakarta|thailand|bangkok|vietnam|ho chi minh|hanoi|philippines|manila)\M`;

const SQL_CASE = `CASE
  WHEN source = 'platform' THEN 0
  WHEN location ~* '${NON_US}' THEN 2
  WHEN location ~* '(\\m(usa|u\\.s\\.|united states)\\M|, ?[A-Z]{2}( |,|$))' THEN 0
  WHEN location IS NULL OR TRIM(location) = '' THEN 1
  WHEN LOWER(location) IN ('remote','remote, us','remote, usa','various','worldwide','global') THEN 1
  ELSE 1
END`;

function jsClassify(source: string | null, location: string | null): number {
  if ((source ?? '') === 'platform') return 0;
  const loc = (location ?? '').trim();
  if (!loc) return 1;
  const lower = loc.toLowerCase();
  const NON_US_RE = /\b(europe|european|emea|apac|latam|united kingdom|england|scotland|wales|germany|berlin|munich|frankfurt|hamburg|france|paris|lyon|netherlands|amsterdam|rotterdam|spain|madrid|barcelona|italy|milan|rome|portugal|lisbon|ireland|dublin|sweden|stockholm|norway|oslo|denmark|copenhagen|finland|helsinki|poland|warsaw|krakow|czech|prague|austria|vienna|switzerland|zurich|belgium|brussels|romania|bucharest|sofia|bulgaria|hungary|budapest|greece|athens|turkey|istanbul|ukraine|russia|moscow|israel|tel aviv|uae|dubai|abu dhabi|qatar|saudi|jordan|lebanon|cairo|egypt|south africa|nigeria|kenya|canada|toronto|vancouver|montreal|ottawa|mexico city|brazil|s[aã]o paulo|argentina|buenos aires|chile|santiago|colombia|bogota|peru|lima|australia|sydney|melbourne|new zealand|auckland|india|bangalore|mumbai|hyderabad|delhi|pune|pakistan|karachi|bangladesh|china|beijing|shanghai|hong kong|taiwan|taipei|japan|tokyo|south korea|seoul|singapore|malaysia|kuala lumpur|indonesia|jakarta|thailand|bangkok|vietnam|ho chi minh|hanoi|philippines|manila)\b/;
  if (NON_US_RE.test(lower)) return 2;
  if (/\b(usa|u\.s\.|united states)\b/.test(lower)) return 0;
  if (/, ?[A-Z]{2}( |,|$)/.test(loc)) return 0;
  if (['remote', 'remote, us', 'remote, usa', 'various', 'worldwide', 'global'].includes(lower)) return 1;
  return 1;
}

(async () => {
  // 1. Distribution of priorities in the active set
  const dist = await sql.unsafe(`
    SELECT (${SQL_CASE}) AS bucket, COUNT(*)::int AS n FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
    GROUP BY bucket ORDER BY bucket
  `) as Array<{ bucket: number; n: number }>;
  console.log('Active jobs by US priority bucket:');
  const labels: Record<number, string> = { 0: 'US (or platform)', 1: 'unknown', 2: 'non-US' };
  for (const r of dist) console.log(`  ${r.bucket} ${labels[r.bucket]?.padEnd(20)} ${r.n}`);

  // 2. JS vs SQL agreement on 1,000 random rows
  const rows = await sql.unsafe(`
    SELECT source, location, (${SQL_CASE}) AS sql_bucket
    FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY random() LIMIT 1000
  `) as Array<{ source: string; location: string | null; sql_bucket: number }>;
  let agree = 0, disagree = 0;
  const mismatches: Array<{ source: string; location: string | null; sql: number; js: number }> = [];
  for (const r of rows) {
    const js = jsClassify(r.source, r.location);
    if (js === r.sql_bucket) agree++;
    else { disagree++; if (mismatches.length < 15) mismatches.push({ source: r.source, location: r.location, sql: r.sql_bucket, js }); }
  }
  console.log(`\nSQL/JS agreement: ${agree}/${agree + disagree}`);
  if (mismatches.length) {
    console.log('Mismatches:');
    for (const m of mismatches) console.log(`  sql=${m.sql} js=${m.js}  source=${m.source}  loc="${m.location}"`);
  }

  // 3. Show the first 10 rows the feed would return — should all be bucket 0
  const top = await sql.unsafe(`
    SELECT location, (${SQL_CASE}) AS bucket FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY (${SQL_CASE}) ASC, created_at DESC
    LIMIT 10
  `);
  console.log('\nTop 10 by feed sort (should all be bucket 0):');
  for (const r of top as any[]) console.log(`  bucket=${r.bucket}  loc="${r.location}"`);

  await sql.end();
})();
