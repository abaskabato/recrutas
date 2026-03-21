// Open source ML-powered job matching using semantic embeddings

import { type CandidateProfile, type JobPosting } from '@shared/schema';
import Groq from 'groq-sdk';
import { getCachedSummary, setCachedSummary, summaryKey } from './lib/groq-limiter';
import { callAI } from './lib/ai-client';

// Lazy-initialize Groq client to ensure env vars are loaded (ESM imports hoist before dotenv.config)
let _groq: Groq | null = null;
function getGroqClient(): Groq | null {
  if (_groq === null && process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== '%GROQ_API_KEY%') {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

// Job summarization result interface
export interface JobSummary {
  summary: string;              // 2-3 sentence summary
  keyResponsibilities: string[]; // Top 5 bullets
  mustHaveSkills: string[];      // Required skills
  niceToHaveSkills: string[];    // Preferred skills
  seniorityLevel: string;        // junior/mid/senior/lead/principal
  estimatedSalaryRange?: string; // If inferable from description
  teamSize?: string;             // If mentioned
  techStack?: string[];          // Specific technologies mentioned
}

interface AIMatchResult {
  confidenceLevel: number;
  skillMatches: string[];
  aiExplanation: string;
  score: number;
}

// Skill embeddings using pre-computed vectors for common tech skills
const SKILL_EMBEDDINGS: Record<string, number[]> = {
  'javascript': [0.8, 0.2, 0.9, 0.1, 0.7],
  'typescript': [0.8, 0.3, 0.9, 0.2, 0.7],
  'react': [0.9, 0.1, 0.8, 0.1, 0.6],
  'vue': [0.9, 0.1, 0.7, 0.2, 0.6],
  'angular': [0.9, 0.2, 0.8, 0.1, 0.6],
  'python': [0.7, 0.8, 0.6, 0.9, 0.8],
  'django': [0.7, 0.8, 0.5, 0.9, 0.7],
  'flask': [0.6, 0.8, 0.5, 0.8, 0.7],
  'java': [0.6, 0.9, 0.7, 0.8, 0.9],
  'spring': [0.6, 0.9, 0.6, 0.8, 0.8],
  'node.js': [0.8, 0.4, 0.8, 0.3, 0.7],
  'express': [0.8, 0.4, 0.7, 0.3, 0.6],
  'go': [0.5, 0.9, 0.8, 0.7, 0.8],
  'rust': [0.4, 0.9, 0.9, 0.8, 0.9],
  'c++': [0.3, 0.9, 0.9, 0.9, 0.9],
  'c#': [0.5, 0.8, 0.8, 0.7, 0.8],
  'sql': [0.2, 0.7, 0.4, 0.9, 0.6],
  'postgresql': [0.2, 0.7, 0.4, 0.9, 0.7],
  'mysql': [0.2, 0.7, 0.4, 0.8, 0.6],
  'mongodb': [0.3, 0.6, 0.5, 0.8, 0.6],
  'redis': [0.3, 0.6, 0.6, 0.7, 0.6],
  'aws': [0.4, 0.5, 0.3, 0.6, 0.8],
  'docker': [0.3, 0.6, 0.5, 0.7, 0.8],
  'kubernetes': [0.2, 0.7, 0.4, 0.8, 0.9],
  'git': [0.5, 0.3, 0.7, 0.4, 0.5],
  'linux': [0.2, 0.8, 0.6, 0.8, 0.8],
  'machine learning': [0.1, 0.9, 0.3, 0.9, 0.9],
  'data science': [0.1, 0.9, 0.2, 0.9, 0.8],
  'tensorflow': [0.1, 0.9, 0.2, 0.9, 0.8],
  'pytorch': [0.1, 0.9, 0.3, 0.9, 0.8],
  'marketing': [0.9, 0.1, 0.2, 0.3, 0.4],
  'sales': [0.9, 0.1, 0.3, 0.2, 0.3],
  'design': [0.8, 0.2, 0.4, 0.2, 0.3],
  'ui/ux': [0.8, 0.2, 0.5, 0.2, 0.4],
  'product management': [0.7, 0.3, 0.4, 0.4, 0.5],
  'project management': [0.6, 0.3, 0.3, 0.4, 0.5]
};

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {return 0;}

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {return 0;}
  return dotProduct / (magnitudeA * magnitudeB);
}

function getSkillEmbedding(skill: string): number[] {
  const normalizedSkill = skill.toLowerCase().trim();

  // Direct match
  if (SKILL_EMBEDDINGS[normalizedSkill]) {
    return SKILL_EMBEDDINGS[normalizedSkill];
  }

  // Partial matches
  for (const [key, embedding] of Object.entries(SKILL_EMBEDDINGS)) {
    if (normalizedSkill.includes(key) || key.includes(normalizedSkill)) {
      return embedding;
    }
  }

  // Generate pseudo-embedding for unknown skills based on characteristics
  const hash = normalizedSkill.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);

  return [
    Math.abs(Math.sin(hash)) * 0.5 + 0.25,
    Math.abs(Math.cos(hash)) * 0.5 + 0.25,
    Math.abs(Math.sin(hash * 2)) * 0.5 + 0.25,
    Math.abs(Math.cos(hash * 2)) * 0.5 + 0.25,
    Math.abs(Math.sin(hash * 3)) * 0.5 + 0.25
  ];
}

