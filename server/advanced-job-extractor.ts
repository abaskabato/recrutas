/**
 * Advanced Job Extractor - Comprehensive solution for extracting specific job URLs
 * from any career website using multiple detection methods
 */

interface JobExtraction {
  title: string;
  url: string;
  jobId: string;
  confidence: number;
}

export class AdvancedJobExtractor {
  
  /**
   * Main extraction method that combines all techniques
   */
  extractSpecificJobs(html: string, baseUrl: string): JobExtraction[] {
    const jobs: JobExtraction[] = [];
    const url = new URL(baseUrl);
    
    // Method 1: JSON-LD structured data (highest confidence)
    jobs.push(...this.extractFromJsonLD(html, baseUrl));
    
    // Method 2: Data attributes and modern frameworks
    jobs.push(...this.extractFromDataAttributes(html, baseUrl));
    
    // Method 3: JavaScript variables and embedded data
    jobs.push(...this.extractFromJavaScript(html, baseUrl));
    
    // Method 4: Semantic HTML patterns
    jobs.push(...this.extractFromSemanticHTML(html, baseUrl));
    
    // Method 5: URL pattern analysis
    jobs.push(...this.extractFromURLPatterns(html, baseUrl));
    
    // Filter, deduplicate, and rank by confidence
    return this.filterAndRankResults(jobs, url.hostname);
  }

