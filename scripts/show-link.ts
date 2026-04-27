import { resolveAdzunaLink } from '../server/lib/adzuna-link-resolver';

const r = await resolveAdzunaLink({
  title: 'Sr Data Analyst, Operations Innovation',
  company: 'DaVita',
  location: 'US',
  fallbackUrl: 'https://adzuna.com'
});

console.log('Job: Sr Data Analyst, Operations Innovation | DaVita | US');
console.log('');
console.log('Link: ' + r.url);
console.log('');
console.log('Click the link, then search - first result is exact job!');
console.log('Exact job: https://careers.davita.com/job/R0453145/Sr-Data-Analyst-Operations-Innovation');