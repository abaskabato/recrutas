/**
 * Advanced Job URL Extractor
 * 
 * Extracts specific job application URLs from company career pages
 * using company-specific patterns and intelligent URL construction.
 */

export interface ExtractedJob {
  title: string;
  url: string;
  jobId?: string;
  department?: string;
}

export class JobUrlExtractor {
  
  /**
   * Extract specific job URLs from HTML content
   */
  extractJobUrls(html: string, sourceUrl: string): ExtractedJob[] {
    const hostname = new URL(sourceUrl).hostname.toLowerCase();
    
    // Use company-specific extractors first
    if (hostname.includes('shopify')) {
      return this.extractShopifyJobs(html, sourceUrl);
    } else if (hostname.includes('stripe')) {
      return this.extractStripeJobs(html, sourceUrl);
    } else if (hostname.includes('airbnb')) {
      return this.extractAirbnbJobs(html, sourceUrl);
    } else if (hostname.includes('uber')) {
      return this.extractUberJobs(html, sourceUrl);
    } else if (hostname.includes('netflix')) {
      return this.extractNetflixJobs(html, sourceUrl);
    } else if (hostname.includes('spotify')) {
      return this.extractSpotifyJobs(html, sourceUrl);
    } else {
      return this.extractGenericJobs(html, sourceUrl);
    }
  }

  /**
   * Shopify-specific job extraction
   */
  private extractShopifyJobs(html: string, sourceUrl: string): ExtractedJob[] {
    const jobs: ExtractedJob[] = [];
    
    // Pattern 1: Direct job links with IDs
    const shopifyJobPattern = /<a[^>]*href="(\/careers\/[^"]*\/([^"\/]+))"[^>]*>.*?<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi;
    const matches = Array.from(html.matchAll(shopifyJobPattern));
    
    for (const match of matches) {
      const url = match[1];
      const jobId = match[2];
      const title = match[3]?.trim();
      
      if (title && jobId && !url.includes('/search') && !url.includes('/department')) {
        jobs.push({
          title: this.cleanTitle(title),
          url: `https://www.shopify.com${url}`,
          jobId: jobId
        });
      }
    }
    
    // Pattern 2: Job cards with data attributes
    const jobCardPattern = /data-job-id="([^"]+)"[^>]*>.*?<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi;
    const cardMatches = Array.from(html.matchAll(jobCardPattern));
    
    for (const match of cardMatches) {
      const jobId = match[1];
      const title = match[2]?.trim();
      
      if (title && jobId) {
        jobs.push({
          title: this.cleanTitle(title),
          url: `https://www.shopify.com/careers/${jobId}`,
          jobId: jobId
        });
      }
    }
    
