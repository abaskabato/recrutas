/**
 * Probe whether Adzuna's /land/ad/ redirect resolves from our server IPs.
 * - Fetches 5 jobs from Adzuna API
 * - For each, tries manual-redirect then follow-redirect with a browser UA
 * - Reports status codes, Location headers, and final URLs
 */
import 'dotenv/config';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function probe() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.error('ADZUNA_APP_ID/ADZUNA_APP_KEY missing');
    process.exit(1);
  }

  const apiUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=5&what=software%20engineer&content-type=application/json`;
  const res = await fetch(apiUrl);
  if (!res.ok) {
    console.error(`Adzuna API ${res.status}`);
    process.exit(1);
  }
  const data = (await res.json()) as { results?: Array<{ redirect_url: string; title: string; company: { display_name: string } }> };
  const jobs = data.results ?? [];
  console.log(`Got ${jobs.length} jobs\n`);

  for (const job of jobs) {
    console.log(`─── ${job.title} @ ${job.company.display_name}`);
    console.log(`    redirect_url: ${job.redirect_url}`);

    for (const mode of ['manual', 'follow'] as const) {
      for (const useUA of [false, true]) {
        try {
          const started = Date.now();
          const r = await fetch(job.redirect_url, {
            redirect: mode,
            headers: useUA ? { 'User-Agent': BROWSER_UA, Accept: 'text/html' } : {},
          });
          const elapsed = Date.now() - started;
          const loc = r.headers.get('location');
          const label = `[${mode.padEnd(6)} ua=${useUA ? 'chrome ' : 'none   '}]`;
          console.log(`    ${label} status=${r.status} ${elapsed}ms ${mode === 'manual' ? `loc=${loc}` : `final=${r.url}`}`);
        } catch (e) {
          console.log(`    [${mode} ua=${useUA}] ERROR ${(e as Error).message}`);
        }
      }
    }
    console.log();
  }
}

probe().catch(e => {
  console.error(e);
  process.exit(1);
});
