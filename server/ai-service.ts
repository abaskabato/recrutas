/**
 * AI Service — screening questions, job summarization, insights.
 *
 * Job matching/scoring has been consolidated into `job-scorer.ts` (single source of truth).
 * This file only contains AI-powered features that require LLM calls.
 */

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

// Generate ML-powered job insights for candidate profile optimization
export async function generateJobInsights(candidateProfile: CandidateProfile): Promise<string[]> {
  const insights: string[] = [];

  const skillGaps = analyzeSkillGaps(candidateProfile.skills);
  if (skillGaps.length > 0) {
    insights.push(`Consider developing skills in: ${skillGaps.slice(0, 3).join(', ')}`);
  }

  if (candidateProfile.experience.length < 100) {
    insights.push('Expand your experience description to better showcase your achievements');
  }

  if (!candidateProfile.workType) {
    insights.push('Specify your work type preference (remote, hybrid, onsite) to get better matches');
  }

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

  await new Promise(resolve => setTimeout(resolve, 500));

  return questions;
}

/**
 * GPT-powered job description summarization
 */
export async function summarizeJobDescription(description: string, title?: string, company?: string): Promise<JobSummary> {
  const groqClient = getGroqClient();
  if (!process.env.GEMINI_API_KEY && !groqClient) {
    return generateRuleBasedSummary(description, title, company);
  }

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

    setCachedSummary(cacheKey, JSON.stringify(result));
    return result;

  } catch (error: any) {
    console.error('[AI Service] Job summarization error:', error.message);
    return generateRuleBasedSummary(description, title, company);
  }
}

function generateRuleBasedSummary(description: string, title?: string, company?: string): JobSummary {
  const techSkills = extractTechSkillsFromText(description);
  const mustHave = techSkills.slice(0, 5);
  const niceToHave = techSkills.slice(5, 8);
  const responsibilities = extractResponsibilities(description);
  const seniority = inferSeniorityLevel(title || description);
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

function generateFallbackSummary(title?: string, company?: string, description?: string): string {
  const parts: string[] = [];

  if (title && company) {
    parts.push(`${title} position at ${company}.`);
  } else if (title) {
    parts.push(`${title} role.`);
  }

  if (description) {
    const sentences = description.split(/[.!?]/).filter(s => s.trim().length > 20);
    if (sentences[0]) {
      parts.push(sentences[0].trim() + '.');
    }
  }

  return parts.join(' ') || 'Exciting opportunity to join the team.';
}

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

function extractResponsibilities(description: string): string[] {
  const lines = description.split(/[\n\r]+/);
  const responsibilities: string[] = [];

  const actionVerbs = ['build', 'develop', 'design', 'implement', 'create', 'lead', 'manage',
    'collaborate', 'work', 'drive', 'own', 'define', 'architect', 'write', 'maintain'];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.match(/^[-•*]\s+/) || trimmed.match(/^\d+[.)]\s+/)) {
      const content = trimmed.replace(/^[-•*\d.)]+\s*/, '');
      if (content.length > 10 && content.length < 200) {
        responsibilities.push(content);
      }
    }
    else if (trimmed.length > 20 && trimmed.length < 200) {
      const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
      if (actionVerbs.includes(firstWord)) {
        responsibilities.push(trimmed);
      }
    }
  }

  return responsibilities;
}

function inferSeniorityLevel(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('intern') || lowerText.includes('internship')) {return 'intern';}
  if (lowerText.includes('junior') || lowerText.includes('entry level') || lowerText.includes('entry-level')) {return 'junior';}
  if (lowerText.includes('principal') || lowerText.includes('staff')) {return 'principal';}
  if (lowerText.includes('director') || lowerText.includes('vp ') || lowerText.includes('vice president')) {return 'director';}
  if (lowerText.includes('lead') || lowerText.includes('manager')) {return 'lead';}
  if (lowerText.includes('senior') || lowerText.includes('sr.') || lowerText.includes('sr ')) {return 'senior';}

  return 'mid';
}

function extractSalaryRange(description: string): string | null {
  const salaryPattern = /\$[\d,]+(?:k|K)?\s*[-–—to]+\s*\$[\d,]+(?:k|K)?(?:\s*(?:per\s+)?(?:year|annual|yearly))?/i;
  const match = description.match(salaryPattern);
  if (match) return match[0];

  const singlePattern = /\$[\d,]+(?:k|K)?(?:\s*[-+])?(?:\s*(?:per\s+)?(?:year|annual|yearly))/i;
  const singleMatch = description.match(singlePattern);
  if (singleMatch) return singleMatch[0];

  return null;
}
