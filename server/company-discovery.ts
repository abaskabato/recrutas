/**
 * Company Discovery Pipeline
 *
 * Automatically discovers new companies to scrape by:
 * - Monitoring job postings for new company names
 * - Detecting ATS type from career page URL patterns
 * - Queueing companies for review/scraper addition
 *
 * Based on HiringCafe's approach of continuously expanding coverage
 */

import { db } from './db';
import { jobPostings } from '@shared/schema';
import { sql, isNotNull, ne } from 'drizzle-orm';

// ATS detection patterns
const ATS_PATTERNS = {
  greenhouse: [
    /boards\.greenhouse\.io/i,
    /greenhouse\.io\/[\w-]+\/jobs/i,
    /jobs\.greenhouse\.io/i
  ],
  lever: [
    /jobs\.lever\.co/i,
    /lever\.co\/[\w-]+/i
  ],
  workday: [
    /myworkdayjobs\.com/i,
    /workday\.com.*careers/i,
    /\.wd\d+\.myworkdayjobs/i
  ],
  ashby: [
    /jobs\.ashbyhq\.com/i,
    /ashbyhq\.com\/[\w-]+/i
  ],
  bamboohr: [
    /[\w-]+\.bamboohr\.com\/careers/i,
    /bamboohr\.com\/hiring/i
  ],
  icims: [
    /icims\.com/i,
    /careers-[\w-]+\.icims\.com/i
  ],
  jobvite: [
    /jobs\.jobvite\.com/i,
    /[\w-]+\.jobvite\.com/i
  ],
  smartrecruiters: [
    /jobs\.smartrecruiters\.com/i,
    /careers\.smartrecruiters\.com/i
  ],
  taleo: [
    /taleo\.net/i,
    /[\w-]+\.taleo\.net/i
  ],
  successfactors: [
    /successfactors\.com/i,
    /jobs\.sap\.com/i
  ]
};

// Companies we already scrape (to avoid duplicates)
const KNOWN_COMPANIES = new Set([
  'stripe', 'airbnb', 'discord', 'figma', 'notion', 'coinbase', 'instacart',
  'robinhood', 'plaid', 'ramp', 'netflix', 'twilio', 'cloudflare', 'google',
  'microsoft', 'apple', 'amazon', 'meta', 'spotify', 'shopify', 'github',
  'linear', 'vercel', 'supabase', 'datadog', 'duolingo', 'hashicorp', 'snyk',
  'gitlab', 'databricks', 'carta', 'brex', 'scale ai', 'deel', 'remote.com',
  'retool', 'benchling', 'mercury', 'rippling', 'anduril', 'cockroach labs',
  'amplitude', 'launchdarkly', 'segment', 'flexport', 'airtable', 'webflow',
  'canva', 'loom', 'postman', 'grammarly', 'miro', 'asana', 'intercom',
  'calendly', 'zapier', 'gusto', 'dbt labs', 'salesforce', 'vmware', 'adobe',
  'workday', 'servicenow', 'nvidia', 'visa', 'target', 'openai', 'anthropic',
  'palantir', 'doordash', 'uber', 'lyft', 'pinterest', 'snap', 'reddit'
]);

interface DiscoveredCompany {
  name: string;
  normalizedName: string;
  careerPageUrl?: string;
  detectedAts?: string;
  jobCount: number;
  firstSeen: Date;
  lastSeen: Date;
  status: 'pending' | 'approved' | 'rejected' | 'in_scraper';
}

interface CompanyDiscoveryStats {
  totalDiscovered: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  byAtsType: Record<string, number>;
}

class CompanyDiscoveryPipeline {
  private discoveredCompanies: Map<string, DiscoveredCompany> = new Map();
  private discoveryInterval: NodeJS.Timeout | null = null;

