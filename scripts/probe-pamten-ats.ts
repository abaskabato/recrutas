/**
 * Probe whether PamTen has a known ATS presence.
 * Tests the proposed Adzuna→ATS resolution flow against a real job card:
 *   "Sr UX Designer" @ PamTen Inc, Grand Central, Manhattan
 */
import 'dotenv/config';

const slugs = ['pamten', 'pamteninc', 'pam-ten', 'pamten-inc'];

const endpoints = [
  { ats: 'Greenhouse', tmpl: (s: string) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs` },
  { ats: 'Lever',      tmpl: (s: string) => `https://api.lever.co/v0/postings/${s}?mode=json` },
  { ats: 'Ashby',      tmpl: (s: string) => `https://api.ashbyhq.com/posting-api/job-board/${s}` },
  { ats: 'Workable',   tmpl: (s: string) => `https://apply.workable.com/api/v1/widget/accounts/${s}` },
  { ats: 'Recruitee',  tmpl: (s: string) => `https://${s}.recruitee.com/api/offers` },
  { ats: 'SmartRecruiters', tmpl: (s: string) => `https://api.smartrecruiters.com/v1/companies/${s}/postings` },
];

async function probe() {
  console.log('Probing PamTen across common ATS providers…\n');
  const hits: Array<{ ats: string; slug: string; jobs: number }> = [];

  for (const { ats, tmpl } of endpoints) {
    for (const slug of slugs) {
      const url = tmpl(slug);
      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const label = `${ats.padEnd(16)} slug=${slug.padEnd(14)}`;
        if (r.ok) {
          const txt = await r.text();
          const jobCount = (txt.match(/"title"/g) || []).length;
          console.log(`  ✓ ${label} → HTTP 200, ~${jobCount} titles`);
          hits.push({ ats, slug, jobs: jobCount });
        } else {
          console.log(`  × ${label} → ${r.status}`);
        }
      } catch (e) {
        console.log(`  ! ${ats.padEnd(16)} slug=${slug.padEnd(14)} ERROR ${(e as Error).message}`);
      }
    }
  }

  console.log();
  if (hits.length === 0) {
    console.log('NO ATS MATCH — PamTen has no standard-ATS presence at tested slugs.');
    console.log('Next step: check their actual careers page.');
  } else {
    console.log(`HITS: ${hits.map(h => `${h.ats}(${h.slug}, ${h.jobs} jobs)`).join(', ')}`);
  }
}

probe().catch(e => {
  console.error(e);
  process.exit(1);
});
