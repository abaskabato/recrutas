/**
 * Shared job scoring module — single source of truth for all matching logic.
 *
 * Blends keyword matching, semantic embedding similarity, and job title/role
 * relevance. All scoring is synchronous — no API calls on the request path.
 *
 * Score weights:
 *   Keyword skill match:  35%
 *   Semantic embedding:   25%  (falls back to keyword-only when no vectors)
 *   Title/role relevance: 25%
 *   Experience level:     15%
 *   Context bonus:        +0-8 points (location + work type, additive)
 *
 * Hard caps:
 *   - No skill overlap AND no role family match → capped at 25%
 *   - Prevents unrelated jobs from surfacing via semantic noise alone
 */

import { parseSkillsInput, getRelatedSkills } from './skill-normalizer';
import { extractSkillsFromText } from './utils/skill-extractor';
import { cosineSimilarity } from './ml-matching';

// ── Types ──────────────────────────────────────────────────────────

export interface JobLike {
  title?: string | null;
  description?: string | null;
  skills?: string[] | null;
  vectorEmbedding?: string | null;
  embeddingUpdatedAt?: Date | null;
  location?: string | null;
  workType?: string | null;
}

export interface CandidateContext {
  location?: string | null;
  workType?: string | null;
}

export interface JobScore {
  matchScore: number;
  matchTier: 'great' | 'good' | 'worth-a-look';
  skillMatches: string[];
  partialSkillMatches: string[];
  aiExplanation: string;
  confidenceLevel: number;
}

// ── Role family extraction ─────────────────────────────────────────

const ROLE_FAMILIES: Array<[RegExp, string]> = [
  // IT / Support / Helpdesk
  [/(?:it support|help\s*desk|desktop support|technical support|support (?:engineer|specialist|technician|analyst))/i, 'it_support'],
  [/(?:system(?:s)?\s*admin|sysadmin)/i, 'systems_admin'],
  [/(?:network\s*(?:engineer|admin|technician))/i, 'network_engineer'],
  [/(?:database\s*admin|dba)/i, 'dba'],
  // Data
  [/data\s*scientist/i, 'data_scientist'],
  [/data\s*engineer/i, 'data_engineer'],
  [/data\s*analyst/i, 'data_analyst'],
  [/(?:machine\s*learning|ml)\s*engineer/i, 'ml_engineer'],
  // DevOps / Cloud / Infra
  [/(?:devops|site\s*reliability|sre)/i, 'devops'],
  [/cloud\s*(?:engineer|architect)/i, 'cloud_engineer'],
  [/(?:security\s*engineer|cybersecurity|infosec|soc\s*analyst)/i, 'security_engineer'],
  // QA
  [/(?:qa|quality\s*assurance|test\s*engineer|sdet)/i, 'qa_engineer'],
  // Mobile
  [/(?:mobile|ios|android)\s*(?:developer|engineer)/i, 'mobile_developer'],
  // Web / Full-stack
  [/(?:frontend|front[\s-]end)/i, 'frontend_developer'],
  [/(?:backend|back[\s-]end)/i, 'backend_developer'],
  [/full[\s.-]*stack/i, 'fullstack_developer'],
  [/software\s*(?:engineer|developer)/i, 'software_engineer'],
  [/web\s*developer/i, 'web_developer'],
  // Product / Design
  [/product\s*manager/i, 'product_manager'],
  [/product\s*designer/i, 'product_designer'],
  [/(?:ux|ui|ux\/ui)\s*designer/i, 'ux_designer'],
  [/graphic\s*designer/i, 'graphic_designer'],
  // Management
  [/engineering\s*manager/i, 'engineering_manager'],
  [/project\s*manager/i, 'project_manager'],
  [/program\s*manager/i, 'program_manager'],
  [/scrum\s*master/i, 'scrum_master'],
  // Business / Analysis
  [/business\s*analyst/i, 'business_analyst'],
  [/solutions?\s*architect/i, 'solutions_architect'],
  [/technical\s*writer/i, 'technical_writer'],
  // Legal / Finance / HR — distinct families that should NOT cross-match with tech
  [/(?:general\s*counsel|lawyer|attorney|legal\s*(?:counsel|advisor|officer))/i, 'legal'],
  [/(?:accountant|controller|cfo|finance\s*(?:manager|director|analyst))/i, 'finance'],
  [/(?:hr\s*(?:manager|director|partner|generalist)|human\s*resources|recruiter|talent\s*acquisition)/i, 'hr'],
  [/(?:marketing\s*(?:manager|director|specialist)|growth\s*(?:manager|lead)|brand\s*manager)/i, 'marketing'],
  [/(?:sales\s*(?:manager|director|rep|executive|engineer)|account\s*executive|bdr|sdr)/i, 'sales'],
  [/(?:operations\s*(?:manager|director)|office\s*manager|facilities)/i, 'operations'],
  // Generic fallbacks — only if nothing else matched
  [/analyst/i, 'analyst'],
  [/designer/i, 'designer'],
  [/engineer/i, 'engineer'],
  [/developer/i, 'developer'],
  [/manager/i, 'manager'],
  [/architect/i, 'architect'],
];

