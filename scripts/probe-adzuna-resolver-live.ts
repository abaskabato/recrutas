import 'dotenv/config';
import { resolveAdzunaLinksBatch } from '../server/lib/adzuna-link-resolver';

const QUERIES = [
  'software engineer', 'data analyst', 'product manager',
  'nurse', 'accountant', 'marketing manager',
  'project manager', 'sales representative',
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  redirect_url: string;
}

async function main() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new Error('Adzuna creds missing');

  const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=${encodeURIComponent(query)}&content-type=application/json&sort_by=relevance`;

  console.log(`Fetching Adzuna jobs for query: "${query}"`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Adzuna fetch failed: ${r.status}`);
  const data = (await r.json()) as { results: AdzunaJob[] };
  if (!data.results?.length) throw new Error('No results from Adzuna');

  const sample = pickRandom(data.results, 5);
  console.log(`\nPicked 5 random jobs:\n`);
  sample.forEach((j, i) => {
    console.log(`${i + 1}. ${j.title} @ ${j.company.display_name} — ${j.location.display_name}`);
  });

  const inputs = sample.map(j => ({
    title: j.title,
    company: j.company.display_name,
    location: j.location.display_name,
    fallbackUrl: j.redirect_url,
  }));

  console.log(`\nResolving…\n`);
  const t0 = Date.now();
  const results = await resolveAdzunaLinksBatch(inputs, { concurrency: 5 });
  const elapsed = Date.now() - t0;

  let resolvedCount = 0;
  results.forEach((r, i) => {
    if (r.resolved) resolvedCount++;
    const status = r.resolved ? `✓ ${r.atsType} (${r.score?.toFixed(2)})` : '✗ fallback';
    console.log(`[${i + 1}] ${status}`);
    console.log(`    ${sample[i].company.display_name}: ${sample[i].title}`);
    console.log(`    original: ${sample[i].redirect_url.slice(0, 80)}…`);
    console.log(`    final:    ${r.url.slice(0, 100)}${r.url.length > 100 ? '…' : ''}`);
  });

  console.log(`\nSummary: ${resolvedCount}/5 resolved in ${elapsed}ms`);
}

main().catch(err => { console.error(err); process.exit(1); });
