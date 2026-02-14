/**
 * SOTA Scraper Orchestrator
 * 
 * The main entry point that coordinates:
 * 1. Company Discovery - finds companies to scrape
 * 2. ATS Detection - determines the ATS type
 * 3. Queue System - manages scraping jobs with priorities
 * 4. Multi-strategy Scraping - API → HTML → AI
 * 5. AI Extraction - extracts structured job data
 * 
 * This is the foundation for scalable job scraping.
 */

import { companyDiscoveryService } from './company-discovery.service';
import { 
  addScrapeJobs, 
  initializeQueues, 
  registerWorker, 
  getAllQueueStats,
  cleanup,
  ScrapeJob,
  JobResult,
} from './scraper-queue.service';
import { aiExtractionPipeline, RawJobData } from './ai-extraction.service';
import { jobIngestionService } from './job-ingestion.service';
import { Job } from 'bullmq';

export interface ScrapingConfig {
  maxCompanies?: number;
  priority?: 'high' | 'normal' | 'low';
  useAI?: boolean;
  batchSize?: number;
}

export interface ScrapingStats {
  companiesQueued: number;
  companiesCompleted: number;
  companiesFailed: number;
  jobsFound: number;
  queueStats: Record<string, any>;
}

// ============================================================================
// Helper Functions (defined first)
// ============================================================================

/**
 * Scrape from Greenhouse API
 */
async function scrapeGreenhouse(boardToken: string): Promise<RawJobData[]> {
  try {
    const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecrutasBot/1.0)',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as any;
    
    return (data.jobs || []).map((job: any) => ({
      title: job.title,
      company: job.board?.name || '',
      location: job.location?.name || '',
      description: job.content || '',
      url: job.absolute_url || '',
    }));
  } catch (error) {
    console.error(`[Greenhouse] Failed:`, error);
    return [];
  }
}

/**
 * Scrape from Lever API
 */
async function scrapeLever(boardToken: string): Promise<RawJobData[]> {
  try {
    const response = await fetch(`https://api.lever.co/v0/postings/${boardToken}?mode=json`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as any;
    
    return (data || []).map((job: any) => ({
      title: job.text,
      company: job.categories?.company || '',
      location: job.categories?.location || '',
      description: job.descriptionPlain || job.description || '',
      url: job.absolute_url || '',
    }));
  } catch (error) {
    console.error(`[Lever] Failed:`, error);
    return [];
  }
}

/**
 * Scrape from Workday (usually requires authentication, fallback to HTML)
 */
async function scrapeWorkday(careerUrl: string): Promise<RawJobData[]> {
  return scrapeWithAI(careerUrl);
}

/**
 * Scrape with AI extraction (for custom/unknown ATS)
 */
async function scrapeWithAI(careerUrl: string): Promise<RawJobData[]> {
  try {
    const response = await fetch(careerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecrutasBot/1.0)',
      },
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    
    return [{
      url: careerUrl,
      rawHtml: html.slice(0, 10000),
    }];
  } catch (error) {
    console.error(`[AI Scrape] Failed:`, error);
    return [];
  }
}

// ============================================================================
// Main Scrape Function
// ============================================================================

/**
 * Multi-strategy scraper that tries:
 * 1. API (Greenhouse/Lever/Workday)
 * 2. HTML scraping
 * 3. AI extraction
 */
