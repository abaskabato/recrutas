/**
 * SOTA Job Scraper Types and Interfaces
 * 
 * Comprehensive type definitions for a state-of-the-art job scraping system
 * that outperforms hiring.cafe through multiple extraction strategies,
 * intelligent deduplication, and rich data enrichment.
 */

// ============================================================================
// Core Job Types
// ============================================================================

export interface ScrapedJob {
  // Unique identifier (hash of normalized title + company)
  id: string;
  
  // Basic job info
  title: string;
  normalizedTitle: string;
  company: string;
  companyId?: string;
  
  // Location (normalized and geocoded)
  location: JobLocation;
  
  // Job details
  description: string;
  descriptionHtml?: string;
  requirements: JobRequirement[];
  responsibilities: string[];
  skills: string[];
  skillCategories: SkillCategory[];
  
  // Employment details
  workType: WorkType;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  
  // Compensation
  salary: SalaryInfo;
  equity?: EquityInfo;
  benefits: string[];
  
  // URLs
  externalUrl: string;
  applicationUrl?: string;
  
  // Metadata
  source: JobSource;
  postedDate: Date;
  expiresAt?: Date;
  scrapedAt: Date;
  updatedAt: Date;
  
  // Status tracking
  status: JobStatus;
  isRemote: boolean;
  visaSponsorship?: boolean;
  
  // Additional metadata
  department?: string;
  team?: string;
  reportsTo?: string;
  
  // Scoring and relevance
  relevanceScore?: number;
  freshnessScore?: number;
}

