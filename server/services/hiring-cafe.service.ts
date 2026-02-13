/**
 * Hiring.cafe API Service
 *
 * Real-time job discovery via hiring.cafe's search API.
 * Covers any industry (hospitality, trades, healthcare, tech).
 * Results are returned as ExternalJobInput for ingestion into job_postings.
 *
 * API is unauthenticated but requires browser-spoofed headers.
 * This is fragile — cache-on-read via jobIngestionService mitigates downtime.
 */

import { ExternalJobInput } from './job-ingestion.service.js';

const HIRING_CAFE_API_URL = 'https://hiring.cafe/api/search-jobs';
const PAGE_SIZE = 1000;
const MAX_PAGES = 2;
const REQUEST_TIMEOUT_MS = 15_000;

/** Shape of a single job result from hiring.cafe API */
interface HiringCafeJobResult {
  id: string;
  board_token?: string;
  source: string;
  apply_url?: string;
  job_information?: {
    title?: string;
    description?: string;
  };
}

interface HiringCafeApiResponse {
  results?: HiringCafeJobResult[];
}

interface SearchOptions {
  maxPages?: number;
  signal?: AbortSignal;
}

// Common skills for keyword extraction from descriptions
const COMMON_SKILLS = [
  // Tech
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'Go', 'Rust',
  'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'Redis', 'SQL',
  'HTML', 'CSS', 'Vue.js', 'Angular', 'Express', 'Django', 'Flask',
  'Git', 'CI/CD', 'GraphQL', 'REST', 'API', 'Microservices',
  'Machine Learning', 'AI', 'Data Science', 'Analytics',
  // Hospitality & Food Service
  'Dishwashing', 'Kitchen Staff', 'Line Cook', 'Prep Cook', 'Server', 'Bartender',
  'Host', 'Busser', 'Food Preparation', 'Culinary Arts', 'Barista', 'Housekeeping',
  'Sanitation', 'Food Safety', 'ServSafe', 'HACCP', 'POS Systems', 'Cash Handling',
  'Cashier', 'Restaurant', 'Hospitality',
  // Trades & Construction
  'Electrical', 'Plumbing', 'Carpentry', 'Welding', 'HVAC', 'Roofing', 'Masonry',
  'Painting', 'Landscaping', 'General Labor', 'Construction', 'Warehouse',
  'Forklift Operation', 'Blueprint Reading', 'OSHA',
  // Healthcare
  'Certified Nursing Assistant', 'CNA', 'Home Health Aide', 'HHA',
  'Medical Assistant', 'Phlebotomy', 'CPR Certified', 'BLS Certified',
  'Patient Care', 'Electronic Medical Records', 'EMR', 'HIPAA Compliance',
  'Medical Terminology', 'Vital Signs',
  // Retail & Customer Service
  'Retail Sales', 'Sales', 'Customer Service', 'Call Center', 'Receptionist',
  'Front Desk', 'Clerical', 'Data Entry', 'Inventory Management', 'Stocking',
  'Merchandising', 'Visual Merchandising', 'Loss Prevention',
  // Transportation
  'Delivery Driver', 'Truck Driver', 'CDL', 'Commercial Drivers License',
  'Rideshare Driver', 'Courier', 'DOT', 'Delivery',
  // Cleaning & Maintenance
  'Janitorial', 'Cleaning', 'Housekeeping', 'Maintenance', 'Handyman',
  'Property Maintenance', 'Groundskeeping',
  // Security
  'Security', 'Security Guard', 'Security Officer', 'Surveillance',
  'Safety Compliance', 'First Aid',
  // General
  'Microsoft Office', 'Excel', 'Word', 'Communication', 'Teamwork', 'Leadership',
  'Time Management', 'Problem Solving', 'Attention to Detail', 'Multitasking',
  'Physical Stamina', 'Heavy Lifting',
];

/**
 * Strip HTML tags from a string, returning plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
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
 * Extract skills from text using keyword matching.
 */
