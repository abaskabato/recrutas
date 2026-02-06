/**
 * SOTA Scraper Engine
 * 
 * Core scraping orchestrator that implements multiple extraction strategies
 * and intelligently selects the best method for each company.
 */

import { 
  ScrapedJob, 
  CompanyConfig, 
  ScrapingResult, 
  ScrapingError, 
  ScrapeMethod,
  ScrapingMetrics,
  QueueStats,
  JobSource,
  ATSType
} from './types.js';
import { RateLimiter } from './utils/rate-limiter.js';
import { AntiDetection } from './utils/anti-detection.js';
import { logger } from './utils/logger.js';
import { extractJsonLdJobs } from './strategies/json-ld.js';
import { extractDataIslandJobs } from './strategies/data-island.js';
import { extractHtmlJobs } from './strategies/html-parsing.js';
import { extractWithAI } from './strategies/ai-extraction.js';
import { scrapeWithBrowser } from './strategies/browser-automation.js';
import { fetchFromATS } from './strategies/ats-apis.js';
import { normalizeJob, calculateJobHash } from './utils/normalization.js';

export interface ScraperEngineConfig {
  // Concurrency
  maxConcurrent: number;
  batchSize: number;
  
  // Timeouts
  requestTimeout: number;
  totalTimeout: number;
  
  // Retries
  maxRetries: number;
  retryDelay: number;
  
  // Features
  enableAI: boolean;
  enableBrowser: boolean;
  useProxies: boolean;
  
  // Rate limiting
  globalRateLimit: {
    requestsPerMinute: number;
    burstSize: number;
  };
}

const DEFAULT_CONFIG: ScraperEngineConfig = {
  maxConcurrent: 10,
  batchSize: 5,
  requestTimeout: 30000,
  totalTimeout: 120000,
  maxRetries: 3,
  retryDelay: 1000,
  enableAI: true,
  enableBrowser: true,
  useProxies: false,
  globalRateLimit: {
    requestsPerMinute: 60,
    burstSize: 10
  }
};

export class ScraperEngine {
  private config: ScraperEngineConfig;
  private rateLimiter: RateLimiter;
  private antiDetection: AntiDetection;
  private metrics: ScrapingMetrics[] = [];
  private activeJobs = new Map<string, AbortController>();

  constructor(config: Partial<ScraperEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rateLimiter = new RateLimiter(this.config.globalRateLimit);
    this.antiDetection = new AntiDetection();
  }

  /**
   * Scrape a single company using the optimal strategy
   */
  async scrapeCompany(company: CompanyConfig): Promise<ScrapingResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    this.activeJobs.set(company.id, controller);

    try {
      logger.info(`Starting scrape for ${company.name}`, { companyId: company.id });

      // Try strategies in order of preference
      const strategies = company.scrapeConfig.strategies;
      let lastError: ScrapingError | undefined;
      let jobs: ScrapedJob[] = [];
      let successfulMethod: ScrapeMethod | undefined;

      for (const method of strategies) {
        try {
          jobs = await this.executeStrategy(method, company, controller.signal);
          
          if (jobs.length > 0) {
            successfulMethod = method;
            logger.info(`Successfully scraped ${company.name} using ${method}`, {
              companyId: company.id,
              jobCount: jobs.length,
              method
            });
            break;
          }
        } catch (error) {
          lastError = this.createError(error);
          logger.warn(`Strategy ${method} failed for ${company.name}`, {
            companyId: company.id,
            error: lastError
          });
          
          // Don't retry if blocked or rate limited
          if (lastError.type === 'blocked' || lastError.type === 'rate_limit') {
            break;
          }
        }
      }

      // Process and normalize jobs
      const processedJobs = await this.processJobs(jobs, company);

      const duration = Date.now() - startTime;
      
      return {
        companyId: company.id,
        companyName: company.name,
        success: processedJobs.length > 0,
        jobs: processedJobs,
        newJobs: processedJobs.filter(j => j.status === 'active').length,
        updatedJobs: 0, // Will be calculated by store
        removedJobs: 0, // Will be calculated by store
        duration,
        timestamp: new Date(),
        method: successfulMethod || 'html_parsing',
        error: processedJobs.length === 0 ? lastError : undefined,
        metadata: {
          pagesScraped: 1, // TODO: Track actual pages
          requestsMade: strategies.length,
          bytesDownloaded: 0, // TODO: Track bytes
          rateLimited: lastError?.type === 'rate_limit'
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        companyId: company.id,
        companyName: company.name,
        success: false,
        jobs: [],
        newJobs: 0,
        updatedJobs: 0,
        removedJobs: 0,
        duration,
        timestamp: new Date(),
        method: 'html_parsing',
        error: this.createError(error),
        metadata: {
          pagesScraped: 0,
          requestsMade: 0,
          bytesDownloaded: 0,
          rateLimited: false
        }
      };
    } finally {
      this.activeJobs.delete(company.id);
    }
  }

  /**
   * Execute a specific scraping strategy
   */
  private async executeStrategy(
    method: ScrapeMethod, 
    company: CompanyConfig,
    signal: AbortSignal
  ): Promise<ScrapedJob[]> {
    await this.rateLimiter.acquire(company.id);

    switch (method) {
      case 'api':
        if (company.ats) {
          return await fetchFromATS(company);
        }
        throw new Error('API strategy requires ATS configuration');

      case 'json_ld':
        return await extractJsonLdJobs(company, this.getFetchOptions(company));

      case 'data_island':
        return await extractDataIslandJobs(company, this.getFetchOptions(company));

      case 'html_parsing':
        return await extractHtmlJobs(company, this.getFetchOptions(company));

      case 'ai_extraction':
        if (!this.config.enableAI) {
          throw new Error('AI extraction is disabled');
        }
        return await extractWithAI(company, this.getFetchOptions(company));

      case 'browser_automation':
        if (!this.config.enableBrowser) {
          throw new Error('Browser automation is disabled');
        }
        return await scrapeWithBrowser(company);

      default:
        throw new Error(`Unknown strategy: ${method}`);
    }
  }