export async function generateJobMatch(candidate: CandidateProfile, job: JobPosting): Promise<AIMatchResult> {
  return generateMLEnhancedMatch(candidate, job);
}

function generateMLEnhancedMatch(candidate: CandidateProfile, job: JobPosting): AIMatchResult {
  // Ensure arrays exist and are valid
  const candidateSkills = Array.isArray(candidate.skills) ? candidate.skills : [];
  const jobSkills = Array.isArray(job.skills) ? job.skills : [];
  const jobRequirements = Array.isArray(job.requirements) ? job.requirements : [];

  // Semantic skill matching using embeddings
  const candidateSkillEmbeddings = candidateSkills.map((skill: string) => getSkillEmbedding(skill));
  const jobSkillEmbeddings = jobSkills.map((skill: string) => getSkillEmbedding(skill));
  const jobReqEmbeddings = jobRequirements.map((req: string) => getSkillEmbedding(req));

  let totalSimilarity = 0;
  const maxSimilarities: Array<{ skill: string; similarity: number; matchedWith: string }> = [];

  // Calculate semantic similarities between candidate skills and job requirements
  for (let i = 0; i < candidateSkillEmbeddings.length; i++) {
    let maxSim = 0;
    let bestMatch = '';

    // Compare with job skills
    for (let j = 0; j < jobSkillEmbeddings.length; j++) {
      const sim = cosineSimilarity(candidateSkillEmbeddings[i], jobSkillEmbeddings[j]);
      if (sim > maxSim) {
        maxSim = sim;
        bestMatch = job.skills[j];
      }
    }

    // Compare with job requirements
    for (let j = 0; j < jobReqEmbeddings.length; j++) {
      const sim = cosineSimilarity(candidateSkillEmbeddings[i], jobReqEmbeddings[j]);
      if (sim > maxSim) {
        maxSim = sim;
        bestMatch = job.requirements[j];
      }
    }

    if (maxSim > 0.6) { // Threshold for semantic similarity
      maxSimilarities.push({
        skill: candidate.skills[i],
        similarity: maxSim,
        matchedWith: bestMatch
      });
      totalSimilarity += maxSim;
    }
  }

  // Job title similarity — compare candidate's previous titles to the target job title
  const titleScore = calculateTitleSimilarity(candidate, job.title);

  // Semantic analysis of experience vs job description
  const experienceScore = analyzeExperienceSemantics(candidate.experience, job.description, job.title);

  // Context-aware scoring
  const contextScore = calculateContextualFit(candidate, job);

  // ML-enhanced final score calculation (0-1 range)
  const skillScore = Math.min(totalSimilarity / Math.max(job.skills?.length || 1, 1), 1.0);

  // Calculate final score with weights
  // Skill: 35%, Title: 15%, Experience: 20%, Context (Salary/Loc): 30%
  const finalScore = (skillScore * 0.35) + (titleScore * 0.15) + (experienceScore * 0.20) + (contextScore * 0.30);

  // Confidence is based on how much data we had to work with
  const confidence = calculateConfidenceLevel(maxSimilarities.length, job.skills?.length || 0, experienceScore);

  // Generate intelligent explanation
  const explanation = generateMLExplanation(maxSimilarities, experienceScore, contextScore, job, titleScore);

  return {
    score: Math.min(Math.max(finalScore, 0), 1), // Keep score between 0-1
    confidenceLevel: calculateConfidenceLevel(maxSimilarities.length, candidateSkills.length, experienceScore),
    skillMatches: maxSimilarities.map(m => m.skill),
    aiExplanation: explanation
  };
}

