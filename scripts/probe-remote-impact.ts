/**
 * Did the recent commits regress remote-job visibility?
 *  1. URL filter: how many remote-source jobs (RemoteOK / WeWorkRemotely / workType=remote) got dropped?
 *  2. US sort: where do plain "Remote" location jobs land in the new bucket scheme?
 */
import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 2, prepare: false });

const REQ = `(
  external_url IS NOT NULL
  AND NOT (external_url ~ '^https?://[^/]+/?$')
  AND (
    external_url ~ '[/?][^/?#]*\\d{4,}'
    OR external_url ~* '(gh_jid|jobid|requisition|posting|/job/|/jobs/[a-z0-9_-]{8,})'
    OR external_url ~* '(boards\\.greenhouse\\.io|job-boards\\.greenhouse\\.io|jobs\\.lever\\.co|jobs\\.ashbyhq\\.com|\\.recruitee\\.com|\\.workable\\.com|\\.bamboohr\\.com|myworkdayjobs\\.com|smartrecruiters\\.com|icims\\.com|taleo\\.net)'
  )
)`;

const NON_US = String.raw`\m(europe|european|emea|apac|latam|latin america|united kingdom|england|scotland|wales|germany|berlin|munich|frankfurt|hamburg|france|paris|lyon|netherlands|amsterdam|rotterdam|spain|madrid|barcelona|italy|milan|rome|portugal|lisbon|ireland|dublin|sweden|stockholm|norway|oslo|denmark|copenhagen|finland|helsinki|poland|warsaw|krakow|czech|prague|austria|vienna|switzerland|zurich|belgium|brussels|romania|bucharest|sofia|bulgaria|hungary|budapest|greece|athens|turkey|istanbul|ukraine|russia|moscow|israel|tel aviv|uae|united arab emirates|dubai|abu dhabi|qatar|saudi|jordan|lebanon|cairo|egypt|south africa|nigeria|kenya|canada|toronto|vancouver|montreal|ottawa|costa rica|mexico city|brazil|são paulo|sao paulo|argentina|buenos aires|chile|santiago|colombia|bogota|peru|lima|australia|sydney|melbourne|new zealand|auckland|india|bangalore|mumbai|hyderabad|delhi|pune|pakistan|karachi|bangladesh|china|beijing|shanghai|hong kong|taiwan|taipei|japan|tokyo|south korea|seoul|singapore|malaysia|kuala lumpur|indonesia|jakarta|thailand|bangkok|vietnam|ho chi minh|hanoi|philippines|manila)\M`;

const SQL_CASE = `CASE
  WHEN source = 'platform' THEN 0
  WHEN location ~* '${NON_US}' THEN 2
  WHEN location ~* '\\m(us|usa|u\\.s\\.|united states|north america|americas)\\M' THEN 0
  WHEN location ~* '\\m(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|district of columbia)\\M' THEN 0
  WHEN location ~* '(, ?[A-Z]{2}( |,|$))' THEN 0
  WHEN location IS NULL OR TRIM(location) = '' THEN 1
  WHEN LOWER(location) IN ('remote','various','worldwide','global') THEN 1
  ELSE 1
END`;

(async () => {
  console.log('═══ 1. URL filter impact on remote-tagged jobs ═══');
  const remoteByPass = await sql.unsafe(`
    SELECT
      CASE WHEN ${REQ} THEN 'pass' ELSE 'drop' END AS verdict,
      COUNT(*)::int AS n
    FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
      AND (work_type = 'remote' OR LOWER(location) LIKE '%remote%')
    GROUP BY verdict
    ORDER BY verdict
  `);
  console.log('Remote-tagged jobs (work_type=remote OR location includes "remote"):');
  for (const r of remoteByPass as any[]) console.log(`  ${r.verdict}: ${r.n}`);

  const droppedRemoteSrc = await sql.unsafe(`
    SELECT source, COUNT(*)::int AS n FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
      AND (work_type = 'remote' OR LOWER(location) LIKE '%remote%')
      AND NOT (${REQ})
    GROUP BY source ORDER BY n DESC LIMIT 10
  `);
  console.log('\nDropped remote-tagged jobs by source:');
  for (const r of droppedRemoteSrc as any[]) console.log(`  ${String(r.source ?? '(null)').padEnd(20)} ${r.n}`);

  console.log('\n═══ 2. US-priority bucketing for remote-tagged jobs ═══');
  const remoteBuckets = await sql.unsafe(`
    SELECT (${SQL_CASE}) AS bucket, COUNT(*)::int AS n FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
      AND (${REQ})
      AND (work_type = 'remote' OR LOWER(location) LIKE '%remote%')
    GROUP BY bucket ORDER BY bucket
  `);
  const labels: Record<number, string> = { 0: 'US', 1: 'unknown', 2: 'non-US' };
  console.log('Remote-tagged jobs (passing URL filter) by bucket:');
  for (const r of remoteBuckets as any[]) console.log(`  ${r.bucket} ${labels[r.bucket]?.padEnd(10)} ${r.n}`);

  console.log('\n═══ 3. What location strings end up in bucket 1 (demoted)? ═══');
  const bucket1Loc = await sql.unsafe(`
    SELECT location, COUNT(*)::int AS n FROM job_postings
    WHERE status='active' AND (expires_at IS NULL OR expires_at > NOW())
      AND (${REQ})
      AND (work_type = 'remote' OR LOWER(location) LIKE '%remote%')
      AND (${SQL_CASE}) = 1
    GROUP BY location ORDER BY n DESC LIMIT 20
  `);
  console.log('Top 20 location strings that landed in bucket 1 (demoted below explicit-US):');
  for (const r of bucket1Loc as any[]) console.log(`  ${String(r.n).padStart(5)}  "${r.location}"`);

  await sql.end();
})();
