/**
 * Career Page Scraper - HiringCafe-style job scraping
 *
 * This scraper fetches jobs directly from company career pages
 * and uses AI to extract structured job data from HTML content.
 *
 * Based on HiringCafe's approach:
 * - Scrape directly from employer career pages
 * - Use AI (Groq/LLM) to extract job details
 * - Keep results fresh with frequent updates
 */

import Groq from 'groq-sdk';

interface ScrapedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  skills: string[];
  workType: 'remote' | 'hybrid' | 'onsite';
  salaryMin?: number;
  salaryMax?: number;
  externalUrl: string;
  source: string;
  postedDate: string;
}

interface CompanyCareerPage {
  name: string;
  careerUrl: string;
  apiUrl?: string; // Some companies have JSON APIs
  greenhouseId?: string; // For companies using Greenhouse
  leverId?: string; // For companies using Lever
}

// Top tech companies with career pages to scrape
const COMPANIES_TO_SCRAPE: CompanyCareerPage[] = [
  // Companies with Greenhouse ATS (JSON API available)
  { name: 'Stripe', careerUrl: 'https://stripe.com/jobs', greenhouseId: 'stripe' },
  { name: 'Airbnb', careerUrl: 'https://careers.airbnb.com/', greenhouseId: 'airbnb' },
  { name: 'Discord', careerUrl: 'https://discord.com/careers', greenhouseId: 'discord' },
  { name: 'Figma', careerUrl: 'https://www.figma.com/careers/', greenhouseId: 'figma' },
  { name: 'Notion', careerUrl: 'https://www.notion.so/careers', greenhouseId: 'notion' },
  { name: 'Coinbase', careerUrl: 'https://www.coinbase.com/careers', greenhouseId: 'coinbase' },
  { name: 'Instacart', careerUrl: 'https://careers.instacart.com/', greenhouseId: 'instacart' },
  { name: 'Robinhood', careerUrl: 'https://robinhood.com/us/en/careers/', greenhouseId: 'robinhood' },
  { name: 'Plaid', careerUrl: 'https://plaid.com/careers/', greenhouseId: 'plaid' },
  { name: 'Ramp', careerUrl: 'https://ramp.com/careers', greenhouseId: 'ramp' },

  // Companies with Lever ATS (JSON API available)
  { name: 'Netflix', careerUrl: 'https://jobs.netflix.com/', leverId: 'netflix' },
  { name: 'Twilio', careerUrl: 'https://www.twilio.com/company/jobs', leverId: 'twilio' },
  { name: 'Cloudflare', careerUrl: 'https://www.cloudflare.com/careers/', leverId: 'cloudflare' },

  // Companies with custom career pages (will use HTML scraping + AI)
  { name: 'Google', careerUrl: 'https://careers.google.com/jobs/results/' },
  { name: 'Microsoft', careerUrl: 'https://careers.microsoft.com/us/en/search-results' },
  { name: 'Apple', careerUrl: 'https://jobs.apple.com/en-us/search' },
  { name: 'Amazon', careerUrl: 'https://www.amazon.jobs/en/search' },
  { name: 'Meta', careerUrl: 'https://www.metacareers.com/jobs/' },
  { name: 'Spotify', careerUrl: 'https://www.lifeatspotify.com/jobs' },
  { name: 'Shopify', careerUrl: 'https://www.shopify.com/careers' },
  { name: 'GitHub', careerUrl: 'https://github.com/about/careers' },
  { name: 'Linear', careerUrl: 'https://linear.app/careers' },
  { name: 'Vercel', careerUrl: 'https://vercel.com/careers' },
  { name: 'Supabase', careerUrl: 'https://supabase.com/careers' },
];

class CareerPageScraper {
  private groq: Groq | null = null;
  private cache: Map<string, { jobs: ScrapedJob[], timestamp: number }> = new Map();
  private cacheTTL = 4 * 60 * 60 * 1000; // 4 hours cache (scrape 3x/day like HiringCafe)

  constructor() {
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== '%GROQ_API_KEY%') {
      this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
  }