/**
 * Calculate how well the candidate's previous job titles match the target job title.
 * Returns a score from 0 to 1.
 *
 * Uses three signals:
 * 1. Exact/near-exact title match (strongest)
 * 2. Role-family match (e.g. "Software Engineer" ↔ "Software Developer")
 * 3. Seniority alignment (e.g. both "Senior")
 */
function calculateTitleSimilarity(candidate: CandidateProfile, jobTitle: string): number {
  if (!jobTitle) return 0.5;

  // Extract candidate's previous job titles from resumeParsingData or experience text
  const candidateTitles = extractCandidateTitles(candidate);
  if (candidateTitles.length === 0) return 0.5; // No data — neutral score

  const normalizedJobTitle = normalizeTitle(jobTitle);
  const jobTitleWords = new Set(normalizedJobTitle.split(/\s+/));
  const jobRole = extractRoleFamily(normalizedJobTitle);
  const jobSeniority = extractSeniority(normalizedJobTitle);

  let bestScore = 0;

  for (const candidateTitle of candidateTitles) {
    const normalizedCandTitle = normalizeTitle(candidateTitle);
    const candTitleWords = new Set(normalizedCandTitle.split(/\s+/));
    const candRole = extractRoleFamily(normalizedCandTitle);
    const candSeniority = extractSeniority(normalizedCandTitle);

    let titleMatchScore = 0;

    // Signal 1: Word overlap (Jaccard similarity)
    const intersection = new Set([...jobTitleWords].filter(w => candTitleWords.has(w)));
    const union = new Set([...jobTitleWords, ...candTitleWords]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;
    titleMatchScore += jaccard * 0.4;

    // Signal 2: Role family match
    if (jobRole && candRole && jobRole === candRole) {
      titleMatchScore += 0.4; // Same role family = strong signal
    } else if (jobRole && candRole) {
      // Check for related role families
      const relatedRoles = RELATED_ROLE_FAMILIES[jobRole];
      if (relatedRoles?.includes(candRole)) {
        titleMatchScore += 0.25; // Related role = moderate signal
      }
    }

    // Signal 3: Seniority alignment
    if (jobSeniority && candSeniority) {
      if (jobSeniority === candSeniority) {
        titleMatchScore += 0.2; // Same seniority
      } else if (Math.abs(SENIORITY_LEVELS.indexOf(jobSeniority) - SENIORITY_LEVELS.indexOf(candSeniority)) <= 1) {
        titleMatchScore += 0.1; // Adjacent seniority (e.g. mid ↔ senior)
      }
    } else {
      titleMatchScore += 0.1; // Unknown seniority — neutral
    }

    bestScore = Math.max(bestScore, titleMatchScore);
  }

  return Math.min(bestScore, 1.0);
}

const SENIORITY_LEVELS = ['intern', 'junior', 'mid', 'senior', 'staff', 'principal', 'lead', 'manager', 'director', 'vp', 'executive'];

function extractSeniority(title: string): string | null {
  const t = title.toLowerCase();
  if (/\b(intern|internship)\b/.test(t)) return 'intern';
  if (/\b(junior|jr|entry)\b/.test(t)) return 'junior';
  if (/\b(senior|sr)\b/.test(t)) return 'senior';
  if (/\bstaff\b/.test(t)) return 'staff';
  if (/\bprincipal\b/.test(t)) return 'principal';
  if (/\b(lead|team lead)\b/.test(t)) return 'lead';
  if (/\bmanager\b/.test(t)) return 'manager';
  if (/\bdirector\b/.test(t)) return 'director';
  if (/\b(vp|vice president)\b/.test(t)) return 'vp';
  if (/\b(chief|cto|ceo|coo|cfo)\b/.test(t)) return 'executive';
  return 'mid'; // default — no modifier typically means mid-level
}

/**
 * Extract the core role family from a title, stripping seniority and modifiers.
 * e.g. "Senior Software Engineer" → "software_engineer"
 *      "Full Stack Developer" → "software_developer"
 */
function extractRoleFamily(title: string): string | null {
  const t = title.toLowerCase();
  // Order matters — check more specific patterns first
  if (/data scientist/.test(t)) return 'data_scientist';
  if (/data engineer/.test(t)) return 'data_engineer';
  if (/data analyst/.test(t)) return 'data_analyst';
  if (/machine learning|ml engineer/.test(t)) return 'ml_engineer';
  if (/devops|site reliability|sre/.test(t)) return 'devops';
  if (/cloud engineer|cloud architect/.test(t)) return 'cloud_engineer';
  if (/security engineer|cybersecurity|infosec/.test(t)) return 'security_engineer';
  if (/qa|quality assurance|test engineer|sdet/.test(t)) return 'qa_engineer';
  if (/mobile developer|ios developer|android developer/.test(t)) return 'mobile_developer';
  if (/frontend|front-end|front end/.test(t)) return 'frontend_developer';
  if (/backend|back-end|back end/.test(t)) return 'backend_developer';
  if (/full.?stack/.test(t)) return 'fullstack_developer';
  if (/software engineer|software developer|swe/.test(t)) return 'software_engineer';
  if (/web developer/.test(t)) return 'web_developer';
  if (/product manager|pm\b/.test(t)) return 'product_manager';
  if (/product designer/.test(t)) return 'product_designer';
  if (/ux designer|ui designer|ux\/ui/.test(t)) return 'ux_designer';
  if (/graphic designer/.test(t)) return 'graphic_designer';
  if (/engineering manager|em\b/.test(t)) return 'engineering_manager';
  if (/project manager/.test(t)) return 'project_manager';
  if (/program manager/.test(t)) return 'program_manager';
  if (/business analyst/.test(t)) return 'business_analyst';
  if (/solutions architect|solution architect/.test(t)) return 'solutions_architect';
  if (/system administrator|sysadmin|systems engineer/.test(t)) return 'systems_engineer';
  if (/network engineer/.test(t)) return 'network_engineer';
  if (/database administrator|dba/.test(t)) return 'dba';
  if (/technical writer/.test(t)) return 'technical_writer';
  if (/scrum master|agile/.test(t)) return 'scrum_master';
  if (/analyst/.test(t)) return 'analyst';
  if (/designer/.test(t)) return 'designer';
  if (/engineer/.test(t)) return 'engineer';
  if (/developer/.test(t)) return 'developer';
  if (/manager/.test(t)) return 'manager';
  if (/architect/.test(t)) return 'architect';
  return null;
}

/**
 * Map of related role families that should get partial credit.
 */
const RELATED_ROLE_FAMILIES: Record<string, string[]> = {
  software_engineer: ['software_developer', 'fullstack_developer', 'backend_developer', 'frontend_developer', 'web_developer', 'developer', 'engineer'],
  software_developer: ['software_engineer', 'fullstack_developer', 'backend_developer', 'frontend_developer', 'web_developer', 'developer', 'engineer'],
  fullstack_developer: ['software_engineer', 'software_developer', 'backend_developer', 'frontend_developer', 'web_developer'],
  frontend_developer: ['software_engineer', 'software_developer', 'fullstack_developer', 'web_developer', 'ux_designer'],
  backend_developer: ['software_engineer', 'software_developer', 'fullstack_developer', 'devops'],
  web_developer: ['software_engineer', 'software_developer', 'fullstack_developer', 'frontend_developer'],
  mobile_developer: ['software_engineer', 'software_developer', 'frontend_developer'],
  data_scientist: ['data_analyst', 'ml_engineer', 'data_engineer'],
  data_engineer: ['data_scientist', 'data_analyst', 'backend_developer', 'devops'],
  data_analyst: ['data_scientist', 'business_analyst', 'analyst'],
  ml_engineer: ['data_scientist', 'data_engineer', 'software_engineer'],
  devops: ['cloud_engineer', 'systems_engineer', 'backend_developer', 'sre'],
  cloud_engineer: ['devops', 'systems_engineer', 'solutions_architect'],
  product_manager: ['program_manager', 'project_manager'],
  product_designer: ['ux_designer', 'graphic_designer', 'designer'],
  ux_designer: ['product_designer', 'graphic_designer', 'frontend_developer', 'designer'],
  engineering_manager: ['software_engineer', 'manager'],
  project_manager: ['program_manager', 'product_manager', 'scrum_master'],
  qa_engineer: ['software_engineer', 'developer'],
  security_engineer: ['devops', 'systems_engineer', 'network_engineer', 'engineer'],
  solutions_architect: ['cloud_engineer', 'architect', 'software_engineer'],
};

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract candidate's previous job titles from structured parsing data or free-text experience.
 */
function extractCandidateTitles(candidate: CandidateProfile): string[] {
  const titles: string[] = [];

  // Source 1: Structured positions from resumeParsingData (best quality)
  const parsingData = candidate.resumeParsingData as any;
  if (parsingData?.positions && Array.isArray(parsingData.positions)) {
    for (const pos of parsingData.positions) {
      if (pos.title && typeof pos.title === 'string' && pos.title.trim().length > 2) {
        titles.push(pos.title.trim());
      }
    }
  }

  // Source 2: Fall back to extracting from free-text experience field
  if (titles.length === 0 && candidate.experience) {
    const titlePattern = /\b((?:Senior |Junior |Lead |Staff |Principal |Associate |Chief )?(?:Software Engineer|Software Developer|Web Developer|Full Stack Developer|Frontend Developer|Backend Developer|DevOps Engineer|Data Scientist|Data Engineer|Data Analyst|ML Engineer|Product Manager|Product Designer|UX Designer|UI Designer|QA Engineer|Security Engineer|Solutions Architect|Engineering Manager|Project Manager|Program Manager|Technical Writer|System Administrator|Network Engineer|Cloud Engineer|Mobile Developer|Scrum Master|Business Analyst))\b/gi;
    const matches = candidate.experience.match(titlePattern);
    if (matches) {
      // Deduplicate
      const seen = new Set<string>();
      for (const m of matches) {
        const normalized = m.trim().toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          titles.push(m.trim());
        }
      }
    }
  }

  return titles.slice(0, 6); // Limit to most recent 6 positions
}