function extractSkillsFromText(text: string): string[] {
  return COMMON_SKILLS
    .filter(skill => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'i').test(text);
    })
    .slice(0, 10);
}

/**
 * Detect work type from description text.
 */
function detectWorkType(text: string): 'remote' | 'hybrid' | 'onsite' {
  const lower = text.toLowerCase();
  if (lower.includes('remote') && lower.includes('hybrid')) return 'hybrid';
  if (lower.includes('fully remote') || lower.includes('100% remote')) return 'remote';
  if (lower.includes('remote')) return 'remote';
  if (lower.includes('hybrid')) return 'hybrid';
  return 'onsite';
}

/**
 * Extract requirements from description text (simple sentence-level matching).
 */
function extractRequirements(text: string): string[] {
  const sentences = text.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 10);
  const requirementKeywords = ['require', 'must have', 'must be', 'need', 'qualification', 'experience with', 'proficient'];
  return sentences
    .filter(s => requirementKeywords.some(kw => s.toLowerCase().includes(kw)))
    .slice(0, 5);
}

export class HiringCafeService {

  /**
   * Search hiring.cafe for jobs matching the given keywords.
   * Returns ExternalJobInput[] ready for scoring and optional ingestion.
   */
  async searchByKeywords(
    keywords: string,
    options: SearchOptions = {}
  ): Promise<ExternalJobInput[]> {
    const maxPages = options.maxPages ?? MAX_PAGES;
    const allJobs: ExternalJobInput[] = [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // If caller provides an external signal, propagate abort
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      for (let page = 0; page < maxPages; page++) {
        const body = {
          size: PAGE_SIZE,
          page,
          searchState: {
            searchQuery: keywords,
            dateFetchedPastNDays: 15,
            locations: [{ formatted_address: 'United States' }],
            workplaceTypes: ['Remote', 'Hybrid', 'Onsite'],
            commitmentTypes: ['Full Time', 'Part Time', 'Contract'],
            seniorityLevel: ['No Prior Experience Required', 'Entry Level', 'Mid Level', 'Senior Level'],
          },
        };

        const response = await fetch(HIRING_CAFE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://hiring.cafe',
            'Referer': 'https://hiring.cafe/',
            'Accept': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          console.error(`[HiringCafe] API returned ${response.status} on page ${page}`);
          break;
        }

        const data: HiringCafeApiResponse = await response.json();
        const results = data.results ?? [];

        if (results.length === 0) break;

        const transformed = results
          .filter(r => r.id && r.apply_url && r.job_information?.title)
          .map(r => this.transformToExternalJobInput(r));

        allJobs.push(...transformed);

        console.log(`[HiringCafe] Page ${page}: ${results.length} results, ${transformed.length} valid`);

        // If we got fewer results than page size, no more pages
        if (results.length < PAGE_SIZE) break;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`[HiringCafe] Request timed out after ${REQUEST_TIMEOUT_MS}ms — returning ${allJobs.length} partial results`);
      } else {
        console.error('[HiringCafe] API error:', error.message);
      }
    } finally {
      clearTimeout(timeout);
    }

    console.log(`[HiringCafe] Total: ${allJobs.length} jobs for query "${keywords}"`);
    return allJobs;
  }

  /**
   * Transform a single hiring.cafe result into ExternalJobInput.
   */
  private transformToExternalJobInput(result: HiringCafeJobResult): ExternalJobInput {
    const rawDescription = result.job_information?.description ?? '';
    const description = stripHtml(rawDescription);
    const title = result.job_information?.title ?? 'Untitled Position';

    return {
      title,
      company: result.source || 'Unknown Company',
      location: 'United States', // Default; hiring.cafe doesn't always include location per-result
      description: description.slice(0, 5000), // Cap length
      requirements: extractRequirements(description),
      skills: extractSkillsFromText(`${title} ${description}`),
      workType: detectWorkType(description),
      source: 'hiring-cafe',
      externalId: result.id,
      externalUrl: result.apply_url || '',
      postedDate: new Date().toISOString(),
    };
  }
}

export const hiringCafeService = new HiringCafeService();