  /**
   * Get fetch options with anti-detection measures
   */
  private getFetchOptions(company: CompanyConfig): RequestInit {
    const headers = this.antiDetection.getHeaders(company.careerPageUrl);
    
    return {
      headers,
      signal: AbortSignal.timeout(this.config.requestTimeout),
      // Add random delay to appear more human-like
      // @ts-ignore - Next.js specific
      next: { revalidate: 0 }
    };
  }

  /**
   * Process and normalize scraped jobs
   */
  private async processJobs(jobs: ScrapedJob[], company: CompanyConfig): Promise<ScrapedJob[]> {
    const processed: ScrapedJob[] = [];

    for (const job of jobs) {
      try {
        // Normalize job data
        const normalized = await normalizeJob(job, company);
        
        // Calculate unique ID
        normalized.id = calculateJobHash(normalized);
        
        // Set source information
        normalized.source = {
          type: 'career_page',
          company: company.name,
          url: company.careerPageUrl,
          ats: company.ats?.type,
          scrapeMethod: 'html_parsing'
        };

        processed.push(normalized);
      } catch (error) {
        logger.warn(`Failed to process job from ${company.name}`, { error });
      }
    }

    return processed;
  }

  /**
   * Scrape multiple companies in parallel with rate limiting
   */
  async scrapeCompanies(companies: CompanyConfig[]): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    
    // Process in batches
    for (let i = 0; i < companies.length; i += this.config.batchSize) {
      const batch = companies.slice(i, i + this.config.batchSize);
      
      logger.info(`Processing batch ${Math.floor(i / this.config.batchSize) + 1}`, {
        batchSize: batch.length,
        totalCompanies: companies.length
      });

      const batchResults = await Promise.allSettled(
        batch.map(company => this.scrapeCompany(company))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error('Batch scrape failed', { error: result.reason });
        }
      }

      // Delay between batches
      if (i + this.config.batchSize < companies.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * Cancel an active scraping job
   */
  cancelScrape(companyId: string): boolean {
    const controller = this.activeJobs.get(companyId);
    if (controller) {
      controller.abort();
      this.activeJobs.delete(companyId);
      return true;
    }
    return false;
  }

  /**
   * Get current scraping metrics
   */
  getMetrics(): ScrapingMetrics {
    const recentMetrics = this.metrics.slice(-100);
    
    return {
      timestamp: new Date(),
      totalJobsScraped: recentMetrics.reduce((sum, m) => sum + m.totalJobsScraped, 0),
      successRate: this.calculateSuccessRate(recentMetrics),
      averageLatency: this.calculateAverageLatency(recentMetrics),
      errorsByType: this.aggregateErrors(recentMetrics),
      topSources: this.getTopSources(recentMetrics),
      companiesScraped: recentMetrics.length,
      activeJobs: this.activeJobs.size,
      newJobs: recentMetrics.reduce((sum, m) => sum + m.newJobs, 0)
    };
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    return {
      pending: 0, // TODO: Implement queue
      running: this.activeJobs.size,
      completed: this.metrics.length,
      failed: this.metrics.filter(m => m.successRate < 0.5).length,
      averageWaitTime: 0,
      averageProcessingTime: this.calculateAverageLatency(this.metrics)
    };
  }

  // Helper methods
  private createError(error: unknown): ScrapingError {
    const message = error instanceof Error ? error.message : String(error);
    
    let type: ScrapingError['type'] = 'unknown';
    let retryable = true;

    if (message.includes('rate limit') || message.includes('429')) {
      type = 'rate_limit';
      retryable = true;
    } else if (message.includes('blocked') || message.includes('403') || message.includes('captcha')) {
      type = 'blocked';
      retryable = false;
    } else if (message.includes('timeout')) {
      type = 'timeout';
      retryable = true;
    } else if (message.includes('parse') || message.includes('JSON')) {
      type = 'parse';
      retryable = false;
    } else if (message.includes('network') || message.includes('fetch')) {
      type = 'network';
      retryable = true;
    }

    return {
      type,
      message,
      retryable,
      timestamp: new Date()
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateSuccessRate(metrics: ScrapingMetrics[]): number {
    if (metrics.length === 0) return 1;
    return metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length;
  }

  private calculateAverageLatency(metrics: ScrapingMetrics[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.averageLatency, 0) / metrics.length;
  }

  private aggregateErrors(metrics: ScrapingMetrics[]): Record<string, number> {
    const errors: Record<string, number> = {};
    for (const metric of metrics) {
      for (const [type, count] of Object.entries(metric.errorsByType)) {
        errors[type] = (errors[type] || 0) + count;
      }
    }
    return errors;
  }

  private getTopSources(metrics: ScrapingMetrics[]): Array<{ source: string; count: number }> {
    const sourceMap = new Map<string, number>();
    
    for (const metric of metrics) {
      for (const { source, count } of metric.topSources) {
        sourceMap.set(source, (sourceMap.get(source) || 0) + count);
      }
    }

    return Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

export const scraperEngine = new ScraperEngine();