function analyzeExperienceSemantics(experience: string, jobDescription: string, jobTitle: string): number {
  if (!experience || !jobDescription) {return 0.5;}

  const expWords = experience.toLowerCase().split(/\s+/);
  const jobWords = jobDescription.toLowerCase().split(/\s+/);
  const titleWords = jobTitle.toLowerCase().split(/\s+/);

  // Semantic keyword groups
  const seniorityKeywords = ['senior', 'lead', 'principal', 'architect', 'manager', 'director'];
  const techKeywords = ['developed', 'built', 'implemented', 'designed', 'created', 'optimized'];

  let semanticMatches = 0;
  let totalChecks = 0;

  // Seniority alignment
  const expSeniority = seniorityKeywords.filter(k => expWords.includes(k)).length;
  const jobSeniority = seniorityKeywords.filter(k => [...jobWords, ...titleWords].includes(k)).length;
  semanticMatches += Math.min(expSeniority, jobSeniority);
  totalChecks += Math.max(expSeniority, jobSeniority, 1);

  // Technical experience alignment
  const expTech = techKeywords.filter(k => expWords.includes(k)).length;
  const jobTech = techKeywords.filter(k => jobWords.includes(k)).length;
  semanticMatches += Math.min(expTech / 2, jobTech / 2, 1);
  totalChecks += 1;

  // Direct word overlap with context weighting
  const commonWords = expWords.filter(word =>
    word.length > 3 && jobWords.includes(word)
  ).length;
  semanticMatches += Math.min(commonWords / 10, 1);
  totalChecks += 1;

  return totalChecks > 0 ? semanticMatches / totalChecks : 0.5;
}

