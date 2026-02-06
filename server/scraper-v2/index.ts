/**
 * Scraper Orchestrator
 * 
 * Main entry point for the SOTA job scraping system.
 * Coordinates scraping, deduplication, enrichment, and storage.
 */

import { ScraperEngine, ScraperEngineConfig } from './engine.js';
import { DeduplicationEngine } from './utils/deduplication.js';
import { logger } from './utils/logger.js';
import {
  CompanyConfig,
  ScrapedJob,
  ScrapingResult,
  ScrapingMetrics,
  HealthCheck
} from './types.js';

export interface OrchestratorConfig {
  scraper: ScraperEngineConfig;
  deduplication: {
    enabled: boolean;
    fuzzyThreshold: number;
    timeWindowHours: number;
  };
  enrichment: {
    geocoding: boolean;
    companyInfo: boolean;
    skillNormalization: boolean;
  };
  storage: {
    enabled: boolean;
    batchSize: number;
  };
}

const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  scraper: {
    maxConcurrent: 10,
    batchSize: 5,
    requestTimeout: 30000,
    totalTimeout: 120000,
    maxRetries: 3,
    retryDelay: 1000,
    enableAI: true,
    enableBrowser: false, // Disabled by default due to resource usage
    useProxies: false,
    globalRateLimit: {
      requestsPerMinute: 60,
      burstSize: 10
    }
  },
  deduplication: {
    enabled: true,
    fuzzyThreshold: 0.85,
    timeWindowHours: 168
  },
  enrichment: {
    geocoding: false,
    companyInfo: false,
    skillNormalization: true
  },
  storage: {
    enabled: false,
    batchSize: 100
  }
};

