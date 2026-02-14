/**
 * AI Extraction Pipeline
 * 
 * Uses LLM to extract structured job data from raw HTML/description.
 * This is the key differentiator from HiringCafe - AI adapts to site changes automatically.
 * 
 * Extracts:
 * - Job title
 * - Company name
 * - Location (parsed, normalized)
 * - Remote type (remote/hybrid/onsite)
 * - Salary range (if available)
 * - Job description (cleaned)
 * - Requirements (structured list)
 * - Skills (extracted + normalized)
 * - Benefits (structured list)
 * - Application URL
 */

import OpenAI from 'openai';

export interface RawJobData {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  url?: string;
  rawHtml?: string;
}

export interface ExtractedJobData {
  title: string;
  company: string;
  location: string;
  remoteType: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description: string;
  requirements: string[];
  skills: string[];
  benefits: string[];
  applicationUrl: string;
  confidence: number;
}

export interface ExtractionResult {
  success: boolean;
  jobs: ExtractedJobData[];
  errors: string[];
  tokensUsed?: number;
  cost?: number;
}

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY,
  });
}

// Skills to look for - categorized
const SKILL_CATEGORIES = {
  languages: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'sql'],
  frameworks: ['react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring', 'rails', 'laravel', 'next.js', 'nuxt', 'svelte'],
  cloud: ['aws', 'azure', 'gcp', 'kubernetes', 'docker', 'terraform', 'cloudformation', 'serverless', 'lambda'],
  data: ['machine learning', 'deep learning', 'data science', 'data engineering', 'spark', 'hadoop', 'pandas', 'numpy', 'tensorflow', 'pytorch'],
  devops: ['ci/cd', 'jenkins', 'github actions', 'gitlab ci', 'ansible', 'puppet', 'chef', 'monitoring', 'logging'],
  databases: ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'oracle'],
  tools: ['git', 'jira', 'confluence', 'slack', 'zoom', 'figma', 'storybook'],
};

// System prompt for job extraction
const EXTRACTION_SYSTEM_PROMPT = `You are an expert job posting parser. Your task is to extract structured information from job postings.

Extract the following fields:
- title: Job title (e.g., "Senior Software Engineer")
- company: Company name
- location: Location (e.g., "San Francisco, CA", "Remote")
- remoteType: "remote" | "hybrid" | "onsite" | "unknown"
- salaryMin: Minimum salary (just number, e.g., 100000)
- salaryMax: Maximum salary (just number)
- salaryCurrency: Currency (e.g., "USD")
- description: Clean job description (remove HTML, keep formatting)
- requirements: Array of key requirements
- skills: Array of required skills (technical and soft)
- benefits: Array of benefits mentioned
- applicationUrl: Direct URL to apply

Return ONLY valid JSON array. Each job should be a separate object.`;

const EXTRACTION_USER_PROMPT = (jobs: RawJobData[]) => `Extract structured data from these ${jobs.length} job postings:

${jobs.map((job, i) => `
--- Job ${i + 1} ---
Title: ${job.title || 'N/A'}
Company: ${job.company || 'N/A'}
Location: ${job.location || 'N/A'}
URL: ${job.url || 'N/A'}
Description:
${job.description?.slice(0, 3000) || job.rawHtml?.slice(0, 3000) || 'N/A'}
`).join('\n')}

Return JSON array.`;

export class AIExtractionPipeline {
  private client: OpenAI | null = null;
  private model: string;
  private maxTokens: number;
  private batchSize: number;

