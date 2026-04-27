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

async function detectATS(domain: string): Promise<{ ats: string; url: string } | null> {
  const candidates = [
    `https://${domain}/careers`,
    `https://${domain}/jobs`,
    `https://careers.${domain}`,
  ];
  for (const url of candidates) {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const finalUrl = res.url;
      for (const [ats, pattern] of Object.entries(ATS_PATTERNS)) {
        if (pattern.test(finalUrl)) return { ats, url: finalUrl };
      }
      if (res.ok) {
        const html = await res.text();
        for (const [ats, pattern] of Object.entries(ATS_PATTERNS)) {
          const match = html.match(new RegExp(`https?://[^"'\\s]*${pattern.source}[^"'\\s]*`, 'i'));
          if (match) return { ats, url: match[0] };
        }
      }
    } catch { continue; }
  }
  return null;
}

async function main() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '', { max: 1, prepare: false });

  // Get sample jobs that already have a company homepage URL
  const jobs = await sql<any[]>`
    SELECT id, title, company, location, external_url
    FROM job_postings
    WHERE source = 'Adzuna'
      AND external_url NOT LIKE '%adzuna%'
      AND external_url ~ '^https?://[^/]+/?$'
    LIMIT 5
  `;

  for (const job of jobs) {
    const domain = new URL(job.external_url).hostname.replace(/^www\./, '');
    console.log(`\n[${job.id}] ${job.title} @ ${job.company}`);
    console.log(`  homepage: ${job.external_url}`);
    const result = await detectATS(domain);
    console.log(`  ATS: ${result ? `${result.ats} → ${result.url}` : 'not detected'}`);
  }

  await sql.end();
}
main().catch(console.error);