  /**
   * Start the discovery pipeline
   */
  start(): void {
    console.log('[CompanyDiscovery] Starting company discovery pipeline...');

    // Run initial discovery
    this.runDiscovery().catch(console.error);

    // Schedule periodic discovery every 24 hours
    this.discoveryInterval = setInterval(() => {
      this.runDiscovery().catch(console.error);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Stop the discovery pipeline
   */
  stop(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    console.log('[CompanyDiscovery] Stopped company discovery pipeline');
  }

  /**
   * Run the discovery process
   */
  async runDiscovery(): Promise<void> {
    console.log('[CompanyDiscovery] Running company discovery...');

    try {
      // Get unique companies from recent job postings
      const recentCompanies = await this.getUniqueCompaniesFromJobs();
      console.log(`[CompanyDiscovery] Found ${recentCompanies.length} unique companies in job postings`);

      let newCompanies = 0;

      for (const companyData of recentCompanies) {
        const normalizedName = this.normalizeCompanyName(companyData.company);

        // Skip if already known
        if (KNOWN_COMPANIES.has(normalizedName)) {
          continue;
        }

        // Skip if already discovered
        if (this.discoveredCompanies.has(normalizedName)) {
          // Update last seen and job count
          const existing = this.discoveredCompanies.get(normalizedName)!;
          existing.lastSeen = new Date();
          existing.jobCount = Math.max(existing.jobCount, companyData.count);
          continue;
        }

        // Detect ATS type from career page URL if available
        const atsType = companyData.careerPageUrl
          ? this.detectAtsType(companyData.careerPageUrl)
          : undefined;

        // Add to discovered companies
        const discovered: DiscoveredCompany = {
          name: companyData.company,
          normalizedName,
          careerPageUrl: companyData.careerPageUrl,
          detectedAts: atsType,
          jobCount: companyData.count,
          firstSeen: new Date(),
          lastSeen: new Date(),
          status: 'pending'
        };

        this.discoveredCompanies.set(normalizedName, discovered);
        newCompanies++;
      }

      console.log(`[CompanyDiscovery] Discovered ${newCompanies} new companies`);

      // Auto-approve companies with high job counts and known ATS
      await this.autoApproveHighValueCompanies();

    } catch (error) {
      console.error('[CompanyDiscovery] Error during discovery:', error);
    }
  }

  /**
   * Get unique companies from job postings
   */
  private async getUniqueCompaniesFromJobs(): Promise<Array<{ company: string; count: number; careerPageUrl?: string }>> {
    const result = await db.select({
      company: jobPostings.company,
      count: sql<number>`count(*)`,
      careerPageUrl: sql<string>`max(${jobPostings.careerPageUrl})`
    })
    .from(jobPostings)
    .where(isNotNull(jobPostings.company))
    .groupBy(jobPostings.company)
    .having(sql`count(*) >= 1`);

    return result.map(row => ({
      company: row.company,
      count: Number(row.count),
      careerPageUrl: row.careerPageUrl || undefined
    }));
  }

  /**
   * Normalize company name for comparison
   */
  private normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/,?\s*(inc|llc|ltd|corp|corporation|co|company)\.?$/i, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Detect ATS type from career page URL
   */
  detectAtsType(url: string): string | undefined {
    for (const [atsName, patterns] of Object.entries(ATS_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          return atsName;
        }
      }
    }
    return undefined;
  }

  /**
   * Auto-approve companies with high job counts and known ATS
   */
  private async autoApproveHighValueCompanies(): Promise<void> {
    const MIN_JOB_COUNT_FOR_AUTO_APPROVE = 5;
    const ATS_WITH_API = new Set(['greenhouse', 'lever']);

    let autoApproved = 0;

    for (const [name, company] of this.discoveredCompanies.entries()) {
      if (company.status !== 'pending') continue;

      // Auto-approve if:
      // 1. Has many job postings (indicates significant hiring)
      // 2. Uses an ATS we can easily integrate with
      if (
        company.jobCount >= MIN_JOB_COUNT_FOR_AUTO_APPROVE &&
        company.detectedAts &&
        ATS_WITH_API.has(company.detectedAts)
      ) {
        company.status = 'approved';
        autoApproved++;
      }
    }

    if (autoApproved > 0) {
      console.log(`[CompanyDiscovery] Auto-approved ${autoApproved} companies`);
    }
  }

  /**
   * Get all discovered companies
   */
  getDiscoveredCompanies(): DiscoveredCompany[] {
    return Array.from(this.discoveredCompanies.values());
  }

  /**
   * Get companies pending review
   */
  getPendingCompanies(): DiscoveredCompany[] {
    return this.getDiscoveredCompanies()
      .filter(c => c.status === 'pending')
      .sort((a, b) => b.jobCount - a.jobCount);
  }

  /**
   * Get approved companies ready to add to scraper
   */
  getApprovedCompanies(): DiscoveredCompany[] {
    return this.getDiscoveredCompanies()
      .filter(c => c.status === 'approved')
      .sort((a, b) => b.jobCount - a.jobCount);
  }

  /**
   * Approve a company for scraping
   */
  approveCompany(normalizedName: string): boolean {
    const company = this.discoveredCompanies.get(normalizedName);
    if (company && company.status === 'pending') {
      company.status = 'approved';
      return true;
    }
    return false;
  }

  /**
   * Reject a company from scraping
   */
  rejectCompany(normalizedName: string): boolean {
    const company = this.discoveredCompanies.get(normalizedName);
    if (company && company.status === 'pending') {
      company.status = 'rejected';
      return true;
    }
    return false;
  }

  /**
   * Mark a company as added to the scraper
   */
  markAsInScraper(normalizedName: string): boolean {
    const company = this.discoveredCompanies.get(normalizedName);
    if (company) {
      company.status = 'in_scraper';
      KNOWN_COMPANIES.add(normalizedName);
      return true;
    }
    return false;
  }

  /**
   * Get discovery statistics
   */
  getStatistics(): CompanyDiscoveryStats {
    const companies = this.getDiscoveredCompanies();
    const byAtsType: Record<string, number> = {};

    for (const company of companies) {
      if (company.detectedAts) {
        byAtsType[company.detectedAts] = (byAtsType[company.detectedAts] || 0) + 1;
      }
    }

    return {
      totalDiscovered: companies.length,
      pendingReview: companies.filter(c => c.status === 'pending').length,
      approved: companies.filter(c => c.status === 'approved').length,
      rejected: companies.filter(c => c.status === 'rejected').length,
      byAtsType
    };
  }

  /**
   * Generate scraper configuration for approved companies
   */
  generateScraperConfig(): string {
    const approved = this.getApprovedCompanies();
    const configs: string[] = [];

    for (const company of approved) {
      let config = `{ name: '${company.name}', careerUrl: '${company.careerPageUrl || ''}'`;

      if (company.detectedAts === 'greenhouse') {
        // Extract greenhouse ID from URL or use normalized name
        const greenhouseId = this.extractGreenhouseId(company.careerPageUrl || '') || company.normalizedName.replace(/\s+/g, '');
        config += `, greenhouseId: '${greenhouseId}'`;
      } else if (company.detectedAts === 'lever') {
        const leverId = this.extractLeverId(company.careerPageUrl || '') || company.normalizedName.replace(/\s+/g, '');
        config += `, leverId: '${leverId}'`;
      } else if (company.detectedAts === 'workday') {
        const workdayId = company.normalizedName.replace(/\s+/g, '');
        config += `, workdayId: '${workdayId}'`;
      }

      config += ' },';
      configs.push(config);
    }

    return configs.join('\n');
  }

  /**
   * Extract Greenhouse ID from URL
   */
  private extractGreenhouseId(url: string): string | null {
    const match = url.match(/boards\.greenhouse\.io\/(\w+)/i) ||
                  url.match(/greenhouse\.io\/(\w+)\/jobs/i);
    return match ? match[1] : null;
  }

  /**
   * Extract Lever ID from URL
   */
  private extractLeverId(url: string): string | null {
    const match = url.match(/jobs\.lever\.co\/(\w+)/i) ||
                  url.match(/lever\.co\/(\w+)/i);
    return match ? match[1] : null;
  }

  /**
   * Find career page URL for a company using common patterns
   */
  async findCareerPageUrl(companyName: string): Promise<string | null> {
    const normalizedName = companyName.toLowerCase().replace(/\s+/g, '');

    // Common career page URL patterns
    const urlPatterns = [
      `https://${normalizedName}.com/careers`,
      `https://careers.${normalizedName}.com`,
      `https://www.${normalizedName}.com/careers`,
      `https://jobs.${normalizedName}.com`,
      `https://${normalizedName}.com/jobs`,
      `https://boards.greenhouse.io/${normalizedName}`,
      `https://jobs.lever.co/${normalizedName}`
    ];

    for (const url of urlPatterns) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'RecrutasJobAggregator/1.0' }
        });

        if (response.ok) {
          return url;
        }
      } catch {
        // URL not reachable, try next
      }
    }

    return null;
  }
}

// Export singleton instance
export const companyDiscoveryPipeline = new CompanyDiscoveryPipeline();
