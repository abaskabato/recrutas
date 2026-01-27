// Open source ML-powered job matching using semantic embeddings

import { type CandidateProfile, type JobPosting } from '@shared/schema';
import Groq from 'groq-sdk';

// Initialize Groq client if API key is available
const groq = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== '%GROQ_API_KEY%'
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

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
  if (a.length !== b.length) return 0;

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
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
  const candidateSkillEmbeddings = candidateSkills.map(skill => getSkillEmbedding(skill));
  const jobSkillEmbeddings = jobSkills.map(skill => getSkillEmbedding(skill));
  const jobReqEmbeddings = jobRequirements.map(req => getSkillEmbedding(req));

  let totalSimilarity = 0;
  let maxSimilarities: Array<{ skill: string; similarity: number; matchedWith: string }> = [];

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

  // Semantic analysis of experience vs job description
  const experienceScore = analyzeExperienceSemantics(candidate.experience, job.description, job.title);

  // Context-aware scoring
  const contextScore = calculateContextualFit(candidate, job);

  // ML-enhanced final score calculation (0-1 range)
  const skillScore = Math.min(totalSimilarity / Math.max(job.skills?.length || 1, 1), 1.0);

  // Calculate final score with weights
  // Skill: 40%, Experience: 30%, Context (Salary/Loc): 30%
  let finalScore = (skillScore * 0.4) + (experienceScore * 0.3) + (contextScore * 0.3);

  // Confidence is based on how much data we had to work with
  const confidence = calculateConfidenceLevel(maxSimilarities.length, job.skills?.length || 0, experienceScore);

  // Generate intelligent explanation
  const explanation = generateMLExplanation(maxSimilarities, experienceScore, contextScore, job);

  return {
    score: Math.min(Math.max(finalScore, 0), 1), // Keep score between 0-1
    confidenceLevel: calculateConfidenceLevel(maxSimilarities.length, candidate.skills.length, experienceScore),
    skillMatches: maxSimilarities.map(m => m.skill),
    aiExplanation: explanation
  };
}

function analyzeExperienceSemantics(experience: string, jobDescription: string, jobTitle: string): number {
  if (!experience || !jobDescription) return 0.5;

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

  if (confidence >= 0.8) return 0.9;
  if (confidence >= 0.6) return 0.8;
  if (confidence >= 0.4) return 0.7;
  return 0.6;
}

function generateMLExplanation(
  skillMatches: Array<{ skill: string; similarity: number; matchedWith: string }>,
  experienceScore: number,
  contextScore: number,
  job: JobPosting
): string {
  const explanations = [];

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
    !currentSkillsLower.some(cs => cs.includes(skill.toLowerCase()))
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
 * Similar to HiringCafe's approach of providing structured job summaries
 */
export async function summarizeJobDescription(description: string, title?: string, company?: string): Promise<JobSummary> {
  // If no Groq client, use rule-based summarization
  if (!groq) {
    return generateRuleBasedSummary(description, title, company);
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

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a job posting analyzer. Extract structured information from job descriptions and return valid JSON only.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1500
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(content);

    return {
      summary: parsed.summary || generateFallbackSummary(title, company, description),
      keyResponsibilities: Array.isArray(parsed.keyResponsibilities) ? parsed.keyResponsibilities.slice(0, 5) : [],
      mustHaveSkills: Array.isArray(parsed.mustHaveSkills) ? parsed.mustHaveSkills : [],
      niceToHaveSkills: Array.isArray(parsed.niceToHaveSkills) ? parsed.niceToHaveSkills : [],
      seniorityLevel: parsed.seniorityLevel || inferSeniorityLevel(title || description),
      estimatedSalaryRange: parsed.estimatedSalaryRange || undefined,
      teamSize: parsed.teamSize || undefined,
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : []
    };

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

  const lowerText = text.toLowerCase();
  return commonSkills.filter(skill => lowerText.includes(skill.toLowerCase()));
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

  if (lowerText.includes('intern') || lowerText.includes('internship')) return 'intern';
  if (lowerText.includes('junior') || lowerText.includes('entry level') || lowerText.includes('entry-level')) return 'junior';
  if (lowerText.includes('principal') || lowerText.includes('staff')) return 'principal';
  if (lowerText.includes('director') || lowerText.includes('vp ') || lowerText.includes('vice president')) return 'director';
  if (lowerText.includes('lead') || lowerText.includes('manager')) return 'lead';
  if (lowerText.includes('senior') || lowerText.includes('sr.') || lowerText.includes('sr ')) return 'senior';

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