function extractRoleFamily(title: string): string | null {
  for (const [pattern, family] of ROLE_FAMILIES) {
    if (pattern.test(title)) return family;
  }
  return null;
}

/**
 * Map of related role families that get partial credit (0.5x).
 * Explicitly excludes cross-domain matches (legal, finance, hr, etc.)
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
  devops: ['cloud_engineer', 'systems_admin', 'backend_developer'],
  cloud_engineer: ['devops', 'systems_admin', 'solutions_architect'],
  systems_admin: ['devops', 'cloud_engineer', 'network_engineer', 'it_support'],
  network_engineer: ['systems_admin', 'devops', 'cloud_engineer', 'it_support'],
  it_support: ['systems_admin', 'network_engineer'],
  security_engineer: ['devops', 'systems_admin', 'network_engineer', 'engineer'],
  product_manager: ['program_manager', 'project_manager'],
  product_designer: ['ux_designer', 'graphic_designer', 'designer'],
  ux_designer: ['product_designer', 'graphic_designer', 'frontend_developer', 'designer'],
  engineering_manager: ['software_engineer', 'manager'],
  project_manager: ['program_manager', 'product_manager', 'scrum_master'],
  qa_engineer: ['software_engineer', 'developer'],
  solutions_architect: ['cloud_engineer', 'architect', 'software_engineer'],
  dba: ['data_engineer', 'backend_developer', 'systems_admin'],
  // Non-tech families — only relate to each other, never to tech roles
  legal: [],
  finance: [],
  hr: ['recruiter'],
  marketing: ['sales'],
  sales: ['marketing'],
  operations: [],
};

/**
 * Given candidate's previous job titles, return title keywords for DB retrieval.
 * Expands role families into searchable terms so the DB query pulls jobs
 * the scorer can evaluate — even when skill tags don't overlap.
 *
 * Example: "IT Support Specialist" → ["it support", "help desk", "desktop support",
 *   "technical support", "support engineer", "system admin", "network engineer"]
 */
