/**
 * ATS Detection Service
 * 
 * Automatically detects which ATS (Applicant Tracking System) a company uses:
 * - Greenhouse (API available)
 * - Lever (API available)
 * - Workday (API available)
 * - Custom career pages (HTML scraping needed)
 * 
 * This is critical for the multi-strategy scraping approach.
 */

export type AtsType = 'greenhouse' | 'lever' | 'workday' | 'ashby' | 'bamboohr' | 'custom' | 'unknown';

export interface AtsDetectionResult {
  atsType: AtsType;
  atsId?: string;
  careerUrl: string;
  apiAvailable: boolean;
  confidence: number;
  indicators: string[];
}

// ATS signatures - patterns that indicate the ATS type
const ATS_SIGNATURES: Record<AtsType, { domain: string[]; paths: string[]; selectors: string[] }> = {
  greenhouse: {
    domain: ['greenhouse.io', 'boards.greenhouse.io', 'greenhouse'],
    paths: ['/jobs', '/jobs/', '/careers'],
    selectors: ['#board', '.board', '[data-board]', '.greenhouse'],
  },
  lever: {
    domain: ['lever.co', 'jobs.lever.co', 'lever'],
    paths: ['/jobs', '/careers', '/workforus'],
    selectors: ['.lever', '#lever', '[data-portal-id]', '.posting-apply-button'],
  },
  workday: {
    domain: ['myworkdayjobs.com', 'wd5.myworkdayjobs.com', 'workday.com'],
    paths: ['/jobs', '/careers'],
    selectors: ['.workday', '#workday', '[data-automation-id]'],
  },
  ashby: {
    domain: ['ashbyhq.com', 'ashby.'],
    paths: ['/jobs', '/careers'],
    selectors: ['.ashby', '#ashby'],
  },
  bamboohr: {
    domain: ['bamboohr.com', 'bamboohr.co.uk'],
    paths: ['/jobs', '/careers'],
    selectors: ['.bamboohr', '#bamboohr'],
  },
  custom: {
    domain: [],
    paths: [],
    selectors: [],
  },
  unknown: {
    domain: [],
    paths: [],
    selectors: [],
  },
};

