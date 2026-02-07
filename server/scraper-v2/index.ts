/**
 * Scraper Orchestrator
 *
 * Main entry point for the SOTA job scraping system.
 * Coordinates scraping, deduplication, and storage.
 */

import { ScraperEngine, ScraperEngineConfig } from './engine.js';
import { DeduplicationEngine } from './utils/deduplication.js';
import { logger } from './utils/logger.js';
import {
  CompanyConfig,
  ScrapedJob,
  ScrapingResult,
} from './types.js';

export interface OrchestratorConfig {
  scraper: ScraperEngineConfig;
  deduplication: {
    enabled: boolean;
    fuzzyThreshold: number;
    timeWindowHours: number;
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
};

export class ScraperOrchestrator {
  private config: OrchestratorConfig;
  private engine: ScraperEngine;
  private deduplicator: DeduplicationEngine;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = {
      ...DEFAULT_ORCHESTRATOR_CONFIG,
      ...config,
      scraper: { ...DEFAULT_ORCHESTRATOR_CONFIG.scraper, ...config.scraper },
      deduplication: { ...DEFAULT_ORCHESTRATOR_CONFIG.deduplication, ...config.deduplication },
    };
    this.engine = new ScraperEngine(this.config.scraper);
    this.deduplicator = new DeduplicationEngine({
      fuzzyThreshold: this.config.deduplication.fuzzyThreshold,
      timeWindowHours: this.config.deduplication.timeWindowHours
    });
  }

  /**
   * Scrape a list of companies
   */
  async scrapeCompanies(companies: CompanyConfig[], signal?: AbortSignal): Promise<{
    results: ScrapingResult[];
    jobs: ScrapedJob[];
  }> {
    const startTime = Date.now();

    logger.info(`Starting batch scrape of ${companies.length} companies`);

    const results = await this.engine.scrapeCompanies(companies, signal);

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

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;

    logger.info(`Batch scrape complete`, {
      totalJobs: allJobs.length,
      uniqueJobs: finalJobs.length,
      duration: `${duration}ms`,
      successRate: `${results.length > 0 ? ((successCount / results.length) * 100).toFixed(1) : 0}%`
    });

    return { results, jobs: finalJobs };
  }
}

// Re-export types and utilities
export * from './types.js';
export { ScraperEngine } from './engine.js';
export { DeduplicationEngine } from './utils/deduplication.js';
export { logger } from './utils/logger.js';