  /**
   * Extract jobs from JSON-LD structured data
   */
  private extractFromJsonLD(html: string, baseUrl: string): JobExtraction[] {
    const jobs: JobExtraction[] = [];
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
    let match;
    
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        this.parseJsonLDRecursively(data, jobs, baseUrl);
      } catch (e) {
        continue;
      }
    }
    
    return jobs;
  }
  
  private parseJsonLDRecursively(data: any, jobs: JobExtraction[], baseUrl: string): void {
    if (Array.isArray(data)) {
      data.forEach(item => this.parseJsonLDRecursively(item, jobs, baseUrl));
      return;
    }
    
    if (typeof data === 'object' && data !== null) {
      if (data['@type'] === 'JobPosting') {
        const job = this.createJobFromJsonLD(data, baseUrl);
        if (job) jobs.push(job);
      }
      
      Object.values(data).forEach(value => {
        if (typeof value === 'object') {
          this.parseJsonLDRecursively(value, jobs, baseUrl);
        }
      });
    }
  }
  
  private createJobFromJsonLD(data: any, baseUrl: string): JobExtraction | null {
    const title = data.title || data.name;
    const url = data.url || data.directApplyURL || data.applyURL;
    const jobId = data.identifier || data.jobId || this.generateJobId();
    
    if (!title || !url) return null;
    
    return {
      title: this.cleanTitle(title),
      url: this.resolveUrl(url, baseUrl),
      jobId: String(jobId),
      confidence: 0.95
    };
  }

  /**
   * Extract jobs from data attributes (React, Vue, Angular apps)
   */
  private extractFromDataAttributes(html: string, baseUrl: string): JobExtraction[] {
    const jobs: JobExtraction[] = [];
    
    const patterns = [
      // React/Next.js patterns
      /data-job-id="([^"]+)"[^>]*>.*?href="([^"]+)"[^>]*>([^<]+)/gis,
      /data-testid="[^"]*job[^"]*"[^>]*>.*?href="([^"]+)"[^>]*>([^<]+)/gis,
      // Vue.js patterns
      /v-for="[^"]*job[^"]*"[^>]*>.*?href="([^"]+)"[^>]*>([^<]+)/gis,
      // Angular patterns
      /\*ngFor="[^"]*job[^"]*"[^>]*>.*?href="([^"]+)"[^>]*>([^<]+)/gis,
      // Generic data patterns
      /data-position[^>]*href="([^"]+)"[^>]*>([^<]+)/gis
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1] || match[2];
        const title = match[2] || match[3] || match[1];
        
        if (this.isValidJobURL(url, baseUrl)) {
          jobs.push({
            title: this.cleanTitle(title),
            url: this.resolveUrl(url, baseUrl),
            jobId: this.extractJobIdFromURL(url),
            confidence: 0.85
          });
        }
      }
    });
    
    return jobs;
  }

  /**
   * Extract jobs from JavaScript variables and embedded data
   */
  private extractFromJavaScript(html: string, baseUrl: string): JobExtraction[] {
    const jobs: JobExtraction[] = [];
    
    // Common JS variable patterns
    const jsPatterns = [
      /(?:jobs|positions|openings|vacancies)\s*[:=]\s*(\[.*?\])/gis,
      /window\.__INITIAL_STATE__\s*=\s*({.*?});/gis,
      /window\.__DATA__\s*=\s*({.*?});/gis,
      /__NEXT_DATA__\s*=\s*({.*?});/gis
    ];
    
    jsPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        try {
          const data = JSON.parse(match[1]);
          this.extractJobsFromJSData(data, jobs, baseUrl);
        } catch (e) {
          continue;
        }
      }
    });
    
    return jobs;
  }
  
  private extractJobsFromJSData(data: any, jobs: JobExtraction[], baseUrl: string): void {
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item && typeof item === 'object' && (item.title || item.name) && (item.url || item.link)) {
          jobs.push({
            title: this.cleanTitle(item.title || item.name),
            url: this.resolveUrl(item.url || item.link, baseUrl),
            jobId: item.id || this.generateJobId(),
            confidence: 0.80
          });
        }
      });
    } else if (typeof data === 'object' && data !== null) {
      Object.values(data).forEach(value => {
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          this.extractJobsFromJSData(value, jobs, baseUrl);
        }
      });
    }
  }

  /**
   * Extract jobs from semantic HTML patterns
   */
  private extractFromSemanticHTML(html: string, baseUrl: string): JobExtraction[] {
    const jobs: JobExtraction[] = [];
    
    // Job listing patterns with high specificity
    const semanticPatterns = [
      // Article-based job listings
      /<article[^>]*(?:job|position)[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>([^<]+).*?<\/article>/gis,
      // List item job postings
      /<li[^>]*(?:job|position)[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>([^<]+).*?<\/li>/gis,
      // Card-based layouts
      /<div[^>]*(?:job-card|position-card)[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)/gis,
      // Table row jobs
      /<tr[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>([^<]+).*?<\/tr>/gis
    ];
    
    semanticPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1];
        const title = match[2];
        
        if (this.isValidJobURL(url, baseUrl)) {
          jobs.push({
            title: this.cleanTitle(title),
            url: this.resolveUrl(url, baseUrl),
            jobId: this.extractJobIdFromURL(url),
            confidence: 0.75
          });
        }
      }
    });
    
    return jobs;
  }

  /**
   * Extract jobs by analyzing URL patterns in links
   */
  private extractFromURLPatterns(html: string, baseUrl: string): JobExtraction[] {
    const jobs: JobExtraction[] = [];
    
    // High-confidence URL patterns
    const urlPatterns = [
      // Standard job URL patterns
      /<a[^>]*href="([^"]*\/(?:jobs|careers|positions)\/[^"\/]+\/[^"\/]+)"[^>]*>([^<]+)/gis,
      // Application URLs
      /<a[^>]*href="([^"]*\/(?:apply|application)\/[^"]+)"[^>]*>([^<]+)/gis,
      // ID-based job URLs
      /<a[^>]*href="([^"]*\/(?:job|position)\/[a-zA-Z0-9\-]{8,})"[^>]*>([^<]+)/gis
    ];
    
    urlPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1];
        const title = match[2];
        
        if (this.isValidJobURL(url, baseUrl)) {
          jobs.push({
            title: this.cleanTitle(title),
            url: this.resolveUrl(url, baseUrl),
            jobId: this.extractJobIdFromURL(url),
            confidence: 0.70
          });
        }
      }
    });
    
    return jobs;
  }

  /**
   * Validate if URL is actually a job posting
   */
  private isValidJobURL(url: string, baseUrl: string): boolean {
    if (!url || url.length < 5) return false;
    
    const urlLower = url.toLowerCase();
    
    // Exclude non-job URLs
    const excludePatterns = [
      'search', 'filter', 'department', 'location', 'about', 'contact',
      'privacy', 'terms', 'benefits', 'culture', 'diversity', 'values',
      'life-at', 'university', 'intern', 'blog', 'news', 'events'
    ];
    
    for (const exclude of excludePatterns) {
      if (urlLower.includes(exclude)) return false;
    }
    
    // Must have job indicators
    const jobIndicators = ['job', 'career', 'position', 'opening', 'apply', 'posting'];
    const hasJobPath = jobIndicators.some(indicator => urlLower.includes(indicator));
    
    // Additional validation for specific job postings
    const hasSpecificJob = /\/[a-zA-Z0-9\-]{6,}$/.test(url) || 
                          /\b(engineer|developer|manager|analyst|designer|scientist)\b/i.test(url);
    
    return hasJobPath && hasSpecificJob;
  }

  /**
   * Filter and rank results by confidence and relevance
   */
  private filterAndRankResults(jobs: JobExtraction[], hostname: string): JobExtraction[] {
    // Remove duplicates
    const seen = new Set<string>();
    const uniqueJobs = jobs.filter(job => {
      const key = `${job.url}|${job.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Sort by confidence and filter low-quality results
    return uniqueJobs
      .filter(job => job.confidence >= 0.65)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 15);
  }

  /**
   * Utility methods
   */
  private cleanTitle(title: string): string {
    return title.replace(/\s+/g, ' ').trim();
  }
  
  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http')) return url;
    const base = new URL(baseUrl);
    if (url.startsWith('//')) return base.protocol + url;
    if (url.startsWith('/')) return `${base.protocol}//${base.hostname}${url}`;
    return `${base.protocol}//${base.hostname}/${url}`;
  }
  
  private extractJobIdFromURL(url: string): string {
    const segments = url.split('/').filter(s => s.length > 0);
    return segments[segments.length - 1] || this.generateJobId();
  }
  
  private generateJobId(): string {
    return Math.random().toString(36).substr(2, 12);
  }
}

export const advancedJobExtractor = new AdvancedJobExtractor();