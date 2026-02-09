/**
 * US Location Filter
 *
 * Utility to determine whether a job location string refers to a US location.
 * Used at ingestion time and display time to keep non-US jobs out of results.
 */

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
]);

const US_STATE_NAMES = new Set([
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
  'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
  'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
  'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
  'new hampshire', 'new jersey', 'new mexico', 'new york',
  'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon',
  'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
  'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
  'west virginia', 'wisconsin', 'wyoming', 'district of columbia',
]);

// Explicit non-US keywords — checked before US heuristics so "Remote - Europe" is rejected
const NON_US_KEYWORDS = [
  'europe', 'european', 'emea', 'apac', 'latam',
  'united kingdom', 'uk', 'england', 'scotland', 'wales',
  'germany', 'berlin', 'munich', 'frankfurt', 'hamburg',
  'france', 'paris', 'lyon',
  'netherlands', 'amsterdam', 'rotterdam',
  'spain', 'madrid', 'barcelona',
  'italy', 'milan', 'rome',
  'portugal', 'lisbon',
  'ireland', 'dublin',
  'sweden', 'stockholm',
  'norway', 'oslo',
  'denmark', 'copenhagen',
  'finland', 'helsinki',
  'poland', 'warsaw', 'krakow',
  'czech', 'prague',
  'austria', 'vienna',
  'switzerland', 'zurich',
  'belgium', 'brussels',
  'canada', 'toronto', 'vancouver', 'montreal', 'ottawa',
  'australia', 'sydney', 'melbourne',
  'india', 'bangalore', 'mumbai', 'hyderabad', 'delhi', 'pune',
  'japan', 'tokyo',
  'china', 'beijing', 'shanghai',
  'singapore',
  'brazil', 'são paulo',
  'mexico', 'mexico city',
  'israel', 'tel aviv',
  'south korea', 'seoul',
];

/**
 * Returns true if the location string is empty/remote or appears to be in the US.
 * Returns false for clearly non-US locations.
 */
export function isUSLocation(location: string | null | undefined): boolean {
  if (!location || location.trim() === '') return true;

  const lower = location.toLowerCase().trim();

  // Check for explicit non-US keywords first
  for (const keyword of NON_US_KEYWORDS) {
    if (lower.includes(keyword)) return false;
  }

  // "Remote" without non-US qualifier is US
  if (lower === 'remote' || lower === 'remote, us' || lower === 'remote, usa') return true;
  if (lower.startsWith('remote')) return true; // "Remote - US", "Remote (US)", etc. (non-US already filtered)

  // Explicit US references
  if (lower.includes('united states') || lower.includes('usa') || lower.includes('u.s.')) return true;

  // "City, ST" pattern — 2-letter state code after last comma
  const commaIdx = lower.lastIndexOf(',');
  if (commaIdx !== -1) {
    const afterComma = location.slice(commaIdx + 1).trim();
    // Could be "CA", "CA 94105", "New York" etc.
    const stateCandidate = afterComma.split(/\s+/)[0].toUpperCase();
    if (stateCandidate.length === 2 && US_STATE_CODES.has(stateCandidate)) return true;
  }

  // Check for full US state names anywhere in the string
  for (const state of US_STATE_NAMES) {
    if (lower.includes(state)) return true;
  }

  // If we can't determine, assume US (better to show a borderline job than miss it)
  return true;
}