const ROLE_FAMILY_KEYWORDS: Record<string, string[]> = {
  it_support: ['it support', 'help desk', 'desktop support', 'technical support', 'support specialist', 'support technician', 'support analyst', 'support engineer'],
  systems_admin: ['system admin', 'sysadmin', 'systems engineer', 'infrastructure'],
  network_engineer: ['network engineer', 'network admin', 'network technician'],
  dba: ['database admin', 'dba', 'database engineer'],
  data_scientist: ['data scientist', 'data science'],
  data_engineer: ['data engineer', 'data pipeline', 'data platform'],
  data_analyst: ['data analyst', 'business intelligence', 'bi analyst'],
  ml_engineer: ['machine learning', 'ml engineer', 'ai engineer'],
  devops: ['devops', 'site reliability', 'sre', 'platform engineer'],
  cloud_engineer: ['cloud engineer', 'cloud architect', 'aws engineer', 'azure engineer'],
  security_engineer: ['security engineer', 'cybersecurity', 'infosec', 'soc analyst', 'security analyst'],
  qa_engineer: ['qa engineer', 'quality assurance', 'test engineer', 'sdet', 'qa analyst'],
  mobile_developer: ['mobile developer', 'ios developer', 'android developer', 'mobile engineer'],
  frontend_developer: ['frontend', 'front-end', 'front end', 'ui developer', 'ui engineer'],
  backend_developer: ['backend', 'back-end', 'back end', 'server engineer'],
  fullstack_developer: ['full stack', 'fullstack'],
  software_engineer: ['software engineer', 'software developer', 'swe'],
  web_developer: ['web developer', 'web engineer'],
  product_manager: ['product manager', 'product owner'],
  product_designer: ['product designer'],
  ux_designer: ['ux designer', 'ui designer', 'ux/ui', 'interaction designer'],
  graphic_designer: ['graphic designer', 'visual designer'],
  engineering_manager: ['engineering manager', 'dev manager'],
  project_manager: ['project manager', 'project coordinator'],
  program_manager: ['program manager', 'tpm', 'technical program'],
  scrum_master: ['scrum master', 'agile coach'],
  business_analyst: ['business analyst', 'business systems'],
  solutions_architect: ['solutions architect', 'solution architect', 'enterprise architect'],
  technical_writer: ['technical writer', 'documentation'],
  legal: ['general counsel', 'legal counsel', 'attorney', 'lawyer'],
  finance: ['finance manager', 'accountant', 'controller', 'financial analyst'],
  hr: ['human resources', 'hr manager', 'recruiter', 'talent acquisition'],
  marketing: ['marketing manager', 'growth manager', 'brand manager'],
  sales: ['sales manager', 'account executive', 'sales rep', 'bdr', 'sdr'],
  operations: ['operations manager', 'office manager'],
  analyst: ['analyst'],
  designer: ['designer'],
  engineer: ['engineer'],
  developer: ['developer'],
  manager: ['manager'],
  architect: ['architect'],
};

export function getRoleTitleKeywords(candidateTitles: string[]): string[] {
  if (candidateTitles.length === 0) return [];

  const families = new Set<string>();

  // Extract role families from all candidate titles
  for (const title of candidateTitles) {
    const family = extractRoleFamily(title);
    if (family) {
      families.add(family);
      // Also add related families for wider retrieval
      const related = RELATED_ROLE_FAMILIES[family];
      if (related) {
        for (const r of related) families.add(r);
      }
    }
  }

  // Convert families to searchable keywords
  const keywords = new Set<string>();
  for (const family of families) {
    const terms = ROLE_FAMILY_KEYWORDS[family];
    if (terms) {
      for (const term of terms) keywords.add(term);
    }
  }

  // Limit to prevent query explosion
  return Array.from(keywords).slice(0, 20);
}

const SENIORITY_LEVELS = ['intern', 'junior', 'mid', 'senior', 'staff', 'principal', 'lead', 'manager', 'director', 'vp', 'executive'];

