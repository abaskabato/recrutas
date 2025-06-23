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
    let extractedJobs: ExtractedJob[] = [];
    
    // Try company-specific extractors first
    if (hostname.includes('shopify')) {
      extractedJobs = this.extractShopifyJobs(html, sourceUrl);
    } else if (hostname.includes('stripe')) {
      extractedJobs = this.extractStripeJobs(html, sourceUrl);
    } else if (hostname.includes('airbnb')) {
      extractedJobs = this.extractAirbnbJobs(html, sourceUrl);
    } else if (hostname.includes('uber')) {
      extractedJobs = this.extractUberJobs(html, sourceUrl);
    } else if (hostname.includes('netflix')) {
      extractedJobs = this.extractNetflixJobs(html, sourceUrl);
    } else if (hostname.includes('spotify')) {
      extractedJobs = this.extractSpotifyJobs(html, sourceUrl);
    }
    
    // If company-specific extraction found jobs, use them
    if (extractedJobs.length > 0) {
      console.log(`Company-specific extraction found ${extractedJobs.length} jobs for ${hostname}`);
      return extractedJobs;
    }
    
    // Fallback to comprehensive universal extraction
    console.log(`Using universal extraction for ${hostname}`);
    return this.extractUniversalJobs(html, sourceUrl);
  }

  /**
   * Universal job extraction that works across all career sites
   */
  private extractUniversalJobs(html: string, sourceUrl: string): ExtractedJob[] {
    const jobs: ExtractedJob[] = [];
    const baseUrl = new URL(sourceUrl);
    const domain = baseUrl.hostname;
    
    // Method 1: Standard career page patterns
    const commonJobPatterns = [
      // Pattern: href="/careers/job-id" or similar
      /<a[^>]*href="([^"]*(?:careers|jobs|job|positions)[^"]*\/[^"\/]+)"[^>]*>([^<]+)<\/a>/gi,
      // Pattern: data-job-id with links
      /<a[^>]*data-job[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi,
      // Pattern: job listing containers with links
      /<div[^>]*(?:job|position)[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi,
      // Pattern: Apply now links
      /<a[^>]*href="([^"]*(?:apply|application)[^"]*)"[^>]*>.*?apply/gi
    ];
    
    for (const pattern of commonJobPatterns) {
      const matches = Array.from(html.matchAll(pattern));
      for (const match of matches) {
        const url = match[1];
        const title = match[2]?.trim() || this.extractTitleFromUrl(url);
        
        if (this.isValidJobUrl(url, domain) && title) {
          jobs.push({
            title: this.cleanTitle(title),
            url: this.resolveUrl(url, baseUrl),
            jobId: this.extractJobIdFromUrl(url)
          });
        }
      }
    }
    
    // Method 2: JSON-LD structured data extraction
    const jsonLdJobs = this.extractJsonLdJobs(html, sourceUrl);
    jobs.push(...jsonLdJobs);
    
    // Method 3: React/Next.js data attributes
    const reactJobPattern = /data-testid="[^"]*job[^"]*"[^>]*>.*?href="([^"]+)"[^>]*>([^<]+)/gi;
    const reactMatches = Array.from(html.matchAll(reactJobPattern));
    
    for (const match of reactMatches) {
      const url = match[1];
      const title = match[2]?.trim();
      
      if (this.isValidJobUrl(url, domain) && title) {
        jobs.push({
          title: this.cleanTitle(title),
          url: this.resolveUrl(url, baseUrl),
          jobId: this.extractJobIdFromUrl(url)
        });
      }
    }
    
    // Method 4: JavaScript variables extraction
    const jsJobsPattern = /(?:jobs|positions|openings)\s*[:=]\s*(\[.*?\])/gi;
    const jsMatches = Array.from(html.matchAll(jsJobsPattern));
    
    for (const match of jsMatches) {
      try {
        const jobsData = JSON.parse(match[1]);
        if (Array.isArray(jobsData)) {
          for (const job of jobsData.slice(0, 10)) {
            if (job.url && job.title) {
              jobs.push({
                title: this.cleanTitle(job.title),
                url: this.resolveUrl(job.url, baseUrl),
                jobId: job.id || this.extractJobIdFromUrl(job.url)
              });
            }
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }
    
    // Remove duplicates and return top results
    return this.deduplicateJobs(jobs).slice(0, 20);
  }

  /**
   * Extract job data from JSON-LD structured data
   */
  private extractJsonLdJobs(html: string, sourceUrl: string): ExtractedJob[] {
    const jobs: ExtractedJob[] = [];
    const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gi;
    const matches = Array.from(html.matchAll(jsonLdPattern));
    
    for (const match of matches) {
      try {
        const data = JSON.parse(match[1]);
        const jobPostings = this.extractJobPostingsFromJsonLd(data);
        
        for (const job of jobPostings) {
          if (job.title && job.url) {
            jobs.push({
              title: this.cleanTitle(job.title),
              url: job.url,
              jobId: job.identifier || this.extractJobIdFromUrl(job.url)
            });
          }
        }
      } catch (e) {
        // Invalid JSON-LD, skip
      }
    }
    
    return jobs;
  }

  /**
   * Extract job postings from JSON-LD data recursively
   */
  private extractJobPostingsFromJsonLd(data: any): any[] {
    const jobs: any[] = [];
    
    if (Array.isArray(data)) {
      for (const item of data) {
        jobs.push(...this.extractJobPostingsFromJsonLd(item));
      }
    } else if (typeof data === 'object' && data !== null) {
      if (data['@type'] === 'JobPosting') {
        jobs.push({
          title: data.title,
          url: data.url || data.applicationURL,
          identifier: data.identifier
        });
      }
      
      // Recursively search in nested objects
      for (const key in data) {
        if (typeof data[key] === 'object') {
          jobs.push(...this.extractJobPostingsFromJsonLd(data[key]));
        }
      }
    }
    
    return jobs;
  }

  /**
   * Check if URL is a valid job posting URL
   */
  private isValidJobUrl(url: string, domain: string): boolean {
    if (!url || url.length < 5) return false;
    
    const urlLower = url.toLowerCase();
    
    // Exclude common non-job URLs
    const excludePatterns = [
      '/search', '/filter', '/department', '/location', 
      '/about', '/contact', '/privacy', '/terms', '/benefits',
      '/life-at-', '/culture', '/diversity', '/university',
      '/intern', '/values', '/mission', '/story',
      'javascript:', 'mailto:', '#', 'tel:'
    ];
    
    for (const pattern of excludePatterns) {
      if (urlLower.includes(pattern)) return false;
    }
    
    // Must be specific job posting indicators
    const specificJobIndicators = [
      '/jobs/', '/careers/', '/positions/', '/openings/',
      '/apply/', '/application/', '/posting/'
    ];
    
    // Check for specific job posting patterns
    const hasJobPath = specificJobIndicators.some(indicator => urlLower.includes(indicator));
    const hasJobId = /\/[a-zA-Z0-9\-]{8,}$/.test(url); // Ends with job ID-like segment
    const hasJobKeywords = /\b(engineer|developer|manager|analyst|designer|scientist|specialist)\b/i.test(url);
    
    // Must have job path AND (job ID OR job keywords)
    return hasJobPath && (hasJobId || hasJobKeywords);
  }

  /**
   * Resolve relative URLs to absolute URLs
   */
  private resolveUrl(url: string, baseUrl: URL): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return baseUrl.protocol + url;
    if (url.startsWith('/')) return `${baseUrl.protocol}//${baseUrl.hostname}${url}`;
    return `${baseUrl.protocol}//${baseUrl.hostname}/${url}`;
  }

  /**
   * Extract job ID from URL
   */
  private extractJobIdFromUrl(url: string): string {
    const segments = url.split('/').filter(s => s.length > 0);
    return segments[segments.length - 1] || Math.random().toString(36).substr(2, 9);
  }

  /**
   * Extract title from URL if not provided
   */
  private extractTitleFromUrl(url: string): string {
    const segments = url.split('/');
    const lastSegment = segments[segments.length - 1];
    return lastSegment.replace(/[-_]/g, ' ').replace(/\.(html|php|aspx?)$/i, '');
  }

  /**
   * Remove duplicate jobs based on URL and title similarity
   */
  private deduplicateJobs(jobs: ExtractedJob[]): ExtractedJob[] {
    const seen = new Set<string>();
    return jobs.filter(job => {
      const key = `${job.url.toLowerCase()}|${job.title.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
    
    // Pattern 1: Actual job posting links (not generic pages)
    const stripeJobPatterns = [
      // Job listings with specific roles
      /<a[^>]*href="(\/jobs\/[^"]*(?:engineer|developer|manager|analyst|designer|scientist|specialist)[^"]*)"[^>]*>([^<]+)<\/a>/gi,
      // Direct job application links
      /<a[^>]*href="(\/jobs\/positions\/[^"]+)"[^>]*>([^<]+)<\/a>/gi,
      // Job ID based URLs
      /<a[^>]*href="(\/jobs\/[a-zA-Z0-9\-]{8,})"[^>]*>([^<]+)<\/a>/gi
    ];
    
    for (const pattern of stripeJobPatterns) {
      const matches = Array.from(html.matchAll(pattern));
      
      for (const match of matches) {
        const url = match[1];
        const title = match[2]?.trim();
        
        if (title && url && this.isValidJobUrl(url, 'stripe.com')) {
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