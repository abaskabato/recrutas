import 'dotenv/config';
const queries = [
  'Booz Allen', 'Booz',
  'Texas Tech University Health Sciences Center El Paso',
  'Texas Tech University', 'Texas Tech',
  'Community Health Of South Florida',
  'Community Health South Florida',
  'HM Alpha Hotels & Resorts', 'HM Alpha Hotels', 'HM Alpha',
  'Rubio\'s Restaurant Group', 'Rubio\'s',
  'Mid Kansas Cooperative', 'Mid Kansas',
  'DDS Associates',
];
async function clearbit(name: string): Promise<Array<{name:string;domain:string}>> {
  try {
    const r = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}`);
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; }
}
async function main() {
  for (const q of queries) {
    const res = await clearbit(q);
    const top2 = res.slice(0,2).map(x=>`${x.name}→${x.domain}`).join(' | ');
    console.log(`"${q.padEnd(55)}"  ${top2 || '(empty)'}`);
    await new Promise(r=>setTimeout(r,250));
  }
}
main();
