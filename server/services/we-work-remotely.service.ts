/**
 * We Work Remotely Integration
 * High-quality remote jobs with direct company URLs
 * Includes tech AND non-tech (sales, support, marketing, etc.)
 */

import { parseStringPromise } from 'xml2js';
import { createHash } from 'crypto';

interface WWRJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  category: string;
  publicationDate: string;
}

export class WeWorkRemotelyService {
  private readonly RSS_URL = 'https://weworkremotely.com/remote-jobs.rss';
  private readonly CATEGORIES = [
    'programming',      // Tech
    'design',           // Tech/Creative
    'product',          // Tech
    'devops',          // Tech
    'marketing',        // Non-tech
    'sales',           // Non-tech
    'support',         // Non-tech
    'business',        // Non-tech
    'copywriting',     // Non-tech
    'hr',              // Non-tech
    'accounting',      // Non-tech
    'legal',           // Non-tech
    'finance',         // Non-tech
    'customer-support', // Non-tech
    'data',            // Tech
    'mobile',          // Tech
    'qa',              // Tech
    'seo',             // Non-tech
    'social-media',    // Non-tech
    'sys-admin',       // Tech
    'technical-support' // Tech
  ];

  async fetchJobs(profession?: string): Promise<WWRJob[]> {
    try {
      console.log('[WeWorkRemotely] Fetching remote jobs...');
      
      const response = await fetch(this.RSS_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Recrutas/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });

      if (!response.ok) {
        console.error(`[WeWorkRemotely] HTTP ${response.status}`);
        return [];
      }

      const xmlText = await response.text();
      const jobs = await this.parseRSS(xmlText);
      
      // Filter by profession if specified
      if (profession) {
        const filtered = this.filterByProfession(jobs, profession);
        console.log(`[WeWorkRemotely] Fetched ${jobs.length} jobs, ${filtered.length} match profession: ${profession}`);
        return filtered;
      }
      
      console.log(`[WeWorkRemotely] Fetched ${jobs.length} jobs`);
      return jobs;
      
    } catch (error) {
      console.error('[WeWorkRemotely] Error:', error);
      return [];
    }
  }

  private async parseRSS(xmlText: string): Promise<WWRJob[]> {
    try {
      const result = await parseStringPromise(xmlText);
      const items = result.rss?.channel?.[0]?.item || [];
      
      return items.map((item: any) => {
        const title = item.title?.[0] || '';
        const description = item.description?.[0] || '';
        const link = item.link?.[0] || '';
        const guid = item.guid?.[0]?._ || item.guid?.[0] || '';
        const pubDate = item.pubDate?.[0] || new Date().toISOString();
        const category = item.category?.[0] || 'general';

        // Parse company from title (format: "Company: Job Title")
        const companyMatch = title.match(/^([^:]+):\s*(.+)$/);
        const company = companyMatch ? companyMatch[1].trim() : 'Unknown Company';
        const jobTitle = companyMatch ? companyMatch[2].trim() : title;

        // Stable ID: use guid or hash of URL for deduplication
        const stableKey = guid || link || title;
        const hash = createHash('md5').update(stableKey).digest('hex').substring(0, 12);

        return {
          id: `wwr_${hash}`,
          title: jobTitle,
          company,
          location: 'Remote',
          description: this.cleanDescription(description),
          url: link,
          category: category.toLowerCase(),
          publicationDate: new Date(pubDate).toISOString()
        };
      });
      
    } catch (error) {
      console.error('[WeWorkRemotely] RSS parse error:', error);
      return [];
    }
  }

  private cleanDescription(html: string): string {
    // Remove HTML tags
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000); // Limit length
  }

  private filterByProfession(jobs: WWRJob[], profession: string): WWRJob[] {
    const professionLower = profession.toLowerCase();
    
    // Category mapping
    const categoryMap: Record<string, string[]> = {
      'software-engineer': ['programming', 'devops', 'mobile', 'qa', 'data'],
      'designer': ['design'],
      'product-manager': ['product'],
      'data-scientist': ['data'],
      'sales-representative': ['sales', 'business'],
      'customer-service': ['support', 'customer-support'],
      'marketing': ['marketing', 'seo', 'social-media', 'copywriting'],
      'accountant': ['accounting', 'finance'],
      'copywriter': ['copywriting', 'marketing'],
      'hr': ['hr']
    };
    
    const relevantCategories = categoryMap[professionLower] || [professionLower];
    
    return jobs.filter(job => {
      // Check category match
      if (relevantCategories.includes(job.category)) {
        return true;
      }
      
      // Check title keywords
      const titleLower = job.title.toLowerCase();
      if (relevantCategories.some(cat => titleLower.includes(cat))) {
        return true;
      }
      
      return false;
    });
  }

  // Get jobs by category (for browsing)
  async fetchByCategory(category: string): Promise<WWRJob[]> {
    const allJobs = await this.fetchJobs();
    return allJobs.filter(job => job.category === category.toLowerCase());
  }

  // Get non-tech jobs specifically
  async fetchNonTechJobs(): Promise<WWRJob[]> {
    const techCategories = ['programming', 'devops', 'mobile', 'qa', 'data', 'sys-admin', 'technical-support'];
    const allJobs = await this.fetchJobs();
    
    return allJobs.filter(job => !techCategories.includes(job.category));
  }
}

export const weWorkRemotelyService = new WeWorkRemotelyService();
