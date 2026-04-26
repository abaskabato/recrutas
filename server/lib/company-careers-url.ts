const cache = new Map<string, string | null>();

function cleanCompanyName(company: string): string {
  return company
    .replace(/\bc\/o\b.*/i, '')           // "TEKsystems c/o Allegis Group" → "TEKsystems"
    .replace(/\b(llc|inc|ltd|corp|co|plc|lp|llp|dba)\.?\b/gi, '')
    .replace(/\s*[-–|]\s*.+$/, '')         // "Panera Bread - Liberty" → "Panera Bread"
    .replace(/[.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function bestMatch(company: string, results: Array<{ name: string; domain: string }>): string | null {
  const key = normalize(company);
  for (const r of results) {
    const rName = normalize(r.name);
    const rDomain = normalize(r.domain.split('.')[0]);
    if (rName.includes(key) || rDomain === key) {
      return `https://${r.domain}`;
    }
  }
  return null;
}

export async function getCareersUrl(company: string, timeoutMs = 8_000): Promise<string | null> {
  const key = company.trim().toLowerCase();
  const cleaned = cleanCompanyName(company);
  if (cache.has(key)) return cache.get(key)!;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(cleaned)}`;
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) { cache.set(key, null); return null; }
    const arr = await r.json() as Array<{ name: string; domain: string }>;
    const result = arr?.length ? bestMatch(cleaned, arr) : null;
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