function calculateContextualFit(candidate: CandidateProfile, job: JobPosting): number {
  let contextScore = 0;
  let factors = 0;

  // 1. Location context (Weight: High)
  if (candidate.location && job.location) {
    const isRemoteJob = job.workType?.toLowerCase().includes('remote') || job.location.toLowerCase().includes('remote');
    const isRemoteCandidate = candidate.workType?.toLowerCase().includes('remote') || candidate.location.toLowerCase().includes('remote');

    const locMatch = candidate.location.toLowerCase() === job.location.toLowerCase();

    if (isRemoteJob) {
      contextScore += 1.0; // Perfect fit for remote jobs
    } else if (locMatch) {
      contextScore += 1.0; // Local match
    } else if (isRemoteCandidate && !isRemoteJob) {
      contextScore += 0.4; // Remote candidate applying for non-remote job (Potential issue)
    } else {
      contextScore += 0.6; // Different location, no explicit remote mentioned
    }
    factors++;
  }

  // 2. Work type preferences (Weight: Medium)
  if (candidate.workType && job.workType) {
    const candidateWorkType = candidate.workType.toLowerCase();
    const jobWorkType = job.workType.toLowerCase();

    if (candidateWorkType === jobWorkType) {
      contextScore += 1.0;
    } else if (candidateWorkType === 'hybrid' && (jobWorkType === 'remote' || jobWorkType === 'onsite')) {
      contextScore += 0.8; // Hybrid is flexible
    } else if (jobWorkType === 'hybrid' && (candidateWorkType === 'remote' || candidateWorkType === 'onsite')) {
      contextScore += 0.7; // Candidate might be willing to go hybrid
    } else {
      contextScore += 0.5; // Mismatch (e.g., Remote only vs Onsite only)
    }
    factors++;
  }

  // 3. Salary expectations (Weight: Critical)
  if (candidate.salaryMin && (job.salaryMin || job.salaryMax)) {
    const jobMid = job.salaryMax ? (job.salaryMin ? (job.salaryMin + job.salaryMax) / 2 : job.salaryMax) : job.salaryMin;

    if (jobMid && jobMid >= candidate.salaryMin) {
      // Job pays at or above minimum
      const bonus = Math.min((jobMid - candidate.salaryMin) / candidate.salaryMin, 0.2); // Up to 20% bonus
      contextScore += (1.0 + bonus);
    } else if (jobMid && jobMid >= candidate.salaryMin * 0.8) {
      // Job pays within 20% of minimum (acceptable range)
      contextScore += 0.7;
    } else if (jobMid) {
      // Job pays significantly less
      contextScore += 0.3;
    }
    factors++;
  }

  // 4. Industry alignment (Weight: Low)
  if (candidate.preferredIndustry && job.industry) {
    const industryMatch = candidate.preferredIndustry.toLowerCase() === job.industry.toLowerCase();
    contextScore += industryMatch ? 1.0 : 0.8;
    factors++;
  }

  return factors > 0 ? Math.min(contextScore / factors, 1.2) : 0.7;
}