  constructor(options: {
    model?: string;
    maxTokens?: number;
    batchSize?: number;
  } = {}) {
    this.model = options.model || 'gpt-4o-mini';
    this.maxTokens = options.maxTokens || 4000;
    this.batchSize = options.batchSize || 10;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = getOpenAIClient();
    }
    return this.client;
  }

  /**
   * Extract job data from raw HTML or description
   */
  async extract(rawJobs: RawJobData[]): Promise<ExtractionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const allJobs: ExtractedJobData[] = [];
    let totalTokens = 0;
    let totalCost = 0;

    try {
      const client = this.getClient();

      // Process in batches
      for (let i = 0; i < rawJobs.length; i += this.batchSize) {
        const batch = rawJobs.slice(i, i + this.batchSize);
        console.log(`[AI Extraction] Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(rawJobs.length / this.batchSize)}`);

        try {
          const response = await client.chat.completions.create({
            model: this.model,
            messages: [
              { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
              { role: 'user', content: EXTRACTION_USER_PROMPT(batch) },
            ],
            response_format: { type: 'json_object' },
            max_tokens: this.maxTokens,
            temperature: 0.1,
          });

          const content = response.choices[0]?.message?.content;
          const tokens = response.usage?.total_tokens || 0;
          const cost = (tokens / 1_000_000) * (this.model === 'gpt-4o-mini' ? 0.15 : 0.03);

          totalTokens += tokens;
          totalCost += cost;

          if (content) {
            const parsed = JSON.parse(content);
            const jobs = Array.isArray(parsed) ? parsed : parsed.jobs || [];
            
            for (const job of jobs) {
              const normalized = this.normalizeJobData(job, batch);
              if (normalized) {
                allJobs.push(normalized);
              }
            }
          }
        } catch (batchError) {
          console.error(`[AI Extraction] Batch failed:`, batchError);
          errors.push(`Batch ${Math.floor(i / this.batchSize) + 1} failed: ${batchError}`);
        }
      }

      console.log(`[AI Extraction] Extracted ${allJobs.length} jobs in ${Date.now() - startTime}ms ($${totalCost.toFixed(4)})`);

      return {
        success: errors.length === 0,
        jobs: allJobs,
        errors,
        tokensUsed: totalTokens,
        cost: totalCost,
      };
    } catch (error) {
      console.error('[AI Extraction] Failed:', error);
      return {
        success: false,
        jobs: allJobs,
        errors: [String(error)],
        tokensUsed: totalTokens,
        cost: totalCost,
      };
    }
  }

  /**
   * Extract skills from text using pattern matching + AI
   */
  async extractSkills(text: string): Promise<string[]> {
    const textLower = text.toLowerCase();
    const foundSkills: Set<string> = new Set();

    // Quick pattern matching for common skills
    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
      for (const skill of skills) {
        if (textLower.includes(skill)) {
          foundSkills.add(skill);
        }
      }
    }

    // Use AI for additional skills
    if (foundSkills.size < 3) {
      try {
        const client = this.getClient();
        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Extract technical skills from job posting. Return JSON array of skill names.' },
            { role: 'user', content: text.slice(0, 2000) },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 500,
          temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const aiSkills = Array.isArray(parsed) ? parsed : parsed.skills || [];
          aiSkills.forEach((s: string) => foundSkills.add(s.toLowerCase()));
        }
      } catch {
        // Fallback to pattern matching
      }
    }

    return Array.from(foundSkills);
  }

  /**
   * Normalize remote type from location text
   */
  private normalizeRemoteType(location: string, description: string): 'remote' | 'hybrid' | 'onsite' | 'unknown' {
    const text = `${location} ${description}`.toLowerCase();
    
    if (text.includes('remote') || text.includes('work from home') || text.includes('wfh')) {
      return 'remote';
    }
    if (text.includes('hybrid')) {
      return 'hybrid';
    }
    if (text.includes('onsite') || text.includes('in-person') || text.includes('on-site')) {
      return 'onsite';
    }
    
    return 'unknown';
  }

  /**
   * Parse salary from text
   */
  private parseSalary(text: string): { min?: number; max?: number; currency?: string } {
    const salaryRegex = /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:-|to)\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi;
    const matches = text.matchAll(salaryRegex);
    
    for (const match of matches) {
      const min = parseFloat(match[1].replace(/,/g, ''));
      const max = parseFloat(match[2].replace(/,/g, ''));
      
      if (!isNaN(min) && !isNaN(max)) {
        return { min, max, currency: 'USD' };
      }
    }
    
    return {};
  }

  /**
   * Normalize job data from AI response
   */
  private normalizeJobData(job: any, rawJobs: RawJobData[]): ExtractedJobData | null {
    if (!job.title && !job.name) {
      return null;
    }

    const title = job.title || job.name || '';
    const company = job.company || job.companyName || '';
    const location = job.location || '';
    const description = job.description || job.desc || '';
    const url = job.applicationUrl || job.applyUrl || job.url || '';

    const salary = this.parseSalary(`${title} ${description} ${job.salary || ''}`);

    return {
      title,
      company,
      location,
      remoteType: this.normalizeRemoteType(location, description),
      salaryMin: salary.min || job.salaryMin,
      salaryMax: salary.max || job.salaryMax,
      salaryCurrency: salary.currency || job.salaryCurrency || 'USD',
      description: this.cleanDescription(description),
      requirements: Array.isArray(job.requirements) ? job.requirements : [],
      skills: Array.isArray(job.skills) ? job.skills.map((s: string) => s.toLowerCase()) : [],
      benefits: Array.isArray(job.benefits) ? job.benefits : [],
      applicationUrl: url,
      confidence: job.confidence || 0.8,
    };
  }

  /**
   * Clean HTML from description
   */
  private cleanDescription(text: string): string {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const aiExtractionPipeline = new AIExtractionPipeline();
