/**
 * Company context scraper for AI question answering.
 *
 * Fetches a company's about/homepage, extracts key text (mission, values, what they build),
 * and caches it in Redis (7-day TTL) so repeated applications to the same company reuse context.
 *
 * Uses simple HTML fetch + text extraction (no Firecrawl credits burned).
 */

import { redis } from './redis';
import { callAI } from './ai-client';

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const CACHE_PREFIX = 'company_context:';
const FETCH_TIMEOUT_MS = 8000;

interface CompanyContext {
  mission?: string;
  whatTheyBuild?: string;
  values?: string;
  founded?: string;
  size?: string;
  summary: string;
}

/**
 * Get company context for AI question answering.
 * Returns a text block suitable for injection into an AI prompt, or empty string if unavailable.
 */
export async function getCompanyContext(
  companyName: string,
  boardToken: string,
): Promise<string> {
  const cacheKey = `${CACHE_PREFIX}${boardToken}`;

  // Check cache first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[CompanyContext] Cache hit for ${companyName} (${boardToken})`);
      return cached;
    }
  } catch {
    // Redis error — continue without cache
  }

  console.log(`[CompanyContext] Cache miss for ${companyName} (${boardToken}) — scraping`);

  // Derive company website from Greenhouse board token
  // Board tokens are typically the company slug, e.g. "stripe" → stripe.com
  const possibleDomains = deriveCompanyDomains(boardToken, companyName);

  let pageText = '';
  for (const domain of possibleDomains) {
    pageText = await tryFetchAboutPage(domain);
    if (pageText.length > 200) break; // got meaningful content
  }

  if (pageText.length < 200) {
    // Fallback: try the Greenhouse board page itself for company info
    pageText = await tryFetchGreenhouseBoard(boardToken);
  }

  if (pageText.length < 100) {
    // Nothing useful found — cache empty result to avoid repeated scraping
    try { await redis.set(cacheKey, '', CACHE_TTL_SECONDS); } catch { /* ignore */ }
    return '';
  }

  // Use AI to extract structured company context from raw page text
  const context = await extractCompanyContext(pageText, companyName);

  // Cache the result
  try {
    await redis.set(cacheKey, context, CACHE_TTL_SECONDS);
  } catch {
    // Redis error — continue without caching
  }

  return context;
}

/**
 * Derive likely company domains from the Greenhouse board token and company name.
 */
function deriveCompanyDomains(boardToken: string, companyName: string): string[] {
  // Clean the board token — e.g. "stripe", "reddit", "airbnb-inc" → "airbnb"
  const slug = boardToken.replace(/-inc$|-llc$|-ltd$|-corp$|-co$|-hq$|-careers$|-jobs$/, '');
  const nameSlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const domains = new Set<string>();
  domains.add(`${slug}.com`);
  if (slug !== nameSlug && nameSlug.length > 2) {
    domains.add(`${nameSlug}.com`);
  }
  domains.add(`${slug}.io`);
  domains.add(`${slug}.co`);

  return [...domains];
}

/**
 * Try to fetch and extract text from a company's about page.
 * Tries /about, /about-us, then falls back to homepage.
 */
async function tryFetchAboutPage(domain: string): Promise<string> {
  const paths = ['/about', '/about-us', '/'];

  for (const path of paths) {
    try {
      const url = `https://www.${domain}${path}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Recrutas/1.0)',
          'Accept': 'text/html',
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const html = await res.text();
      const text = stripHtml(html);

      // Only return if we got meaningful content
      if (text.length > 200) {
        return text.slice(0, 5000); // Cap to avoid huge payloads
      }
    } catch {
      continue;
    }
  }

  return '';
}

/**
 * Fetch the Greenhouse job board page for company context.
 * The board page often has a company description.
 */
async function tryFetchGreenhouseBoard(boardToken: string): Promise<string> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Recrutas/1.0)' },
    });
    clearTimeout(timeout);

    if (!res.ok) return '';

    const data = await res.json() as { name?: string; content?: string };
    const content = data.content || '';
    return stripHtml(content).slice(0, 3000);
  } catch {
    return '';
  }
}

/**
 * Strip HTML tags and normalize whitespace.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Use AI to extract a concise company context summary from raw page text.
 * Returns a formatted string ready for injection into the question-answering prompt.
 */
async function extractCompanyContext(pageText: string, companyName: string): Promise<string> {
  const systemPrompt = `Extract key company information from the provided webpage text. Return a JSON object with these fields (use null if not found):
- "mission": The company's mission statement or purpose (1-2 sentences)
- "whatTheyBuild": What products/services the company offers (1-2 sentences)
- "values": Core company values or culture highlights (brief list)
- "founded": When the company was founded
- "size": Company size (employees, funding stage, etc.)
- "industry": What industry/sector they operate in

Be concise. Only include information actually present in the text. Do not fabricate.
Return JSON only: { "mission": "...", "whatTheyBuild": "...", "values": "...", "founded": "...", "size": "...", "industry": "..." }`;

  const userPrompt = `Company: ${companyName}\n\nWebpage text:\n${pageText.slice(0, 4000)}`;

  try {
    const raw = await callAI(systemPrompt, userPrompt, {
      priority: 'low',
      estimatedTokens: 800,
      temperature: 0.1,
      maxOutputTokens: 500,
    });

    const parsed = JSON.parse(raw) as CompanyContext & { industry?: string };

    // Build a readable context block
    const parts: string[] = [];
    if (parsed.mission) parts.push(`Mission: ${parsed.mission}`);
    if (parsed.whatTheyBuild) parts.push(`Products/Services: ${parsed.whatTheyBuild}`);
    if (parsed.values) parts.push(`Values: ${parsed.values}`);
    if (parsed.industry) parts.push(`Industry: ${parsed.industry}`);
    if (parsed.founded) parts.push(`Founded: ${parsed.founded}`);
    if (parsed.size) parts.push(`Size: ${parsed.size}`);

    if (parts.length === 0) return '';

    return parts.join('\n');
  } catch (err) {
    console.error(`[CompanyContext] AI extraction failed for ${companyName}:`, (err as Error).message);
    return '';
  }
}