  /**
   * Get all jobs from company career pages
   */
  async getAllJobs(userSkills?: string[]): Promise<ScrapedJob[]> {
    console.log('[CareerScraper] Starting job aggregation from career pages...');

    const allJobs: ScrapedJob[] = [];
    const errors: string[] = [];

    // Process companies in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < COMPANIES_TO_SCRAPE.length; i += batchSize) {
      const batch = COMPANIES_TO_SCRAPE.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(company => this.scrapeCompany(company))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allJobs.push(...result.value);
        } else if (result.status === 'rejected') {
          errors.push(`${batch[j].name}: ${result.reason}`);
        }
      }

      // Rate limiting between batches
      if (i + batchSize < COMPANIES_TO_SCRAPE.length) {
        await this.delay(1000);
      }
    }

    console.log(`[CareerScraper] Scraped ${allJobs.length} jobs from ${COMPANIES_TO_SCRAPE.length} companies`);
    if (errors.length > 0) {
      console.log(`[CareerScraper] ${errors.length} companies failed:`, errors.slice(0, 5));
    }

    // Filter by user skills if provided
    if (userSkills && userSkills.length > 0) {
      const filteredJobs = allJobs.filter(job => {
        const jobText = `${job.title} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
        return userSkills.some(skill => jobText.includes(skill.toLowerCase()));
      });
      console.log(`[CareerScraper] Filtered to ${filteredJobs.length} jobs matching user skills`);
      return this.deduplicateJobs(filteredJobs);
    }

    return this.deduplicateJobs(allJobs);
  }

  /**
   * Scrape jobs from a single company
   */
  private async scrapeCompany(company: CompanyCareerPage): Promise<ScrapedJob[]> {
    // Check cache first
    const cached = this.cache.get(company.name);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`[CareerScraper] Using cached jobs for ${company.name}`);
      return cached.jobs;
    }

    try {
      let jobs: ScrapedJob[] = [];

      // Try Greenhouse API first
      if (company.greenhouseId) {
        jobs = await this.fetchFromGreenhouse(company);
      }
      // Try Lever API
      else if (company.leverId) {
        jobs = await this.fetchFromLever(company);
      }
      // Fall back to HTML scraping with AI extraction
      else {
        jobs = await this.scrapeWithAI(company);
      }

      // Cache results
      this.cache.set(company.name, { jobs, timestamp: Date.now() });

      return jobs;
    } catch (error: any) {
      console.error(`[CareerScraper] Failed to scrape ${company.name}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch jobs from Greenhouse ATS API
   */
  private async fetchFromGreenhouse(company: CompanyCareerPage): Promise<ScrapedJob[]> {
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${company.greenhouseId}/jobs`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'RecrutasJobAggregator/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Greenhouse API returned ${response.status}`);
      }

      const data = await response.json();
      const jobs: ScrapedJob[] = (data.jobs || []).slice(0, 20).map((job: any) => ({
        id: `greenhouse_${company.greenhouseId}_${job.id}`,
        title: job.title,
        company: company.name,
        location: job.location?.name || 'Remote',
        description: this.stripHtml(job.content || ''),
        requirements: this.extractRequirements(job.content || ''),
        skills: this.extractSkillsFromText(job.title + ' ' + (job.content || '')),
        workType: this.determineWorkType(job.location?.name || ''),
        externalUrl: job.absolute_url || company.careerUrl,
        source: 'external',
        postedDate: job.updated_at || new Date().toISOString()
      }));

      console.log(`[CareerScraper] Fetched ${jobs.length} jobs from ${company.name} (Greenhouse)`);
      return jobs;
    } catch (error: any) {
      console.log(`[CareerScraper] Greenhouse API failed for ${company.name}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch jobs from Lever ATS API
   */
  private async fetchFromLever(company: CompanyCareerPage): Promise<ScrapedJob[]> {
    const apiUrl = `https://api.lever.co/v0/postings/${company.leverId}`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'RecrutasJobAggregator/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Lever API returned ${response.status}`);
      }

      const jobs: any[] = await response.json();
      const scrapedJobs: ScrapedJob[] = jobs.slice(0, 20).map((job: any) => ({
        id: `lever_${company.leverId}_${job.id}`,
        title: job.text,
        company: company.name,
        location: job.categories?.location || 'Remote',
        description: this.stripHtml(job.descriptionPlain || job.description || ''),
        requirements: this.extractRequirements(job.descriptionPlain || ''),
        skills: this.extractSkillsFromText(job.text + ' ' + (job.descriptionPlain || '')),
        workType: this.determineWorkType(job.categories?.location || job.workplaceType || ''),
        externalUrl: job.hostedUrl || company.careerUrl,
        source: 'career_page',
        postedDate: new Date(job.createdAt || Date.now()).toISOString()
      }));

      console.log(`[CareerScraper] Fetched ${scrapedJobs.length} jobs from ${company.name} (Lever)`);
      return scrapedJobs;
    } catch (error: any) {
      console.log(`[CareerScraper] Lever API failed for ${company.name}:`, error.message);
      return [];
    }
  }

  /**
   * Scrape jobs using AI extraction from HTML
   * This is the HiringCafe-style approach for companies without APIs
   */
  private async scrapeWithAI(company: CompanyCareerPage): Promise<ScrapedJob[]> {
    if (!this.groq) {
      console.log(`[CareerScraper] Skipping AI scraping for ${company.name} - no Groq API key`);
      return [];
    }

    try {
      // Fetch the career page HTML
      const response = await fetch(company.careerUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch career page: ${response.status}`);
      }

      const html = await response.text();

      // Use AI to extract job listings from HTML
      const jobs = await this.extractJobsWithAI(html, company);

      console.log(`[CareerScraper] AI extracted ${jobs.length} jobs from ${company.name}`);
      return jobs;
    } catch (error: any) {
      console.log(`[CareerScraper] AI scraping failed for ${company.name}:`, error.message);
      return [];
    }
  }

  /**
   * Use Groq AI to extract job listings from HTML content
   */
  private async extractJobsWithAI(html: string, company: CompanyCareerPage): Promise<ScrapedJob[]> {
    if (!this.groq) return [];

    // Truncate HTML to fit in context window
    const truncatedHtml = html.slice(0, 30000);

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a job listing extractor. Extract job postings from HTML content and return them as JSON.
            Return a JSON object with a "jobs" array containing objects with these fields:
            - title (string): Job title
            - location (string): Job location
            - description (string): Brief job description (1-2 sentences)
            - skills (array): Relevant skills/technologies mentioned
            - workType (string): "remote", "hybrid", or "onsite"
            Only include actual job postings, not navigation links or other content.
            Return maximum 15 jobs. If no jobs found, return {"jobs": []}.`
          },
          {
            role: 'user',
            content: `Extract job listings from this ${company.name} careers page HTML:\n\n${truncatedHtml}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 4000
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      const jobs: ScrapedJob[] = (parsed.jobs || []).map((job: any, index: number) => ({
        id: `ai_${company.name.toLowerCase().replace(/\s+/g, '_')}_${index}_${Date.now()}`,
        title: job.title || 'Position',
        company: company.name,
        location: job.location || 'Remote',
        description: job.description || '',
        requirements: job.requirements || [],
        skills: job.skills || this.extractSkillsFromText(job.title),
        workType: job.workType || 'hybrid',
        externalUrl: company.careerUrl,
        source: 'career_page',
        postedDate: new Date().toISOString()
      }));

      return jobs;
    } catch (error: any) {
      console.error(`[CareerScraper] AI extraction error for ${company.name}:`, error.message);
      return [];
    }
  }

  /**
   * Remove duplicates based on title + company
   */
  private deduplicateJobs(jobs: ScrapedJob[]): ScrapedJob[] {
    const seen = new Set<string>();
    return jobs.filter(job => {
      const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`.replace(/\s+/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Extract skills from text using common tech keywords
   */
  private extractSkillsFromText(text: string): string[] {
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
      'React', 'Vue', 'Angular', 'Node.js', 'Django', 'Flask', 'Spring',
      'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
      'GraphQL', 'REST', 'API', 'Microservices', 'CI/CD',
      'Machine Learning', 'AI', 'Data Science', 'SQL', 'NoSQL',
      'iOS', 'Android', 'Swift', 'Kotlin', 'Flutter', 'React Native'
    ];

    const lowerText = text.toLowerCase();
    return commonSkills
      .filter(skill => lowerText.includes(skill.toLowerCase()))
      .slice(0, 8);
  }

  /**
   * Extract requirements from job description
   */
  private extractRequirements(text: string): string[] {
    const requirements: string[] = [];
    const lines = text.split(/[\n.]/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.length > 20 &&
        trimmed.length < 200 &&
        (trimmed.includes('year') ||
         trimmed.includes('experience') ||
         trimmed.includes('degree') ||
         trimmed.includes('proficiency') ||
         trimmed.includes('knowledge'))
      ) {
        requirements.push(trimmed);
      }
    }

    return requirements.slice(0, 5);
  }

  /**
   * Determine work type from location string
   */
  private determineWorkType(location: string): 'remote' | 'hybrid' | 'onsite' {
    const lower = location.toLowerCase();
    if (lower.includes('remote')) return 'remote';
    if (lower.includes('hybrid')) return 'hybrid';
    return 'onsite';
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache (for testing/manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[CareerScraper] Cache cleared');
  }
}

export const careerPageScraper = new CareerPageScraper();
