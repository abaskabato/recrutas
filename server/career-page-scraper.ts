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
  workdayId?: string; // For companies using Workday ATS
}

// Top tech companies with career pages to scrape
const COMPANIES_TO_SCRAPE: CompanyCareerPage[] = [
  // ============================================
  // GREENHOUSE ATS Companies (JSON API available)
  // ============================================
  // Original companies
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

  // NEW Greenhouse ATS companies (Phase 2 expansion)
  { name: 'Datadog', careerUrl: 'https://careers.datadoghq.com/', greenhouseId: 'datadog' },
  { name: 'Duolingo', careerUrl: 'https://careers.duolingo.com/', greenhouseId: 'duolingo' },
  { name: 'HashiCorp', careerUrl: 'https://www.hashicorp.com/careers', greenhouseId: 'hashicorp' },
  { name: 'Snyk', careerUrl: 'https://snyk.io/careers/', greenhouseId: 'snyk' },
  { name: 'GitLab', careerUrl: 'https://about.gitlab.com/jobs/', greenhouseId: 'gitlab' },
  { name: 'Databricks', careerUrl: 'https://databricks.com/careers', greenhouseId: 'databricks' },
  { name: 'Carta', careerUrl: 'https://carta.com/careers/', greenhouseId: 'carta' },
  { name: 'Brex', careerUrl: 'https://www.brex.com/careers', greenhouseId: 'brex' },
  { name: 'Scale AI', careerUrl: 'https://scale.com/careers', greenhouseId: 'scaleai' },
  { name: 'Deel', careerUrl: 'https://www.deel.com/careers', greenhouseId: 'deel' },
  { name: 'Remote.com', careerUrl: 'https://remote.com/careers', greenhouseId: 'remotecom' },
  { name: 'Retool', careerUrl: 'https://retool.com/careers', greenhouseId: 'retool' },
  { name: 'Benchling', careerUrl: 'https://www.benchling.com/careers/', greenhouseId: 'benchling' },
  { name: 'Mercury', careerUrl: 'https://mercury.com/careers', greenhouseId: 'mercury' },
  { name: 'Rippling', careerUrl: 'https://www.rippling.com/careers', greenhouseId: 'rippling' },
  { name: 'Anduril', careerUrl: 'https://www.anduril.com/careers/', greenhouseId: 'anduril' },
  { name: 'Cockroach Labs', careerUrl: 'https://www.cockroachlabs.com/careers/', greenhouseId: 'cockroachlabs' },
  { name: 'Amplitude', careerUrl: 'https://amplitude.com/careers', greenhouseId: 'amplitude' },
  { name: 'LaunchDarkly', careerUrl: 'https://launchdarkly.com/careers/', greenhouseId: 'launchdarkly' },
  { name: 'Segment', careerUrl: 'https://segment.com/careers/', greenhouseId: 'segment' },

  // ============================================
  // LEVER ATS Companies (JSON API available)
  // ============================================
  // Original companies
  { name: 'Netflix', careerUrl: 'https://jobs.netflix.com/', leverId: 'netflix' },
  { name: 'Twilio', careerUrl: 'https://www.twilio.com/company/jobs', leverId: 'twilio' },
  { name: 'Cloudflare', careerUrl: 'https://www.cloudflare.com/careers/', leverId: 'cloudflare' },

  // NEW Lever ATS companies (Phase 2 expansion)
  { name: 'Flexport', careerUrl: 'https://www.flexport.com/careers/', leverId: 'flexport' },
  { name: 'Airtable', careerUrl: 'https://airtable.com/careers', leverId: 'airtable' },
  { name: 'Webflow', careerUrl: 'https://webflow.com/careers', leverId: 'webflow' },
  { name: 'Canva', careerUrl: 'https://www.canva.com/careers/', leverId: 'canva' },
  { name: 'Loom', careerUrl: 'https://www.loom.com/careers', leverId: 'loom' },
  { name: 'Postman', careerUrl: 'https://www.postman.com/company/careers/', leverId: 'postman' },
  { name: 'Grammarly', careerUrl: 'https://www.grammarly.com/jobs', leverId: 'grammarly' },
  { name: 'Miro', careerUrl: 'https://miro.com/careers/', leverId: 'miro' },
  { name: 'Asana', careerUrl: 'https://asana.com/jobs', leverId: 'asana' },
  { name: 'Intercom', careerUrl: 'https://www.intercom.com/careers', leverId: 'intercom' },
  { name: 'Calendly', careerUrl: 'https://calendly.com/careers', leverId: 'calendly' },
  { name: 'Zapier', careerUrl: 'https://zapier.com/jobs', leverId: 'zapier' },
  { name: 'Gusto', careerUrl: 'https://gusto.com/company/careers', leverId: 'gusto' },
  { name: 'Notion', careerUrl: 'https://www.notion.so/careers', leverId: 'notionhq' },
  { name: 'Dbt Labs', careerUrl: 'https://www.getdbt.com/dbt-labs/careers/', leverId: 'daboratory' },

  // ============================================
  // WORKDAY ATS Companies (new scraping pattern)
  // ============================================
  { name: 'Salesforce', careerUrl: 'https://careers.salesforce.com/jobs', workdayId: 'salesforce' },
  { name: 'VMware', careerUrl: 'https://careers.vmware.com/main/jobs', workdayId: 'vmware' },
  { name: 'Adobe', careerUrl: 'https://careers.adobe.com/us/en/search-results', workdayId: 'adobe' },
  { name: 'Workday', careerUrl: 'https://workday.wd5.myworkdayjobs.com/Workday', workdayId: 'workday' },
  { name: 'ServiceNow', careerUrl: 'https://careers.servicenow.com/', workdayId: 'servicenow' },
  { name: 'Nvidia', careerUrl: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', workdayId: 'nvidia' },
  { name: 'Visa', careerUrl: 'https://usa.visa.com/careers.html', workdayId: 'visa' },
  { name: 'Target', careerUrl: 'https://corporate.target.com/careers', workdayId: 'target' },

  // ============================================
  // Custom career pages (AI scraping)
  // ============================================
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
  { name: 'OpenAI', careerUrl: 'https://openai.com/careers/' },
  { name: 'Anthropic', careerUrl: 'https://www.anthropic.com/careers' },
  { name: 'Palantir', careerUrl: 'https://www.palantir.com/careers/' },
  { name: 'DoorDash', careerUrl: 'https://careers.doordash.com/' },
  { name: 'Uber', careerUrl: 'https://www.uber.com/us/en/careers/' },
  { name: 'Lyft', careerUrl: 'https://www.lyft.com/careers' },
  { name: 'Pinterest', careerUrl: 'https://www.pinterestcareers.com/' },
  { name: 'Snap', careerUrl: 'https://careers.snap.com/' },
  { name: 'Reddit', careerUrl: 'https://www.redditinc.com/careers' },
];

class CareerPageScraper {
  private _groq: Groq | null = null;
  private _groqInitialized = false;
  private cache: Map<string, { jobs: ScrapedJob[], timestamp: number }> = new Map();
  private cacheTTL = 4 * 60 * 60 * 1000; // 4 hours cache (scrape 3x/day like HiringCafe)

  // Lazy-initialize Groq to ensure env vars are loaded (ESM imports hoist before dotenv.config)
  private get groq(): Groq | null {
    if (!this._groqInitialized) {
      if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== '%GROQ_API_KEY%') {
        this._groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      }
      this._groqInitialized = true;
    }
    return this._groq;
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
      // Try Workday ATS
      else if (company.workdayId) {
        jobs = await this.fetchFromWorkday(company);
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
   * Fetch jobs from Workday ATS
   * Workday uses a JSON API but with a different structure than Greenhouse/Lever
   */
  private async fetchFromWorkday(company: CompanyCareerPage): Promise<ScrapedJob[]> {
    // Workday ATS typically uses a standard endpoint pattern
    // Note: Workday APIs are often protected, so we fall back to AI scraping if the API fails
    try {
      // Try the standard Workday JSON API endpoint
      const apiUrl = company.careerUrl.includes('myworkdayjobs')
        ? `${company.careerUrl}?$expand=*`
        : company.careerUrl;

      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'RecrutasJobAggregator/1.0',
          'Accept': 'application/json, text/html'
        }
      });

      if (!response.ok) {
        // Fall back to AI scraping
        console.log(`[CareerScraper] Workday API returned ${response.status} for ${company.name}, falling back to AI scraping`);
        return this.scrapeWithAI(company);
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        // Workday response structure varies, try common patterns
        const jobListings = data.jobPostings || data.data?.jobs || data.jobs || [];

        const jobs: ScrapedJob[] = jobListings.slice(0, 20).map((job: any, index: number) => ({
          id: `workday_${company.workdayId}_${job.id || job.bulletedId || index}`,
          title: job.title || job.jobTitle || job.name || 'Position',
          company: company.name,
          location: job.location?.city || job.primaryLocation || job.locations?.[0] || 'Various',
          description: this.stripHtml(job.description || job.jobDescription || job.summary || ''),
          requirements: this.extractRequirements(job.description || ''),
          skills: this.extractSkillsFromText(job.title + ' ' + (job.description || '')),
          workType: this.determineWorkType(job.location?.city || job.primaryLocation || ''),
          externalUrl: job.externalApplyUrl || job.applyUrl || company.careerUrl,
          source: 'career_page',
          postedDate: job.postedDate || job.createdDate || new Date().toISOString()
        }));

        console.log(`[CareerScraper] Fetched ${jobs.length} jobs from ${company.name} (Workday)`);
        return jobs;
      } else {
        // HTML response, use AI scraping
        const html = await response.text();
        return this.extractJobsWithAI(html, company);
      }
    } catch (error: any) {
      console.log(`[CareerScraper] Workday fetch failed for ${company.name}:`, error.message);
      // Fall back to AI scraping
      return this.scrapeWithAI(company);
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