function calculateConfidenceLevel(matches: number, totalSkills: number, experienceScore: number): number {
  const skillCoverage = matches / Math.max(totalSkills, 1);
  const confidence = (skillCoverage * 0.6 + experienceScore * 0.4);

  if (confidence >= 0.8) {return 0.9;}
  if (confidence >= 0.6) {return 0.8;}
  if (confidence >= 0.4) {return 0.7;}
  return 0.6;
}

function generateMLExplanation(
  skillMatches: Array<{ skill: string; similarity: number; matchedWith: string }>,
  experienceScore: number,
  contextScore: number,
  job: JobPosting,
  titleScore?: number
): string {
  const explanations = [];

  if (titleScore && titleScore > 0.7) {
    explanations.push(`Your previous role closely matches ${job.title}`);
  } else if (titleScore && titleScore > 0.5) {
    explanations.push(`Related role experience for ${job.title}`);
  }

  if (skillMatches.length > 0) {
    const topSkills = skillMatches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(m => m.skill);
    explanations.push(`Strong semantic match in ${topSkills.join(', ')}`);
  }

  if (experienceScore > 0.7) {
    explanations.push(`Experience aligns well with ${job.title} requirements`);
  } else if (experienceScore > 0.5) {
    explanations.push(`Relevant experience with growth potential`);
  }

  if (contextScore > 0.8) {
    explanations.push(`Excellent cultural and logistical fit`);
  }

  if (explanations.length === 0) {
    explanations.push(`Potential match with transferable skills`);
  }

  return explanations.join('. ') + '.';
}

// Generate ML-powered job insights for candidate profile optimization
export async function generateJobInsights(candidateProfile: CandidateProfile): Promise<string[]> {
  const insights: string[] = [];

  // Analyze skill gaps and market demand
  const skillGaps = analyzeSkillGaps(candidateProfile.skills);
  if (skillGaps.length > 0) {
    insights.push(`Consider developing skills in: ${skillGaps.slice(0, 3).join(', ')}`);
  }

  // Experience optimization suggestions
  if (candidateProfile.experience.length < 100) {
    insights.push('Expand your experience description to better showcase your achievements');
  }

  // Location and work type recommendations
  if (!candidateProfile.workType) {
    insights.push('Specify your work type preference (remote, hybrid, onsite) to get better matches');
  }

  // Salary range optimization
  if (!candidateProfile.salaryMin) {
    insights.push('Adding salary expectations helps filter relevant opportunities');
  }

  return insights;
}