export class AtsDetectionService {
  /**
   * Detect ATS type from a career page URL
   */
  async detectFromUrl(careerUrl: string): Promise<AtsDetectionResult> {
    const url = new URL(careerUrl);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    // Check for known ATS domains
    for (const [atsType, signature] of Object.entries(ATS_SIGNATURES)) {
      if (atsType === 'custom' || atsType === 'unknown') continue;

      for (const domain of signature.domain) {
        if (hostname.includes(domain)) {
          // Try to extract ATS ID from URL
          const atsId = this.extractAtsId(atsType, careerUrl);
          
          return {
            atsType: atsType as AtsType,
            atsId,
            careerUrl,
            apiAvailable: this.isApiAvailable(atsType as AtsType),
            confidence: 0.95,
            indicators: [`Domain matches ${atsType}: ${domain}`],
          };
        }
      }
    }

    // Try to detect from HTML content
    try {
      const response = await fetch(careerUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RecrutasBot/1.0)',
        },
      });
      
      const html = await response.text();
      return this.detectFromHtml(html, careerUrl);
    } catch (error) {
      return {
        atsType: 'unknown',
        careerUrl,
        apiAvailable: false,
        confidence: 0,
        indicators: ['Could not fetch page content'],
      };
    }
  }

  /**
   * Detect ATS type from HTML content
   */
  detectFromHtml(html: string, careerUrl: string): AtsDetectionResult {
    const indicators: string[] = [];
    let detectedAts: AtsType = 'unknown';
    let highestConfidence = 0;

    for (const [atsType, signature] of Object.entries(ATS_SIGNATURES)) {
      if (atsType === 'custom' || atsType === 'unknown') continue;

      let matches = 0;

      // Check selectors
      for (const selector of signature.selectors) {
        if (html.includes(selector)) {
          matches++;
          indicators.push(`Found selector: ${selector}`);
        }
      }

      // Check for API endpoints
      const apiPatterns = this.getApiPatterns(atsType as AtsType);
      for (const pattern of apiPatterns) {
        if (html.includes(pattern)) {
          matches += 2;
          indicators.push(`Found API pattern: ${pattern}`);
        }
      }

      // Check for specific keywords
      const keywords = this.getAtsKeywords(atsType as AtsType);
      for (const keyword of keywords) {
        if (html.toLowerCase().includes(keyword.toLowerCase())) {
          matches++;
          indicators.push(`Found keyword: ${keyword}`);
        }
      }

      const confidence = Math.min(matches / 5, 1);
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        detectedAts = atsType as AtsType;
      }
    }

    // If no ATS detected, assume custom
    if (detectedAts === 'unknown' && highestConfidence === 0) {
      detectedAts = 'custom';
      highestConfidence = 0.3;
      indicators.push('No known ATS detected - likely custom career page');
    }

    return {
      atsType: detectedAts,
      careerUrl,
      apiAvailable: this.isApiAvailable(detectedAts),
      confidence: highestConfidence,
      indicators: indicators.slice(0, 5),
    };
  }

  /**
   * Extract ATS ID from URL for known ATS types
   */
  private extractAtsId(atsType: string, url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      
      switch (atsType) {
        case 'greenhouse':
          // Pattern: https://boards.greenhouse.io/{boardToken}
          if (urlObj.hostname === 'boards.greenhouse.io') {
            const ghMatch = urlObj.pathname.match(/^\/([^/]+)/);
            return ghMatch?.[1];
          }
          return undefined;

        case 'lever':
          // Pattern: https://jobs.lever.co/{boardToken}
          if (urlObj.hostname === 'jobs.lever.co') {
            const leverMatch = urlObj.pathname.match(/^\/([^/]+)/);
            return leverMatch?.[1];
          }
          return undefined;

        case 'workday':
          // Pattern: https://{company}.wd5.myworkdayjobs.com/{company}
          const wdMatch = urlObj.hostname.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com/);
          return wdMatch?.[1];
          
        default:
          return undefined;
      }
    } catch {
      return undefined;
    }
  }

  /**
   * Get API endpoint patterns for each ATS
   */
  private getApiPatterns(atsType: AtsType): string[] {
    switch (atsType) {
      case 'greenhouse':
        return [
          '/v1/boards/',
          'boards.greenhouse.io',
          'api.greenhouse.io',
          'greenhouse.io/embed',
        ];
      case 'lever':
        return [
          'api.lever.co',
          '/v1/postings/',
          'lever.co/embed',
        ];
      case 'workday':
        return [
          'workday.com',
          'myworkdayjobs.com',
          'workday/msp',
        ];
      case 'ashby':
        return [
          'ashbyhq.com',
          'api.ashbyhq.com',
        ];
      case 'bamboohr':
        return [
          'bamboohr.com',
          'api.bamboohr.com',
        ];
      default:
        return [];
    }
  }

  /**
   * Get ATS-specific keywords for detection
   */
  private getAtsKeywords(atsType: AtsType): string[] {
    switch (atsType) {
      case 'greenhouse':
        return ['Greenhouse', 'greenhouse', 'gh-api', 'board'];
      case 'lever':
        return ['Lever', 'lever', 'lever.co', 'posting'];
      case 'workday':
        return ['Workday', 'workday', 'myworkday'];
      case 'ashby':
        return ['Ashby', 'ashby', 'ashbyhq'];
      case 'bamboohr':
        return ['BambooHR', 'bamboohr', 'bamboo hr'];
      default:
        return [];
    }
  }

  /**
   * Check if API is available for this ATS type
   */
  isApiAvailable(atsType: AtsType): boolean {
    return ['greenhouse', 'lever', 'workday'].includes(atsType);
  }

  /**
   * Get the appropriate scraping strategy based on ATS type
   */
  getStrategy(atsType: AtsType): 'api' | 'html' | 'ai' {
    switch (atsType) {
      case 'greenhouse':
      case 'lever':
      case 'workday':
        return 'api';
      case 'ashby':
      case 'bamboohr':
        return 'api'; // These have APIs too
      case 'custom':
        return 'html'; // Try HTML, fallback to AI
      default:
        return 'ai'; // Unknown - use AI extraction
    }
  }

  /**
   * Get API endpoint for ATS that supports it
   */
  getApiEndpoint(atsType: AtsType, atsId: string): string | null {
    switch (atsType) {
      case 'greenhouse':
        return `https://boards.greenhouse.io/${atsId}/jobs?content=true`;
      case 'lever':
        return `https://api.lever.co/v0/postings/${atsId}?mode=json`;
      case 'workday':
        return null; // Workday requires authentication
      default:
        return null;
    }
  }
}

export const atsDetectionService = new AtsDetectionService();