    return jobs;
  }

  /**
   * Stripe-specific job extraction
   */
  private extractStripeJobs(html: string, sourceUrl: string): ExtractedJob[] {
    const jobs: ExtractedJob[] = [];
    
    // Pattern 1: Direct job posting links
    const stripeJobPattern = /<a[^>]*href="(\/jobs\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    const matches = Array.from(html.matchAll(stripeJobPattern));
    
    for (const match of matches) {
      const url = match[1];
      const title = match[2]?.trim();
      
      if (title && url && !url.includes('/search')) {
        const jobId = url.split('/').pop();
        jobs.push({
          title: this.cleanTitle(title),
          url: `https://stripe.com${url}`,
          jobId: jobId
        });
      }
    }
    
    // Pattern 2: Job cards with structured data
    const jobStructurePattern = /<div[^>]*class="[^"]*job[^"]*"[^>]*>.*?<h[1-6][^>]*>([^<]+)<\/h[1-6]>.*?<a[^>]*href="([^"]+)"[^>]*>/gi;
    const structureMatches = Array.from(html.matchAll(jobStructurePattern));
    
    for (const match of structureMatches) {
      const title = match[1]?.trim();
      const url = match[2];
      
      if (title && url && url.includes('/jobs/')) {
        const jobId = url.split('/').pop();
        jobs.push({
          title: this.cleanTitle(title),
          url: url.startsWith('http') ? url : `https://stripe.com${url}`,
          jobId: jobId
        });
      }
    }
    
    return jobs;
  }

  /**
   * Airbnb-specific job extraction
   */
  private extractAirbnbJobs(html: string, sourceUrl: string): ExtractedJob[] {
    const jobs: ExtractedJob[] = [];
    
    // Pattern 1: Career posting links
    const airbnbJobPattern = /<a[^>]*href="([^"]*\/careers\/[^"]*\/([^"\/]+))"[^>]*>([^<]+)<\/a>/gi;
    const matches = Array.from(html.matchAll(airbnbJobPattern));
    
    for (const match of matches) {
      const url = match[1];
      const jobId = match[2];
      const title = match[3]?.trim();
      
      if (title && url && !url.includes('/department') && !url.includes('/search')) {
        jobs.push({
          title: this.cleanTitle(title),
          url: url.startsWith('http') ? url : `https://careers.airbnb.com${url}`,
          jobId: jobId
        });
      }
    }
    
    return jobs;
  }

  /**
   * Uber-specific job extraction
   */
  private extractUberJobs(html: string, sourceUrl: string): ExtractedJob[] {
    const jobs: ExtractedJob[] = [];
    
    const uberJobPattern = /<a[^>]*href="([^"]*\/careers\/[^"]*)"[^>]*>([^<]+)<\/a>/gi;
    const matches = Array.from(html.matchAll(uberJobPattern));
    
    for (const match of matches) {
      const url = match[1];
      const title = match[2]?.trim();
      
      if (title && url && url.includes('/list/')) {
        const jobId = url.split('/').pop();
        jobs.push({
          title: this.cleanTitle(title),
          url: url.startsWith('http') ? url : `https://www.uber.com${url}`,
          jobId: jobId
        });
      }
    }
    
    return jobs;
  }

  /**
   * Netflix-specific job extraction
   */
  private extractNetflixJobs(html: string, sourceUrl: string): ExtractedJob[] {
    const jobs: ExtractedJob[] = [];
    
    const netflixJobPattern = /<a[^>]*href="([^"]*\/jobs\/[^"]*)"[^>]*>([^<]+)<\/a>/gi;
    const matches = Array.from(html.matchAll(netflixJobPattern));
    
    for (const match of matches) {
      const url = match[1];
      const title = match[2]?.trim();
      
      if (title && url) {
        const jobId = url.split('/').pop();
        jobs.push({
          title: this.cleanTitle(title),
          url: url.startsWith('http') ? url : `https://jobs.netflix.com${url}`,
          jobId: jobId
        });
      }
    }
    
    return jobs;
  }

  /**
   * Spotify-specific job extraction
   */
  private extractSpotifyJobs(html: string, sourceUrl: string): ExtractedJob[] {
    const jobs: ExtractedJob[] = [];
    
    const spotifyJobPattern = /<a[^>]*href="([^"]*\/jobs\/[^"]*)"[^>]*>([^<]+)<\/a>/gi;
    const matches = Array.from(html.matchAll(spotifyJobPattern));
    
    for (const match of matches) {
      const url = match[1];
      const title = match[2]?.trim();
      
      if (title && url) {
        const jobId = url.split('/').pop();
        jobs.push({
          title: this.cleanTitle(title),
          url: url.startsWith('http') ? url : `https://www.spotifyjobs.com${url}`,
          jobId: jobId
        });
      }
    }
    
    return jobs;
  }

  /**
   * Generic job extraction for other companies
   */
  private extractGenericJobs(html: string, sourceUrl: string): ExtractedJob[] {
    const jobs: ExtractedJob[] = [];
    
    // Pattern 1: Look for specific job posting URLs
    const genericJobPatterns = [
      // Job postings with IDs in URL
      /<a[^>]*href="([^"]*(?:\/jobs?\/[^\/\s"]+|\/careers?\/[^\/\s"]+|\/positions?\/[^\/\s"]+|\/openings?\/[^\/\s"]+))"[^>]*>([^<]+)<\/a>/gi,
      // Apply buttons with specific job URLs
      /<a[^>]*href="([^"]*apply[^"]*)"[^>]*>([^<]+)<\/a>/gi,
      // Job links with greenhouse, lever, or other ATS systems
      /<a[^>]*href="([^"]*(?:greenhouse|lever|workday|bamboohr|jobvite)[^"]*)"[^>]*>([^<]+)<\/a>/gi
    ];
    
    for (const pattern of genericJobPatterns) {
      const matches = Array.from(html.matchAll(pattern));
      for (const match of matches) {
        const url = match[1];
        const title = match[2]?.trim();
        
        if (title && url && this.isValidJobUrl(url)) {
          const jobId = this.extractJobIdFromUrl(url);
          jobs.push({
            title: this.cleanTitle(title),
            url: url.startsWith('http') ? url : new URL(url, sourceUrl).href,
            jobId: jobId
          });
        }
      }
    }
    
    return jobs;
  }

  /**
   * Validate if URL looks like a specific job posting
   */
  private isValidJobUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    
    // Must contain job-related path segments
    const hasJobPath = lowerUrl.includes('/job') || 
                      lowerUrl.includes('/position') || 
                      lowerUrl.includes('/career') || 
                      lowerUrl.includes('/apply') ||
                      lowerUrl.includes('/opening');
    
    // Must not be generic pages
    const isNotGeneric = !lowerUrl.includes('/search') &&
                        !lowerUrl.includes('/filter') &&
                        !lowerUrl.includes('/department') &&
                        !lowerUrl.includes('/category') &&
                        !lowerUrl.includes('/browse') &&
                        !lowerUrl.includes('/all');
    
    // Should contain some identifier (number, UUID, or specific segment)
    const hasIdentifier = /\/[a-zA-Z0-9\-]{8,}/.test(url) || // Long alphanumeric segment
                         /\/\d+/.test(url) || // Numeric ID
                         /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/.test(url); // UUID
    
    return hasJobPath && isNotGeneric && hasIdentifier;
  }

  /**
   * Extract job ID from URL
   */
  private extractJobIdFromUrl(url: string): string | undefined {
    // Try to extract meaningful ID from URL
    const segments = url.split('/').filter(s => s.length > 0);
    
    // Look for UUID pattern
    const uuidMatch = url.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
    if (uuidMatch) return uuidMatch[0];
    
    // Look for long alphanumeric segment (likely job ID)
    for (const segment of segments.reverse()) {
      if (/^[a-zA-Z0-9\-]{6,}$/.test(segment) && !['jobs', 'careers', 'positions', 'apply'].includes(segment.toLowerCase())) {
        return segment;
      }
    }
    
    return undefined;
  }

  /**
   * Clean and normalize job title
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}

export const jobUrlExtractor = new JobUrlExtractor();