async function scrapeCompany(job: Job): Promise<JobResult> {
  const startTime = Date.now();
  const data = job.data as ScrapeJob;
  const errors: string[] = [];
  let jobsFound = 0;

  try {
    console.log(`[Orchestrator] Scraping: ${data.companyName} (${data.atsType})`);

    // Strategy based on ATS type
    let rawJobs: RawJobData[] = [];

    switch (data.atsType) {
      case 'greenhouse':
        rawJobs = await scrapeGreenhouse(data.atsId!);
        break;
      case 'lever':
        rawJobs = await scrapeLever(data.atsId!);
        break;
      case 'workday':
        rawJobs = await scrapeWorkday(data.careerUrl);
        break;
      default:
        rawJobs = await scrapeWithAI(data.careerUrl);
    }

    // If no jobs from API/HTML, try AI extraction
    if (rawJobs.length === 0 && data.atsType !== 'greenhouse' && data.atsType !== 'lever') {
      rawJobs = await scrapeWithAI(data.careerUrl);
    }

    // Use AI to extract structured data
    if (rawJobs.length > 0) {
      const extraction = await aiExtractionPipeline.extract(rawJobs);
      jobsFound = extraction.jobs.length;

      // Ingest to database
      if (extraction.jobs.length > 0) {
        try {
          const workTypeMap: Record<string, 'remote' | 'hybrid' | 'onsite'> = {
            remote: 'remote',
            hybrid: 'hybrid',
            onsite: 'onsite',
            unknown: 'onsite',
          };
          
          const stats = await jobIngestionService.ingestExternalJobs(
            extraction.jobs.map(job => ({
              title: job.title,
              company: job.company,
              location: job.location,
              description: job.description,
              requirements: job.requirements,
              skills: job.skills,
              externalUrl: job.applicationUrl,
              source: `sota-${data.atsType}`,
              workType: workTypeMap[job.remoteType] || 'onsite',
              externalId: job.applicationUrl || `sota-${Date.now()}`,
              postedDate: new Date().toISOString(),
              salaryMin: job.salaryMin,
              salaryMax: job.salaryMax,
            }))
          );
          console.log(`[Orchestrator] Ingested: ${stats.inserted} new, ${stats.duplicates} dupes`);
        } catch (ingestError) {
          console.error(`[Orchestrator] Ingestion failed:`, ingestError);
          errors.push(`Ingestion failed: ${ingestError}`);
        }
      }
    }

    return {
      success: jobsFound > 0,
      jobsFound,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error(`[Orchestrator] Failed to scrape ${data.companyName}:`, error);
    return {
      success: false,
      jobsFound: 0,
      errors: [String(error)],
      duration: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Orchestrator Class
// ============================================================================

/**
 * Main orchestrator class
 */
export class SotaScraperOrchestrator {
  private initialized = false;

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[Orchestrator] Initializing SOTA Scraper...');

    // Initialize queues
    await initializeQueues();

    // Register worker for scraping
    registerWorker('scraping', scrapeCompany);

    this.initialized = true;
    console.log('[Orchestrator] Initialization complete');
  }

  /**
   * Start scraping with discovered companies
   */
  async startScraping(config: ScrapingConfig = {}): Promise<ScrapingStats> {
    await this.initialize();

    const maxCompanies = config.maxCompanies || 100;
    const priority = config.priority || 'normal';

    console.log(`[Orchestrator] Starting scrape for ${maxCompanies} companies (priority: ${priority})`);

    // Generate company list
    const companies = companyDiscoveryService.generateScrapableList();
    const companiesToScrape = companies.slice(0, maxCompanies);

    // Create scrape jobs
    const jobs: ScrapeJob[] = companiesToScrape.map(company => ({
      companyId: company.name.toLowerCase().replace(/\s+/g, '-'),
      companyName: company.name,
      careerUrl: company.careerUrl,
      atsType: company.atsType as any,
      atsId: company.atsId,
      priority,
    }));

    // Add to queue
    await addScrapeJobs(jobs);

    console.log(`[Orchestrator] Queued ${jobs.length} companies for scraping`);

    return {
      companiesQueued: jobs.length,
      companiesCompleted: 0,
      companiesFailed: 0,
      jobsFound: 0,
      queueStats: await getAllQueueStats(),
    };
  }

  /**
   * Get current stats
   */
  async getStats(): Promise<ScrapingStats> {
    const queueStats = await getAllQueueStats();
    
    return {
      companiesQueued: queueStats.scraping?.waiting || 0,
      companiesCompleted: queueStats.scraping?.completed || 0,
      companiesFailed: queueStats.scraping?.failed || 0,
      jobsFound: 0,
      queueStats,
    };
  }

  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    await cleanup();
    this.initialized = false;
    console.log('[Orchestrator] Shutdown complete');
  }
}

// Export singleton
export const sotaScraperOrchestrator = new SotaScraperOrchestrator();

// ============================================================================
// CLI
// ============================================================================

async function main() {
  console.log('[CLI] Starting SOTA Scraper...');
  
  const orchestrator = new SotaScraperOrchestrator();
  
  try {
    const stats = await orchestrator.startScraping({
      maxCompanies: parseInt(process.argv[2] || '50'),
      priority: (process.argv[3] as any) || 'normal',
    });
    
    console.log('[CLI] Stats:', JSON.stringify(stats, null, 2));
    
    // Keep running
    setInterval(async () => {
      const currentStats = await orchestrator.getStats();
      console.log('[CLI] Current Stats:', JSON.stringify(currentStats, null, 2));
    }, 30000);
    
  } catch (error) {
    console.error('[CLI] Error:', error);
    await orchestrator.shutdown();
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1]?.includes('sota-orchestrator')) {
  main();
}
