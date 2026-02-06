/**
 * Job Normalization Utilities
 * 
 * Normalizes job data, standardizes fields, and calculates unique hashes
 * for deduplication.
 */

import crypto from 'crypto';
import { 
  ScrapedJob, 
  CompanyConfig, 
  JobLocation, 
  SalaryInfo,
  WorkType,
  EmploymentType,
  ExperienceLevel
} from '../types.js';

// Title normalization mapping
const TITLE_SYNONYMS: Record<string, string> = {
  'software engineer': 'software engineer',
  'software developer': 'software engineer',
  'sw engineer': 'software engineer',
  'swe': 'software engineer',
  'frontend engineer': 'frontend engineer',
  'front-end engineer': 'frontend engineer',
  'fe engineer': 'frontend engineer',
  'backend engineer': 'backend engineer',
  'back-end engineer': 'backend engineer',
  'be engineer': 'backend engineer',
  'full stack': 'fullstack engineer',
  'fullstack': 'fullstack engineer',
  'full-stack': 'fullstack engineer',
  'devops': 'devops engineer',
  'data scientist': 'data scientist',
  'machine learning engineer': 'ml engineer',
  'ml engineer': 'ml engineer',
  'product manager': 'product manager',
  'pm': 'product manager',
  'engineering manager': 'engineering manager',
  'tech lead': 'tech lead',
  'staff engineer': 'staff engineer',
  'principal engineer': 'principal engineer',
};

// Experience level patterns
const EXPERIENCE_PATTERNS = [
  { level: 'entry', patterns: [/entry[\s-]level/i, /junior/i, /jr\.?/i, /0-2\s*years/i, /1\s*year/i] },
  { level: 'mid', patterns: [/mid[\s-]level/i, /intermediate/i, /2-5\s*years/i, /3\s*years/i, /4\s*years/i] },
  { level: 'senior', patterns: [/senior/i, /sr\.?/i, /5\+?\s*years/i, /5-8\s*years/i] },
  { level: 'staff', patterns: [/staff/i, /lead/i, /8\+\s*years/i, /principal/i] },
  { level: 'executive', patterns: [/director/i, /vp/i, /head of/i, /cto/i, /cio/i] },
];

// Work type patterns
const WORK_TYPE_PATTERNS = [
  { type: 'remote', patterns: [/remote/i, /work from home/i, /wfh/i, /distributed/i] },
  { type: 'hybrid', patterns: [/hybrid/i, /flexible/i] },
  { type: 'onsite', patterns: [/on[\s-]site/i, /on-site/i, /office/i, /in[\s-]person/i] },
];

