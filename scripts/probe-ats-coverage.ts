import 'dotenv/config';
import postgres from 'postgres';

const ATS_PATTERNS: Record<string, RegExp> = {
  workday:        /myworkdayjobs\.com/i,
  greenhouse:     /boards\.greenhouse\.io/i,
  lever:          /jobs\.lever\.co/i,
  icims:          /\.icims\.com/i,
  taleo:          /\.taleo\.net/i,
  smartrecruiters:/jobs\.smartrecruiters\.com/i,
  ashby:          /jobs\.ashbyhq\.com/i,
  bamboohr:       /\.bamboohr\.com/i,
  jobvite:        /jobs\.jobvite\.com/i,
  paylocity:      /recruiting\.paylocity\.com/i,
};

async function detectATS(domain: string): Promise<string | null> {
  for (const url of [`https://${domain}/careers`, `https://${domain}/jobs`, `https://careers.${domain}`]) {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const finalUrl = res.url;
      for (const [ats, pattern] of Object.entries(ATS_PATTERNS)) {
        if (pattern.test(finalUrl)) return ats;
      }
      if (res.ok) {
        const html = await res.text();
        for (const [ats, pattern] of Object.entries(ATS_PATTERNS)) {
          if (pattern.test(html)) return ats;
        }
      }
    } catch { continue; }
  }
  return null;
}

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });

  const jobs = await sql<any[]>`
    SELECT DISTINCT ON (external_url) id, company, external_url
    FROM job_postings
    WHERE source = 'Adzuna'
      AND external_url NOT LIKE '%adzuna%'
      AND external_url ~ '^https?://[^/]+/?$'
    LIMIT 50
  `;

  const counts: Record<string, number> = {};
  let detected = 0;

  await Promise.all(jobs.map(async job => {
    const domain = new URL(job.external_url).hostname.replace(/^www\./, '');
    const ats = await detectATS(domain);
    if (ats) {
      detected++;
      counts[ats] = (counts[ats] || 0) + 1;
    } else {
      counts['none'] = (counts['none'] || 0) + 1;
    }
  }));

  console.log(`\nSample: ${jobs.length} unique domains`);
  console.log(`ATS detected: ${detected}/${jobs.length} (${(detected/jobs.length*100).toFixed(0)}%)\n`);
  console.log('Breakdown:', Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}: ${v}`).join(', '));

  await sql.end();
}
main().catch(console.error);
