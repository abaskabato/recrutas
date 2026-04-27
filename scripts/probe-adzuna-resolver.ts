import { resolveAdzunaLinksBatch } from '../server/lib/adzuna-link-resolver';

async function main() {
  const cases = [
    { title: 'Senior Software Engineer', company: 'Stripe', location: 'San Francisco, CA', fallbackUrl: 'https://adzuna.com/land/ad/fake-stripe' },
    { title: 'Staff Engineer', company: 'Airbnb', location: 'Remote', fallbackUrl: 'https://adzuna.com/land/ad/fake-airbnb' },
    { title: 'Sr UX Designer', company: 'PamTen Inc', location: 'Manhattan, NY', fallbackUrl: 'https://adzuna.com/land/ad/fake-pamten' },
    { title: 'Data Engineer', company: 'Weird Tiny Unknown Corp', location: 'Des Moines, IA', fallbackUrl: 'https://adzuna.com/land/ad/fake-unknown' },
  ];

  const t0 = Date.now();
  const results = await resolveAdzunaLinksBatch(cases, { concurrency: 4 });
  console.log('Elapsed:', Date.now() - t0, 'ms');
  results.forEach((r, i) => {
    console.log(`[${cases[i].company}] resolved=${r.resolved} ats=${r.atsType ?? '-'} score=${r.score?.toFixed(2) ?? '-'}`);
    console.log('  url:', r.url);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
