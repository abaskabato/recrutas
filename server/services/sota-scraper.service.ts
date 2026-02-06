/**
 * SOTA Scraper Integration Layer
 * 
 * Integrates the new SOTA scraper with the existing job ingestion system.
 * This adapter converts SOTA scraper output to the format expected by
 * job-ingestion.service.ts
 */

import { scraperOrchestrator, CompanyConfig } from '../scraper-v2/index.js';
import { ScrapedJob } from '../scraper-v2/types.js';
import { jobIngestionService, ExternalJobInput } from './job-ingestion.service.js';
import { logger } from '../scraper-v2/utils/logger.js';

// Import the company list from career-page-scraper and convert to SOTA format
const LEGACY_COMPANIES = [
  // Greenhouse
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
  { name: 'Retool', careerUrl: 'https://retool.com/careers', greenhouseId: 'retool' },
  { name: 'Benchling', careerUrl: 'https://www.benchling.com/careers/', greenhouseId: 'benchling' },
  { name: 'Mercury', careerUrl: 'https://mercury.com/careers', greenhouseId: 'mercury' },
  { name: 'Rippling', careerUrl: 'https://www.rippling.com/careers', greenhouseId: 'rippling' },
  { name: 'Anduril', careerUrl: 'https://www.anduril.com/careers/', greenhouseId: 'anduril' },
  { name: 'Cockroach Labs', careerUrl: 'https://www.cockroachlabs.com/careers/', greenhouseId: 'cockroachlabs' },
  { name: 'Amplitude', careerUrl: 'https://amplitude.com/careers', greenhouseId: 'amplitude' },
  { name: 'LaunchDarkly', careerUrl: 'https://launchdarkly.com/careers/', greenhouseId: 'launchdarkly' },
  { name: 'Segment', careerUrl: 'https://segment.com/careers/', greenhouseId: 'segment' },
  
  // Lever
  { name: 'Netflix', careerUrl: 'https://jobs.netflix.com/', leverId: 'netflix' },
  { name: 'Twilio', careerUrl: 'https://www.twilio.com/company/jobs', leverId: 'twilio' },
  { name: 'Cloudflare', careerUrl: 'https://www.cloudflare.com/careers/', leverId: 'cloudflare' },
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
  
  // Workday
  { name: 'Salesforce', careerUrl: 'https://careers.salesforce.com/jobs', workdayId: 'salesforce' },
  { name: 'VMware', careerUrl: 'https://careers.vmware.com/main/jobs', workdayId: 'vmware' },
  { name: 'Adobe', careerUrl: 'https://careers.adobe.com/us/en/search-results', workdayId: 'adobe' },
  { name: 'Workday', careerUrl: 'https://workday.wd5.myworkdayjobs.com/Workday', workdayId: 'workday' },
  { name: 'ServiceNow', careerUrl: 'https://careers.servicenow.com/', workdayId: 'servicenow' },
  { name: 'Nvidia', careerUrl: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', workdayId: 'nvidia' },
  
  // Custom career pages (use AI extraction)
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

/**
 * Convert legacy company config to SOTA format
 */
function convertToSOTAConfig(legacy: any): CompanyConfig {
  const id = legacy.name.toLowerCase().replace(/\s+/g, '-');
  
  let ats = undefined;
  if (legacy.greenhouseId) {
    ats = { type: 'greenhouse' as const, boardId: legacy.greenhouseId };
  } else if (legacy.leverId) {
    ats = { type: 'lever' as const, boardId: legacy.leverId };
  } else if (legacy.workdayId) {
    ats = { type: 'workday' as const, boardId: legacy.workdayId };
  }
  
  // Determine best strategies based on ATS availability
  let strategies: string[];
  if (ats) {
    strategies = ['api', 'json_ld', 'ai_extraction'];
  } else {
    strategies = ['json_ld', 'data_island', 'ai_extraction', 'html_parsing'];
  }
  
  return {
    id,
    name: legacy.name,
    displayName: legacy.name,
    website: legacy.careerUrl,
    careerPageUrl: legacy.careerUrl,
    ats,
    scrapeConfig: {
      strategies: strategies as any,
      pagination: { type: 'none', maxPages: 1 }
    },
    scrapeFrequency: 'daily',
    isActive: true,
    priority: ats ? 'high' : 'medium'
  };
}

/**
 * Convert SOTA scraped job to ingestion format
 */
function convertToIngestionFormat(job: ScrapedJob): ExternalJobInput {
  // Generate external ID from job ID or create one
  const externalId = job.id || `${job.company}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Extract requirements as strings
  const requirements = job.requirements?.map(r => r.description) || [];
  
  // Determine work type
  const workType = (job.workType as 'remote' | 'hybrid' | 'onsite') || 'hybrid';
  
  // Get source from job metadata
  const source = job.source?.ats || job.source?.type || 'external';
  
  return {
    title: job.title,
    company: job.company,
    location: job.location?.raw || 'Remote',
    description: job.description,
    requirements,
    skills: job.skills || [],
    workType,
    salaryMin: job.salary?.min,
    salaryMax: job.salary?.max,
    source,
    externalId,
    externalUrl: job.externalUrl,
    postedDate: job.postedDate?.toISOString() || new Date().toISOString()
  };
}

export interface ScrapeResult {
  success: boolean;
  companiesScraped: number;
  totalJobsFound: number;
  jobsIngested: number;
  errors: string[];
  duration: number;
}

/**
 * SOTA Scraper Service
 * Main entry point for scraping with the new system
 */
export class SOTAScraperService {
  private companies: CompanyConfig[];

  constructor() {
    // Convert all legacy companies to SOTA format
    this.companies = LEGACY_COMPANIES.map(convertToSOTAConfig);
    logger.info(`Initialized SOTA scraper with ${this.companies.length} companies`);
  }

  /**
   * Run full scrape of all companies
   */
  async scrapeAll(): Promise<ScrapeResult> {
    const startTime = Date.now();
    const result: ScrapeResult = {
      success: true,
      companiesScraped: 0,
      totalJobsFound: 0,
      jobsIngested: 0,
      errors: [],
      duration: 0
    };

    try {
      logger.info('Starting SOTA scraper full run');
      
      // Scrape all companies
      const { results, jobs, metrics } = await scraperOrchestrator.scrapeCompanies(this.companies);
      
      result.companiesScraped = results.length;
      result.totalJobsFound = jobs.length;
      
      // Collect errors
      for (const scrapeResult of results) {
        if (scrapeResult.error) {
          result.errors.push(`${scrapeResult.companyName}: ${scrapeResult.error.message}`);
        }
      }

      // Convert and ingest jobs
      if (jobs.length > 0) {
        const ingestionInputs = jobs.map(convertToIngestionFormat);
        const ingestionStats = await jobIngestionService.ingestExternalJobs(ingestionInputs);
        result.jobsIngested = ingestionStats.inserted;
        
        logger.info(`Ingestion complete: ${ingestionStats.inserted} new, ${ingestionStats.duplicates} duplicates, ${ingestionStats.errors} errors`);
      }

      result.duration = Date.now() - startTime;
      logger.info(`SOTA scraper complete in ${result.duration}ms`, { 
        companiesScraped: result.companiesScraped,
        totalJobsFound: result.totalJobsFound,
        jobsIngested: result.jobsIngested,
        duration: result.duration
      });

    } catch (error) {
      result.success = false;
      result.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
      logger.error('SOTA scraper failed', { error });
    }

    return result;
  }

  /**
   * Scrape a specific company (for testing)
   */
  async scrapeCompany(companyId: string): Promise<ScrapeResult> {
    const company = this.companies.find(c => c.id === companyId);
    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }

    const startTime = Date.now();
    const result: ScrapeResult = {
      success: true,
      companiesScraped: 1,
      totalJobsFound: 0,
      jobsIngested: 0,
      errors: [],
      duration: 0
    };

    try {
      const { result: scrapeResult, jobs } = await scraperOrchestrator.scrapeCompany(company);
      
      result.totalJobsFound = jobs.length;
      
      if (scrapeResult.error) {
        result.errors.push(`${scrapeResult.companyName}: ${scrapeResult.error.message}`);
      }

      if (jobs.length > 0) {
        const ingestionInputs = jobs.map(convertToIngestionFormat);
        const ingestionStats = await jobIngestionService.ingestExternalJobs(ingestionInputs);
        result.jobsIngested = ingestionStats.inserted;
      }

      result.duration = Date.now() - startTime;
      
    } catch (error) {
      result.success = false;
      result.errors.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Get list of configured companies
   */
  getCompanies(): Array<{ id: string; name: string; priority: string }> {
    return this.companies.map(c => ({
      id: c.id,
      name: c.name,
      priority: c.priority
    }));
  }
}

// Export singleton instance
export const sotaScraperService = new SOTAScraperService();