function analyzeSkillGaps(currentSkills: string[]): string[] {
  const inDemandSkills = [
    'React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker',
    'Kubernetes', 'GraphQL', 'MongoDB', 'PostgreSQL', 'Redis',
    'Machine Learning', 'Data Science', 'DevOps', 'Microservices'
  ];

  const currentSkillsLower = currentSkills.map(s => s.toLowerCase());
  return inDemandSkills.filter(skill =>
    !currentSkillsLower.some(cs => cs === skill.toLowerCase())
  );
}

// Generate AI-powered screening questions
export async function generateScreeningQuestions(candidate: CandidateProfile, job: JobPosting): Promise<string[]> {
  console.log("Generating screening questions for:", { candidate, job });

  const questions = [
    `Tell me about your experience with ${job.skills[0] || 'the primary technology'} for this role.`,
    `This job requires experience in ${job.industry || 'our industry'}. Can you describe a project where you've worked in this area?`,
    `One of the key requirements is "${job.requirements[0] || 'a key requirement'}". How have you demonstrated this in your past work?`,
    `Based on your resume, you have experience with ${candidate.skills[0] || 'a key skill'}. How would you apply that to the responsibilities of this job?`,
    `What interests you most about this role at ${job.company}?`
  ];

  // Simulate AI generation delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return questions;
}

/**
 * GPT-powered job description summarization
 */
export async function summarizeJobDescription(description: string, title?: string, company?: string): Promise<JobSummary> {
  const groqClient = getGroqClient();
  // If no AI provider available, use rule-based summarization
  if (!process.env.GEMINI_API_KEY && !groqClient) {
    return generateRuleBasedSummary(description, title, company);
  }

  // Check LRU cache before making an API call
  const cacheKey = summaryKey(description);
  const cachedSummaryJson = getCachedSummary(cacheKey);
  if (cachedSummaryJson) {
    try {
      return JSON.parse(cachedSummaryJson) as JobSummary;
    } catch {
      // Cache entry malformed — fall through to API call
    }
  }

  try {
    const prompt = `Analyze this job posting and extract structured information. Return a JSON object.

Job Title: ${title || 'Not specified'}
Company: ${company || 'Not specified'}

Job Description:
${description.slice(0, 8000)}

Return ONLY a valid JSON object with these exact fields (no markdown, no code blocks):
{
  "summary": "A 2-3 sentence summary of the role and what makes it interesting",
  "keyResponsibilities": ["Up to 5 main responsibilities as bullet points"],
  "mustHaveSkills": ["Required/must-have skills mentioned"],
  "niceToHaveSkills": ["Nice-to-have/preferred skills mentioned"],
  "seniorityLevel": "one of: intern, junior, mid, senior, lead, principal, director",
  "estimatedSalaryRange": "salary range if mentioned, or null",
  "teamSize": "team size if mentioned, or null",
  "techStack": ["specific technologies/tools mentioned"]
}`;

    const content = await callAI(
      'You are a job posting analyzer. Extract structured information from job descriptions and return valid JSON only.',
      prompt,
      { priority: 'medium', estimatedTokens: 2000, temperature: 0.1, maxOutputTokens: 1500 }
    );

    const parsed = JSON.parse(content);

    const result: JobSummary = {
      summary: parsed.summary || generateFallbackSummary(title, company, description),
      keyResponsibilities: Array.isArray(parsed.keyResponsibilities) ? parsed.keyResponsibilities.slice(0, 5) : [],
      mustHaveSkills: Array.isArray(parsed.mustHaveSkills) ? parsed.mustHaveSkills : [],
      niceToHaveSkills: Array.isArray(parsed.niceToHaveSkills) ? parsed.niceToHaveSkills : [],
      seniorityLevel: parsed.seniorityLevel || inferSeniorityLevel(title || description),
      estimatedSalaryRange: parsed.estimatedSalaryRange || undefined,
      teamSize: parsed.teamSize || undefined,
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : []
    };

    // Store in cache to avoid re-summarizing the same job description
    setCachedSummary(cacheKey, JSON.stringify(result));

    return result;

  } catch (error: any) {
    console.error('[AI Service] Job summarization error:', error.message);
    return generateRuleBasedSummary(description, title, company);
  }
}

/**
 * Rule-based summary generation (fallback when AI is unavailable)
 */