export class ScraperOrchestrator {
  private config: OrchestratorConfig;
  private engine: ScraperEngine;
  private deduplicator: DeduplicationEngine;
  private isRunning = false;
  private allJobs: Map<string, ScrapedJob> = new Map();

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
    this.engine = new ScraperEngine(this.config.scraper);
    this.deduplicator = new DeduplicationEngine({
      fuzzyThreshold: this.config.deduplication.fuzzyThreshold,
      timeWindowHours: this.config.deduplication.timeWindowHours
    });
  }

  /**
   * Scrape a list of companies
   */
  async scrapeCompanies(companies: CompanyConfig[]): Promise<{
    results: ScrapingResult[];
    jobs: ScrapedJob[];
    metrics: ScrapingMetrics;
  }> {
    if (this.isRunning) {
      throw new Error('Scraping already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info(`Starting batch scrape of ${companies.length} companies`);

      // Scrape all companies
      const results = await this.engine.scrapeCompanies(companies);

      // Collect all jobs
      const allJobs: ScrapedJob[] = [];
      for (const result of results) {
        if (result.success) {
          allJobs.push(...result.jobs);
        }
      }

      // Deduplicate if enabled
      let finalJobs = allJobs;
      if (this.config.deduplication.enabled) {
        const { unique } = this.deduplicator.deduplicate(allJobs);
        finalJobs = unique;
      }

      // Update job store
      for (const job of finalJobs) {
        this.allJobs.set(job.id, job);
      }

      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;

      const metrics: ScrapingMetrics = {
        timestamp: new Date(),
        totalJobsScraped: allJobs.length,
        successRate: successCount / results.length,
        averageLatency: duration / results.length,
        errorsByType: this.aggregateErrors(results),
        topSources: this.getTopSources(allJobs),
        companiesScraped: results.length,
        activeJobs: this.allJobs.size,
        newJobs: finalJobs.length
      };

      logger.info(`Batch scrape complete`, {
        totalJobs: allJobs.length,
        uniqueJobs: finalJobs.length,
        duration: `${duration}ms`,
        successRate: `${(metrics.successRate * 100).toFixed(1)}%`
      });

      return {
        results,
        jobs: finalJobs,
        metrics
      };

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Scrape a single company
   */
  async scrapeCompany(company: CompanyConfig): Promise<{
    result: ScrapingResult;
    jobs: ScrapedJob[];
  }> {
    const result = await this.engine.scrapeCompany(company);

    // Deduplicate
    let jobs = result.jobs;
    if (this.config.deduplication.enabled && jobs.length > 0) {
      const { unique } = this.deduplicator.deduplicate(jobs);
      jobs = unique;
    }

    // Store jobs
    for (const job of jobs) {
      this.allJobs.set(job.id, job);
    }

    return { result, jobs };
  }

  /**
   * Get all stored jobs
   */
  getAllJobs(): ScrapedJob[] {
    return Array.from(this.allJobs.values());
  }

  /**
   * Get jobs by company
   */
  getJobsByCompany(companyId: string): ScrapedJob[] {
    return this.getAllJobs().filter(job => job.companyId === companyId);
  }

  /**
   * Get jobs filtered by criteria
   */
  filterJobs(criteria: {
    workType?: string;
    experienceLevel?: string;
    location?: string;
    skills?: string[];
    isRemote?: boolean;
  }): ScrapedJob[] {
    return this.getAllJobs().filter(job => {
      if (criteria.workType && job.workType !== criteria.workType) return false;
      if (criteria.experienceLevel && job.experienceLevel !== criteria.experienceLevel) return false;
      if (criteria.location && !job.location.normalized.includes(criteria.location.toLowerCase())) return false;
      if (criteria.isRemote !== undefined && job.isRemote !== criteria.isRemote) return false;
      if (criteria.skills && criteria.skills.length > 0) {
        const jobSkills = job.skills.map(s => s.toLowerCase());
        const hasMatchingSkill = criteria.skills.some(skill => 
          jobSkills.some(jobSkill => jobSkill.includes(skill.toLowerCase()))
        );
        if (!hasMatchingSkill) return false;
      }
      return true;
    });
  }

  /**
   * Search jobs by text
   */
  searchJobs(query: string): ScrapedJob[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllJobs().filter(job => {
      const searchableText = `${job.title} ${job.description} ${job.skills.join(' ')} ${job.company}`.toLowerCase();
      return searchableText.includes(lowerQuery);
    });
  }

  /**
   * Get health check status
   */
  getHealthCheck(): HealthCheck {
    const metrics = this.engine.getMetrics();
    
    return {
      status: metrics.successRate > 0.7 ? 'healthy' : metrics.successRate > 0.4 ? 'degraded' : 'down',
      checks: {
        database: true, // Would check actual DB connection
        queue: metrics.activeJobs < 20,
        apiKeys: !!process.env.GROQ_API_KEY,
        proxies: !this.config.scraper.useProxies, // If not using proxies, mark as OK
        aiService: this.config.scraper.enableAI && !!process.env.GROQ_API_KEY
      },
      lastSuccessfulScrape: new Date(),
      uptime: Date.now() // Would track actual uptime
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): ScrapingMetrics {
    return this.engine.getMetrics();
  }

  /**
   * Clear all stored jobs
   */
  clearJobs(): void {
    this.allJobs.clear();
    this.deduplicator.clear();
    logger.info('All jobs cleared');
  }

  /**
   * Check if scraping is in progress
   */
  isScraping(): boolean {
    return this.isRunning;
  }

  // Helper methods
  private aggregateErrors(results: ScrapingResult[]): Record<string, number> {
    const errors: Record<string, number> = {};
    for (const result of results) {
      if (result.error) {
        errors[result.error.type] = (errors[result.error.type] || 0) + 1;
      }
    }
    return errors;
  }

  private getTopSources(jobs: ScrapedJob[]): Array<{ source: string; count: number }> {
    const sourceMap = new Map<string, number>();
    for (const job of jobs) {
      const source = job.source.ats || job.source.type;
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    }
    return Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

// Export singleton instance
export const scraperOrchestrator = new ScraperOrchestrator();

// Re-export types and utilities
export * from './types.js';
export { ScraperEngine } from './engine.js';
export { DeduplicationEngine } from './utils/deduplication.js';
export { logger } from './utils/logger.js';
