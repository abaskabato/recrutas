import 'dotenv/config';

// Known ATS URL patterns — ordered by specificity.
// We look only for job-specific patterns (not bare domains), so a careers homepage mention
// doesn't get confused for a deep-link.
const ATS_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'greenhouse_board',  re: /https?:\/\/boards\.greenhouse\.io\/[\w-]+\/jobs\/\d+/gi },
  { name: 'greenhouse_sub',    re: /https?:\/\/[\w-]+\.greenhouse\.io\/[\w\-\/]+/gi },
  { name: 'greenhouse_short',  re: /https?:\/\/grnh\.se\/[\w]+/gi },
  { name: 'lever',             re: /https?:\/\/jobs\.(?:eu\.)?lever\.co\/[\w-]+\/[\w-]+/gi },
  { name: 'ashby',             re: /https?:\/\/jobs\.ashbyhq\.com\/[\w-]+(?:\/[\w-]+)?/gi },
  { name: 'ashby_sub',         re: /https?:\/\/[\w-]+\.ashbyhq\.com\/[\w\-\/]*/gi },
  { name: 'workable',          re: /https?:\/\/apply\.workable\.com\/[\w-]+\/j\/[\w]+/gi },
  { name: 'workday',           re: /https?:\/\/[\w-]+\.(?:wd\d+\.)?myworkdayjobs\.com\/[\w\-\/]+/gi },
  { name: 'recruitee',         re: /https?:\/\/[\w-]+\.recruitee\.com\/o\/[\w-]+/gi },
  { name: 'smartrecruiters',   re: /https?:\/\/jobs\.smartrecruiters\.com\/[\w-]+(?:\/\d+)?/gi },
  { name: 'bamboohr',          re: /https?:\/\/[\w-]+\.bamboohr\.com\/(?:careers|jobs)\/\d+/gi },
  { name: 'icims',             re: /https?:\/\/careers-[\w-]+\.icims\.com\/[\w\-\/]+/gi },
  { name: 'taleo',             re: /https?:\/\/[\w-]+\.taleo\.net\/[\w\-\/?=&]+/gi },
  { name: 'jobvite',           re: /https?:\/\/jobs\.jobvite\.com\/[\w-]+\/job\/[\w]+/gi },
  { name: 'paycom',            re: /https?:\/\/[\w-]+\.paycomonline\.net\/[\w\-\/?=&]+/gi },
  { name: 'adp',               re: /https?:\/\/workforcenow\.adp\.com\/[\w\-\/?=&]+/gi },
  { name: 'ukg',               re: /https?:\/\/[\w-]+\.ultipro\.com\/[\w\-\/?=&]+/gi },
];

// Fallback: any URL that looks like a careers/jobs page on a non-aggregator domain.
const CAREERS_URL = /https?:\/\/(?!(?:www\.)?(?:adzuna|indeed|glassdoor|linkedin|ziprecruiter|monster|simplyhired|jobcase|careerbuilder|jobs2careers)\.)[\w.-]+\/(?:careers?|jobs?|apply|openings|opportunities)(?:[\/?#][\w\-\/?=&#.]*)?/gi;

const QUERIES = [
  'software engineer', 'data analyst', 'product manager',
  'nurse', 'accountant', 'marketing manager',
  'project manager', 'sales representative',
];

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
}

async function fetchQuery(query: string, appId: string, appKey: string): Promise<AdzunaJob[]> {
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=${encodeURIComponent(query)}&content-type=application/json&sort_by=relevance`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const data = (await r.json()) as { results?: AdzunaJob[] };
  return data.results ?? [];
}

function scanDescription(desc: string) {
  const hits: { ats: string; url: string }[] = [];
  for (const { name, re } of ATS_PATTERNS) {
    const matches = desc.match(re);
    if (matches && matches.length > 0) {
      matches.forEach(m => hits.push({ ats: name, url: m }));
    }
  }
  return hits;
}

function scanCareers(desc: string): string | null {
  const m = desc.match(CAREERS_URL);
  return m ? m[0] : null;
}

async function main() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new Error('Adzuna creds missing');

  const allJobs: AdzunaJob[] = [];
  for (const q of QUERIES) {
    const jobs = await fetchQuery(q, appId, appKey);
    console.log(`[${q}] fetched ${jobs.length}`);
    allJobs.push(...jobs);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nTotal jobs fetched: ${allJobs.length}\n`);
  console.log('=== Description URL Extraction ===\n');

  let atsHit = 0;
  let careersHit = 0;
  let neither = 0;
  const atsByPlatform: Record<string, number> = {};
  const examples: Record<string, string[]> = {};

  for (const job of allJobs) {
    const desc = job.description || '';
    const atsHits = scanDescription(desc);

    if (atsHits.length > 0) {
      atsHit++;
      for (const h of atsHits) {
        atsByPlatform[h.ats] = (atsByPlatform[h.ats] || 0) + 1;
        if (!examples[h.ats]) examples[h.ats] = [];
        if (examples[h.ats].length < 3) {
          examples[h.ats].push(`${job.company.display_name} — ${h.url.slice(0, 100)}`);
        }
      }
    } else {
      const careersUrl = scanCareers(desc);
      if (careersUrl) {
        careersHit++;
        if (!examples['careers_fallback']) examples['careers_fallback'] = [];
        if (examples['careers_fallback'].length < 5) {
          examples['careers_fallback'].push(`${job.company.display_name} — ${careersUrl.slice(0, 100)}`);
        }
      } else {
        neither++;
      }
    }
  }

  const total = allJobs.length;
  console.log(`Direct ATS URL in description:  ${atsHit}/${total} (${((atsHit / total) * 100).toFixed(1)}%)`);
  console.log(`Careers/jobs URL (fallback):    ${careersHit}/${total} (${((careersHit / total) * 100).toFixed(1)}%)`);
  console.log(`No usable URL:                  ${neither}/${total} (${((neither / total) * 100).toFixed(1)}%)`);
  console.log();

  console.log('=== By ATS Platform ===');
  Object.entries(atsByPlatform)
    .sort((a, b) => b[1] - a[1])
    .forEach(([ats, count]) => console.log(`  ${ats.padEnd(20)} ${count}`));

  console.log('\n=== Examples ===');
  for (const [ats, list] of Object.entries(examples)) {
    console.log(`\n[${ats}]`);
    list.forEach(e => console.log(`  ${e}`));
  }
}

main().catch(err => { console.error(err); process.exit(1); });