// Skills taxonomy
const SKILL_CATEGORIES: Record<string, string[]> = {
  'languages': ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin'],
  'frontend': ['react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt', 'html', 'css', 'tailwind'],
  'backend': ['node.js', 'django', 'flask', 'spring', 'express', 'fastapi', 'rails'],
  'databases': ['postgresql', 'mysql', 'mongodb', 'redis', 'dynamodb', 'cassandra', 'elasticsearch'],
  'cloud': ['aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'pulumi'],
  'ai_ml': ['tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'ml', 'ai', 'llm'],
  'mobile': ['ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
  'devops': ['ci/cd', 'jenkins', 'github actions', 'gitlab', 'ansible', 'chef', 'puppet'],
};

/**
 * Normalize a job object
 */
export async function normalizeJob(job: ScrapedJob, company: CompanyConfig): Promise<ScrapedJob> {
  const normalized = { ...job };

  // Normalize title
  normalized.normalizedTitle = normalizeTitle(job.title);
  
  // Normalize location
  normalized.location = normalizeLocation(job.location);
  
  // Determine work type
  normalized.workType = detectWorkType(job);
  
  // Determine employment type
  normalized.employmentType = detectEmploymentType(job);
  
  // Determine experience level
  normalized.experienceLevel = detectExperienceLevel(job);
  
  // Normalize salary
  normalized.salary = normalizeSalary(job.salary);
  
  // Normalize and categorize skills
  const skillResult = normalizeSkills(job.skills);
  normalized.skills = skillResult.skills;
  normalized.skillCategories = skillResult.categories;
  
  // Clean up description
  normalized.description = cleanDescription(job.description);
  
  // Set remote flag
  normalized.isRemote = normalized.workType === 'remote' || normalized.location.isRemote;
  
  // Set timestamps
  normalized.scrapedAt = new Date();
  normalized.updatedAt = new Date();

  return normalized;
}

/**
 * Calculate a unique hash for a job
 */
export function calculateJobHash(job: ScrapedJob): string {
  const hashInput = `${job.normalizedTitle}|${job.company}|${job.location.normalized}|${job.employmentType}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
}

/**
 * Normalize job title
 */
function normalizeTitle(title: string): string {
  const lowerTitle = title.toLowerCase().trim();
  
  for (const [synonym, canonical] of Object.entries(TITLE_SYNONYMS)) {
    if (lowerTitle.includes(synonym)) {
      return canonical;
    }
  }
  
  return lowerTitle;
}

/**
 * Normalize location
 */
function normalizeLocation(location: JobLocation): JobLocation {
  const normalized = { ...location };
  const raw = location.raw.toLowerCase();
  
  // Check for remote
  if (/remote|distributed|work from home|wfh/i.test(raw)) {
    normalized.isRemote = true;
    normalized.country = normalized.country || 'Global';
    normalized.countryCode = normalized.countryCode || 'GL';
  }
  
  // Extract city/state from common patterns
  const cityStateMatch = raw.match(/([a-z\s]+),?\s*([a-z]{2})/i);
  if (cityStateMatch && !normalized.city) {
    normalized.city = cityStateMatch[1].trim();
    normalized.state = cityStateMatch[2].toUpperCase();
  }
  
  // Create normalized string
  const parts = [normalized.city, normalized.state, normalized.country].filter(Boolean);
  normalized.normalized = parts.join(', ').toLowerCase();
  
  return normalized;
}

/**
 * Detect work type from job data
 */
function detectWorkType(job: ScrapedJob): WorkType {
  const text = `${job.title} ${job.description} ${job.location.raw}`.toLowerCase();
  
  for (const { type, patterns } of WORK_TYPE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return type as WorkType;
      }
    }
  }
  
  return 'hybrid'; // Default
}

/**
 * Detect employment type from job data
 */
function detectEmploymentType(job: ScrapedJob): EmploymentType {
  const text = `${job.title} ${job.description}`.toLowerCase();
  
  if (/contract|contractor|freelance/i.test(text)) return 'contract';
  if (/part[\s-]time/i.test(text)) return 'part-time';
  if (/intern|internship/i.test(text)) return 'internship';
  if (/full[\s-]time/i.test(text)) return 'full-time';
  
  return 'full-time'; // Default
}

/**
 * Detect experience level from job data
 */
function detectExperienceLevel(job: ScrapedJob): ExperienceLevel {
  const text = `${job.title} ${job.description}`.toLowerCase();
  
  for (const { level, patterns } of EXPERIENCE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return level as ExperienceLevel;
      }
    }
  }
  
  return 'mid'; // Default
}

/**
 * Normalize salary information
 */
function normalizeSalary(salary: SalaryInfo): SalaryInfo {
  const normalized = { ...salary };
  
  if (salary.min && salary.max) {
    // Normalize to yearly USD
    const multiplier = {
      'hourly': 2080,
      'daily': 260,
      'weekly': 52,
      'monthly': 12,
      'yearly': 1
    }[salary.period] || 1;
    
    normalized.normalizedMin = Math.round(salary.min * multiplier);
    normalized.normalizedMax = Math.round(salary.max * multiplier);
  }
  
  return normalized;
}

/**
 * Normalize and categorize skills
 */
function normalizeSkills(skills: string[]): { skills: string[]; categories: any[] } {
  const normalized = new Set<string>();
  const categories = new Map<string, Set<string>>();
  
  for (const skill of skills) {
    const lowerSkill = skill.toLowerCase().trim();
    
    // Find category
    for (const [category, keywords] of Object.entries(SKILL_CATEGORIES)) {
      if (keywords.some(k => lowerSkill.includes(k))) {
        normalized.add(skill);
        if (!categories.has(category)) {
          categories.set(category, new Set());
        }
        categories.get(category)!.add(skill);
        break;
      }
    }
  }
  
  return {
    skills: Array.from(normalized),
    categories: Array.from(categories.entries()).map(([category, skills]) => ({
      category,
      skills: Array.from(skills)
    }))
  };
}

/**
 * Clean up job description
 */
function cleanDescription(description: string): string {
  return description
    .replace(/<[^>]*>/g, ' ') // Remove HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 5000); // Limit length
}