export interface JobLocation {
  raw: string;
  city?: string;
  state?: string;
  country: string;
  countryCode: string;
  postalCode?: string;
  timezone?: string;
  isRemote: boolean;
  geo?: GeoCoordinates;
  // Normalized location string for deduplication
  normalized: string;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface JobRequirement {
  type: 'education' | 'experience' | 'skill' | 'certification' | 'language' | 'other';
  description: string;
  isRequired: boolean;
  years?: number;
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface SalaryInfo {
  min?: number;
  max?: number;
  currency: string;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  // Normalized to yearly USD for comparison
  normalizedMin?: number;
  normalizedMax?: number;
  isDisclosed: boolean;
}

export interface EquityInfo {
  min?: number;
  max?: number;
  type: 'stock' | 'options' | 'rsu' | 'other';
  vestingSchedule?: string;
}

export interface JobSource {
  type: SourceType;
  company: string;
  url: string;
  ats?: ATSType;
  scrapeMethod: ScrapeMethod;
}

// ============================================================================
// Enums
// ============================================================================

export type WorkType = 'remote' | 'onsite' | 'hybrid' | 'distributed';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'staff' | 'principal' | 'executive';
export type JobStatus = 'active' | 'filled' | 'expired' | 'paused';

export type SourceType = 
  | 'career_page' 
  | 'ats_api' 
  | 'job_board' 
  | 'aggregator'
  | 'rss'
  | 'sitemap'
  | 'api';

export type ATSType = 
  | 'greenhouse' 
  | 'lever' 
  | 'workday'
  | 'ashby'
  | 'bamboohr'
  | 'smartrecruiters'
  | 'icims'
  | 'taleo'
  | 'custom';

export type ScrapeMethod = 
  | 'api'
  | 'json_ld'
  | 'data_island'
  | 'html_parsing'
  | 'ai_extraction'
  | 'browser_automation'
  | 'rss'
  | 'sitemap';

// ============================================================================
// Company Configuration
// ============================================================================

export interface CompanyConfig {
  id: string;
  name: string;
  displayName: string;
  website: string;
  careerPageUrl: string;
  
  // ATS configuration
  ats?: {
    type: ATSType;
    boardId?: string;
    apiKey?: string;
    customApiUrl?: string;
  };
  
  // Scraping configuration
  scrapeConfig: ScrapeConfig;
  
  // Company metadata
  metadata?: CompanyMetadata;
  
  // Scheduling
  scrapeFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  lastScrapedAt?: Date;
  nextScrapeAt?: Date;
  
  // Status
  isActive: boolean;
  priority: 'high' | 'medium' | 'low';
  
  // Rate limiting
  rateLimit?: {
    requestsPerMinute: number;
    concurrentRequests: number;
    retryDelay: number;
  };
}

export interface ScrapeConfig {
  // Which methods to try (in order)
  strategies: ScrapeMethod[];
  
  // Method-specific config
  selectors?: {
    jobContainer?: string;
    title?: string;
    description?: string;
    location?: string;
    postedDate?: string;
    externalUrl?: string;
  };
  
  // Pagination
  pagination?: {
    type: 'url_param' | 'cursor' | 'infinite_scroll' | 'none';
    param?: string;
    maxPages: number;
  };
  
  // Filters
  filters?: {
    departments?: string[];
    locations?: string[];
    keywords?: string[];
    excludeKeywords?: string[];
  };
  
  // Browser automation (for JS-heavy sites)
  useBrowser?: boolean;
  browserConfig?: BrowserConfig;
}

export interface BrowserConfig {
  headless: boolean;
  waitForSelector?: string;
  waitTime: number;
  scrollToBottom: boolean;
  interceptRequests: boolean;
}

export interface CompanyMetadata {
  industry?: string;
  size?: string;
  funding?: string;
  logo?: string;
  description?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
}

// ============================================================================
// Scraping Results and Errors
// ============================================================================

export interface ScrapingResult {
  companyId: string;
  companyName: string;
  success: boolean;
  jobs: ScrapedJob[];
  newJobs: number;
  updatedJobs: number;
  removedJobs: number;
  duration: number;
  timestamp: Date;
  method: ScrapeMethod;
  error?: ScrapingError;
  metadata: {
    pagesScraped: number;
    requestsMade: number;
    bytesDownloaded: number;
    rateLimited: boolean;
  };
}

export interface ScrapingError {
  type: 'network' | 'parse' | 'rate_limit' | 'authentication' | 'blocked' | 'timeout' | 'unknown';
  message: string;
  code?: string;
  retryable: boolean;
  timestamp: Date;
}

// ============================================================================
// Queue and Scheduling
// ============================================================================

export interface ScrapeJob {
  id: string;
  type: 'full_scrape' | 'incremental' | 'refresh';
  companyId: string;
  priority: number;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ScrapingResult;
  error?: ScrapingError;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  averageWaitTime: number;
  averageProcessingTime: number;
}

// ============================================================================
// Deduplication
// ============================================================================

export interface DeduplicationConfig {
  // Use embeddings for semantic similarity
  useEmbeddings: boolean;
  embeddingThreshold: number;
  
  // Exact matching fields
  exactMatchFields: string[];
  
  // Fuzzy matching threshold (0-1)
  fuzzyThreshold: number;
  
  // Time window for considering jobs as duplicates
  timeWindowHours: number;
}

export interface DuplicateGroup {
  canonicalJob: ScrapedJob;
  duplicates: ScrapedJob[];
  confidence: number;
  reason: string;
}

// ============================================================================
// Enrichment
// ============================================================================

export interface EnrichmentConfig {
  geocoding: boolean;
  companyInfo: boolean;
  salaryData: boolean;
  skillNormalization: boolean;
  titleNormalization: boolean;
}

export interface EnrichmentResult {
  jobId: string;
  enrichedFields: string[];
  before: Partial<ScrapedJob>;
  after: Partial<ScrapedJob>;
  confidence: number;
  timestamp: Date;
}

// ============================================================================
// Monitoring and Observability
// ============================================================================

export interface ScrapingMetrics {
  timestamp: Date;
  totalJobsScraped: number;
  successRate: number;
  averageLatency: number;
  errorsByType: Record<string, number>;
  topSources: Array<{ source: string; count: number }>;
  companiesScraped: number;
  activeJobs: number;
  newJobs: number;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'down';
  checks: {
    database: boolean;
    queue: boolean;
    apiKeys: boolean;
    proxies: boolean;
    aiService: boolean;
  };
  lastSuccessfulScrape: Date;
  uptime: number;
}