function generateRuleBasedSummary(description: string, title?: string, company?: string): JobSummary {
  const lowerDesc = description.toLowerCase();

  // Extract skills using common patterns
  const techSkills = extractTechSkillsFromText(description);
  const mustHave = techSkills.slice(0, 5);
  const niceToHave = techSkills.slice(5, 8);

  // Extract responsibilities (lines starting with bullet points or action verbs)
  const responsibilities = extractResponsibilities(description);

  // Infer seniority
  const seniority = inferSeniorityLevel(title || description);

  // Extract salary if mentioned
  const salaryRange = extractSalaryRange(description);

  return {
    summary: generateFallbackSummary(title, company, description),
    keyResponsibilities: responsibilities.slice(0, 5),
    mustHaveSkills: mustHave,
    niceToHaveSkills: niceToHave,
    seniorityLevel: seniority,
    estimatedSalaryRange: salaryRange || undefined,
    techStack: techSkills.slice(0, 10)
  };
}

/**
 * Generate a simple summary from title and description
 */
function generateFallbackSummary(title?: string, company?: string, description?: string): string {
  const parts: string[] = [];

  if (title && company) {
    parts.push(`${title} position at ${company}.`);
  } else if (title) {
    parts.push(`${title} role.`);
  }

  if (description) {
    // Extract first meaningful sentence
    const sentences = description.split(/[.!?]/).filter(s => s.trim().length > 20);
    if (sentences[0]) {
      parts.push(sentences[0].trim() + '.');
    }
  }

  return parts.join(' ') || 'Exciting opportunity to join the team.';
}

/**
 * Extract tech skills from text
 */
function extractTechSkillsFromText(text: string): string[] {
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'PHP', 'Kotlin', 'Swift',
    'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Django', 'Flask', 'Spring', 'Express', '.NET',
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'CircleCI', 'GitHub Actions',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra',
    'GraphQL', 'REST', 'API', 'Microservices', 'CI/CD', 'DevOps', 'SRE',
    'Machine Learning', 'AI', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP',
    'React Native', 'Flutter', 'iOS', 'Android', 'Mobile',
    'SQL', 'NoSQL', 'Linux', 'Git', 'Agile', 'Scrum'
  ];

  return commonSkills.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, 'i').test(text);
  });
}

/**
 * Extract responsibilities from job description
 */
function extractResponsibilities(description: string): string[] {
  const lines = description.split(/[\n\r]+/);
  const responsibilities: string[] = [];

  const actionVerbs = ['build', 'develop', 'design', 'implement', 'create', 'lead', 'manage',
    'collaborate', 'work', 'drive', 'own', 'define', 'architect', 'write', 'maintain'];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for bullet points or numbered lists
    if (trimmed.match(/^[-•*]\s+/) || trimmed.match(/^\d+[.)]\s+/)) {
      const content = trimmed.replace(/^[-•*\d.)]+\s*/, '');
      if (content.length > 10 && content.length < 200) {
        responsibilities.push(content);
      }
    }
    // Check for lines starting with action verbs
    else if (trimmed.length > 20 && trimmed.length < 200) {
      const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
      if (actionVerbs.includes(firstWord)) {
        responsibilities.push(trimmed);
      }
    }
  }

  return responsibilities;
}

/**
 * Infer seniority level from title or description
 */
function inferSeniorityLevel(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('intern') || lowerText.includes('internship')) {return 'intern';}
  if (lowerText.includes('junior') || lowerText.includes('entry level') || lowerText.includes('entry-level')) {return 'junior';}
  if (lowerText.includes('principal') || lowerText.includes('staff')) {return 'principal';}
  if (lowerText.includes('director') || lowerText.includes('vp ') || lowerText.includes('vice president')) {return 'director';}
  if (lowerText.includes('lead') || lowerText.includes('manager')) {return 'lead';}
  if (lowerText.includes('senior') || lowerText.includes('sr.') || lowerText.includes('sr ')) {return 'senior';}

  // Default to mid if can't determine
  return 'mid';
}

/**
 * Extract salary range from description
 */
function extractSalaryRange(description: string): string | null {
  // Match patterns like $100,000 - $150,000 or $100k - $150k
  const salaryPattern = /\$[\d,]+(?:k|K)?\s*[-–—to]+\s*\$[\d,]+(?:k|K)?(?:\s*(?:per\s+)?(?:year|annual|yearly))?/i;
  const match = description.match(salaryPattern);

  if (match) {
    return match[0];
  }

  // Try simpler pattern for single values
  const singlePattern = /\$[\d,]+(?:k|K)?(?:\s*[-+])?(?:\s*(?:per\s+)?(?:year|annual|yearly))/i;
  const singleMatch = description.match(singlePattern);

  if (singleMatch) {
    return singleMatch[0];
  }

  return null;
}