function extractSeniority(title: string): string {
  const t = title.toLowerCase();
  if (/\b(intern|internship)\b/.test(t)) return 'intern';
  if (/\b(junior|jr\.?|entry)\b/.test(t)) return 'junior';
  if (/\b(senior|sr\.?)\b/.test(t)) return 'senior';
  if (/\bstaff\b/.test(t)) return 'staff';
  if (/\bprincipal\b/.test(t)) return 'principal';
  if (/\b(lead|team\s*lead)\b/.test(t)) return 'lead';
  if (/\bmanager\b/.test(t)) return 'manager';
  if (/\bdirector\b/.test(t)) return 'director';
  if (/\b(vp|vice\s*president)\b/.test(t)) return 'vp';
  if (/\b(chief|cto|ceo|coo|cfo)\b/.test(t)) return 'executive';
  return 'mid';
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Core scorer ────────────────────────────────────────────────────

/**
 * Score a single job against a candidate.
 *
 * @param candidateSkills  Pre-normalized skill strings
 * @param candidateExperienceLevel  e.g. 'entry' | 'mid' | 'senior' | null
 * @param job  Must have at least title; skills, description, vectorEmbedding optional
 * @param candidateEmbedding  Pre-parsed candidate vector (1024-dim), or undefined
 * @param candidateTitles  Previous job titles from resume (optional)
 * @param candidateContext  Location/work type for context bonus (optional)
 */
export function scoreJob(
  candidateSkills: string[],
  candidateExperienceLevel: string | null | undefined,
  job: JobLike,
  candidateEmbedding?: number[],
  candidateTitles?: string[],
  candidateContext?: CandidateContext,
): JobScore {
  // ── 1. Keyword matching (35%) ──────────────────────────────────

  const jobSkills = (job.skills && (job.skills as string[]).length > 0)
    ? job.skills
    : extractSkillsFromText(job.description || '');

  const normalizedCand = candidateSkills.map(s => s.toLowerCase());
  const normalizedJob = parseSkillsInput(jobSkills).map(s => s.toLowerCase());
  const jobSkillsCount = Math.max(normalizedJob.length, 3);

  const exactMatches: string[] = [];
  const exactMatchSet = new Set<string>();
  for (let i = 0; i < normalizedCand.length; i++) {
    if (normalizedJob.includes(normalizedCand[i]) && !exactMatchSet.has(normalizedCand[i])) {
      exactMatchSet.add(normalizedCand[i]);
      exactMatches.push(candidateSkills[i]);
    }
  }

  const partialMatches: string[] = [];
  const partialMatchSet = new Set<string>();
  for (const skill of candidateSkills) {
    for (const related of getRelatedSkills(skill)) {
      const r = related.toLowerCase();
      if (normalizedJob.includes(r) && !exactMatchSet.has(r) && !partialMatchSet.has(r)) {
        partialMatchSet.add(r);
        partialMatches.push(related);
      }
    }
  }

  const effectiveMatches = exactMatches.length + 0.5 * partialMatches.length;
  const keywordScore = Math.min(100, Math.round((effectiveMatches / jobSkillsCount) * 100));
  const hasSkillOverlap = effectiveMatches > 0;

  // ── 2. Semantic similarity (25%) ───────────────────────────────

  let semanticScore = 0;
  let hasSemanticSignal = false;

  if (candidateEmbedding && candidateEmbedding.length > 0 && job.vectorEmbedding) {
    try {
      const jobEmbedding: number[] = JSON.parse(job.vectorEmbedding);
      if (jobEmbedding.length === candidateEmbedding.length) {
        const similarity = cosineSimilarity(candidateEmbedding, jobEmbedding);
        // BGE-M3 similarity for related content typically ranges 0.3-0.8
        // Rescale to 0-100: floor at 0.3 (0%), ceiling at 0.8 (100%)
        semanticScore = Math.min(100, Math.max(0, Math.round(((similarity - 0.3) / 0.5) * 100)));
        hasSemanticSignal = true;
      }
    } catch { /* malformed embedding — skip */ }
  }

  // ── 3. Title/role relevance (25%) ──────────────────────────────

  const titleScore = scoreTitleRelevance(candidateTitles || [], job.title || '');
  const hasRoleMatch = titleScore >= 40; // meaningful role alignment

  // ── 4. Experience level (15%) ──────────────────────────────────

  let experienceScore = 50; // neutral default
  if (candidateExperienceLevel && job.title) {
    const multiplier = experienceLevelMultiplier(candidateExperienceLevel, job.title);
    experienceScore = Math.round(multiplier * 100);
  }

  // ── 5. Context bonus: location + work type (up to +8 points) ──
  // Additive bonus, not a percentage weight — rewards good fit without
  // inflating scores for irrelevant jobs. Max +8 so it can't flip a
  // bad match into a good one (30% threshold is still the gatekeeper).

  let contextBonus = 0;

  if (candidateContext) {
    const jobLoc = (job.location || '').toLowerCase();
    const candLoc = (candidateContext.location || '').toLowerCase();
    const jobWork = (job.workType || '').toLowerCase();
    const candWork = (candidateContext.workType || '').toLowerCase();

    // Location: +4 for match or remote job, +2 for same state/region
    if (jobLoc && candLoc) {
      const isRemoteJob = jobWork.includes('remote') || jobLoc.includes('remote');
      if (isRemoteJob) {
        contextBonus += 4; // remote = fits anyone
      } else if (candLoc === jobLoc || jobLoc.includes(candLoc) || candLoc.includes(jobLoc)) {
        contextBonus += 4; // same city/area
      } else {
        // Check same state (e.g. "Seattle, WA" and "Bellevue, WA" both contain "wa")
        const candState = candLoc.split(',').pop()?.trim();
        const jobState = jobLoc.split(',').pop()?.trim();
        if (candState && jobState && candState.length <= 3 && candState === jobState) {
          contextBonus += 2;
        }
      }
    }

    // Work type: +4 for exact match, +2 for hybrid↔remote/onsite
    if (jobWork && candWork) {
      if (candWork === jobWork) {
        contextBonus += 4;
      } else if (candWork === 'hybrid' || jobWork === 'hybrid') {
        contextBonus += 2; // hybrid is flexible
      }
    }
  }

  // ── Blend ─────────────────────────────────────────────────────

  let matchScore: number;

  if (hasSemanticSignal) {
    // Full blend: keyword 35% + semantic 25% + title 25% + experience 15%
    matchScore = Math.round(
      0.35 * keywordScore +
      0.25 * semanticScore +
      0.25 * titleScore +
      0.15 * experienceScore
    );
  } else {
    // No embeddings: keyword 50% + title 30% + experience 20%
    matchScore = Math.round(
      0.50 * keywordScore +
      0.30 * titleScore +
      0.20 * experienceScore
    );
  }

  // Apply context bonus (additive, capped at 100)
  matchScore = Math.min(100, matchScore + contextBonus);

  // ── Hard cap: no skill overlap AND no role match → max 25% ────
  // Prevents semantic noise from surfacing completely unrelated jobs
  if (!hasSkillOverlap && !hasRoleMatch) {
    matchScore = Math.min(matchScore, 25);
  }

  // ── Explanation ────────────────────────────────────────────────

  const explanationParts: string[] = [];

  if (titleScore >= 70) {
    explanationParts.push(`Strong role match for ${job.title}`);
  } else if (titleScore >= 40) {
    explanationParts.push(`Related role: ${job.title}`);
  }

  if (effectiveMatches > 0) {
    explanationParts.push(`${exactMatches.length} direct + ${partialMatches.length} related skill matches`);
  }

  if (hasSemanticSignal && semanticScore > 30) {
    explanationParts.push(`${semanticScore}% profile similarity`);
  }

  if (experienceScore >= 90) {
    explanationParts.push('Experience level aligns well');
  } else if (experienceScore < 60) {
    const jobLevel = inferJobLevel(job.title || '');
    const idx: Record<string, number> = { entry: 0, mid: 1, senior: 2, lead: 3, executive: 4 };
    const candIdx = idx[candidateExperienceLevel || 'mid'] ?? 1;
    explanationParts.push(candIdx > jobLevel ? 'Slightly above your level' : 'Stretch role');
  }

  if (contextBonus >= 6) {
    explanationParts.push('Good location & work type fit');
  } else if (contextBonus >= 4) {
    explanationParts.push('Location or work type matches');
  }

  if (explanationParts.length === 0) {
    explanationParts.push('Limited match — different role or skill set');
  }

  const explanation = explanationParts.join('. ');

  return {
    matchScore,
    matchTier: getMatchTier(matchScore),
    skillMatches: exactMatches,
    partialSkillMatches: partialMatches,
    aiExplanation: explanation,
    confidenceLevel: hasSemanticSignal ? 2 : 1,
  };
}

// ── Title/role scoring ────────────────────────────────────────────

/**
 * Score how well candidate's previous titles match the job title.
 * Returns 0-100.
 *
 * Three signals:
 *   1. Word overlap (Jaccard) — 30%
 *   2. Role family match — 50%
 *   3. Seniority alignment — 20%
 */
function scoreTitleRelevance(candidateTitles: string[], jobTitle: string): number {
  if (!jobTitle) return 50;
  if (candidateTitles.length === 0) return 50; // no data — neutral

  const normalizedJobTitle = normalizeTitle(jobTitle);
  const jobTitleWords = new Set(normalizedJobTitle.split(/\s+/).filter(w => w.length > 2));
  const jobRole = extractRoleFamily(jobTitle);
  const jobSeniority = extractSeniority(jobTitle);

  let bestScore = 0;

  for (const candidateTitle of candidateTitles) {
    const normalizedCandTitle = normalizeTitle(candidateTitle);
    const candTitleWords = new Set(normalizedCandTitle.split(/\s+/).filter(w => w.length > 2));
    const candRole = extractRoleFamily(candidateTitle);
    const candSeniority = extractSeniority(candidateTitle);

    let score = 0;

    // Signal 1: Word overlap (Jaccard) — 30 points max
    const intersection = new Set([...jobTitleWords].filter(w => candTitleWords.has(w)));
    const union = new Set([...jobTitleWords, ...candTitleWords]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;
    score += jaccard * 30;

    // Signal 2: Role family match — 50 points max
    if (jobRole && candRole) {
      if (jobRole === candRole) {
        score += 50; // Same role family
      } else {
        const related = RELATED_ROLE_FAMILIES[jobRole];
        if (related?.includes(candRole)) {
          score += 25; // Related role
        }
        // else: 0 — completely different role families
      }
    } else {
      score += 15; // Can't determine role — slight neutral credit
    }

    // Signal 3: Seniority alignment — 20 points max
    if (jobSeniority === candSeniority) {
      score += 20;
    } else {
      const diff = Math.abs(SENIORITY_LEVELS.indexOf(jobSeniority) - SENIORITY_LEVELS.indexOf(candSeniority));
      if (diff <= 1) score += 12;
      else if (diff <= 2) score += 6;
    }

    bestScore = Math.max(bestScore, score);
  }

  return Math.min(Math.round(bestScore), 100);
}

// ── Helpers ────────────────────────────────────────────────────────

export function getMatchTier(score: number): 'great' | 'good' | 'worth-a-look' {
  if (score >= 75) return 'great';
  if (score >= 50) return 'good';
  return 'worth-a-look';
}

export function getFreshnessLabel(createdAt: Date | null): { freshness: 'just-posted' | 'this-week' | 'recent'; daysOld: number } {
  if (!createdAt) return { freshness: 'recent', daysOld: 15 };
  const daysOld = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (daysOld <= 3) return { freshness: 'just-posted', daysOld };
  if (daysOld <= 7) return { freshness: 'this-week', daysOld };
  return { freshness: 'recent', daysOld };
}

export function computeRecencyScore(createdAt: Date | null | undefined): number {
  if (!createdAt) return 0.5;
  const daysOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld < 1) return 1.0;
  if (daysOld < 3) return 0.9;
  if (daysOld < 7) return 0.8;
  if (daysOld < 14) return 0.6;
  if (daysOld < 30) return 0.4;
  return 0.2;
}

export function inferJobLevel(title: string): number {
  const t = title.toLowerCase();
  if (/\b(junior|jr\.?|entry[\s-]level|associate|trainee|intern|graduate)\b/.test(t)) return 0;
  if (/\b(senior|sr\.?)\b/.test(t)) return 2;
  if (/\b(staff|lead|principal|manager)\b/.test(t)) return 3;
  if (/\b(director|vp|vice[\s-]president|head of|chief|cto|ceo)\b/.test(t)) return 4;
  return 1;
}

/**
 * Asymmetric experience multiplier:
 *   Over-qualified  → lighter penalty (you can do the work)
 *   Under-qualified → heavier penalty (it's a stretch)
 */
export function experienceLevelMultiplier(candidateLevel: string, jobTitle: string): number {
  const idx: Record<string, number> = { entry: 0, mid: 1, senior: 2, lead: 3, executive: 4 };
  const candidateIdx = idx[candidateLevel] ?? 1;
  const jobIdx = inferJobLevel(jobTitle);
  const diff = candidateIdx - jobIdx;

  if (diff === 0) return 1.00;

  if (diff > 0) {
    if (diff === 1) return 0.90;
    if (diff === 2) return 0.75;
    return 0.60;
  }

  if (diff === -1) return 0.80;
  if (diff === -2) return 0.60;
  return 0.40;
}
