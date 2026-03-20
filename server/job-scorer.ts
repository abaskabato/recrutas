/**
 * Shared job scoring module — single source of truth for all matching logic.
 *
 * Blends keyword matching with semantic embedding similarity when vectors
 * are available (pre-computed by batch cron / on profile save).
 * All scoring is synchronous — no API calls on the request path.
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
}

export interface JobScore {
  matchScore: number;
  matchTier: 'great' | 'good' | 'worth-a-look';
  skillMatches: string[];
  partialSkillMatches: string[];
  aiExplanation: string;
  confidenceLevel: number;
}

// ── Core scorer ────────────────────────────────────────────────────

/**
 * Score a single job against a candidate.
 *
 * @param candidateSkills  Pre-normalized skill strings
 * @param candidateExperienceLevel  e.g. 'entry' | 'mid' | 'senior' | null
 * @param job  Must have at least title; skills, description, vectorEmbedding optional
 * @param candidateEmbedding  Pre-parsed candidate vector (1024-dim), or undefined
 */
export function scoreJob(
  candidateSkills: string[],
  candidateExperienceLevel: string | null | undefined,
  job: JobLike,
  candidateEmbedding?: number[],
): JobScore {
  // ── Keyword matching ──────────────────────────────────────────

  // Scraped jobs often have skills: [] — extract from description
  const jobSkills = (job.skills && (job.skills as string[]).length > 0)
    ? job.skills
    : extractSkillsFromText(job.description || '');

  const normalizedCand = candidateSkills.map(s => s.toLowerCase());
  const normalizedJob = parseSkillsInput(jobSkills).map(s => s.toLowerCase());
  const jobSkillsCount = Math.max(normalizedJob.length, 3);

  // Exact matches (full credit)
  const exactMatches = normalizedCand.filter(s => normalizedJob.includes(s));
  const exactMatchSet = new Set(exactMatches);

  // Partial matches via SKILL_PARENTS (0.5x credit)
  const partialMatches: string[] = [];
  for (const skill of candidateSkills) {
    for (const related of getRelatedSkills(skill)) {
      const r = related.toLowerCase();
      if (normalizedJob.includes(r) && !exactMatchSet.has(r)) {
        partialMatches.push(related);
      }
    }
  }

  const effectiveMatches = exactMatches.length + 0.5 * partialMatches.length;
  const keywordScore = Math.min(100, Math.round((effectiveMatches / jobSkillsCount) * 100));

  // ── Semantic similarity (when both embeddings exist) ──────────

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

  // ── Blend ─────────────────────────────────────────────────────

  let matchScore: number;
  let explanation: string;

  if (hasSemanticSignal) {
    // Blend: 50% keyword + 50% semantic
    // This lets semantic rescue jobs that have poor skill tags but great description match,
    // while keyword matching keeps results grounded in explicit skill overlap.
    matchScore = Math.round(0.5 * keywordScore + 0.5 * semanticScore);
    const keywordPart = `${exactMatches.length} direct + ${partialMatches.length} related skill matches`;
    explanation = effectiveMatches > 0
      ? `${keywordPart} (${semanticScore}% semantic fit)`
      : `${semanticScore}% semantic fit`;
  } else {
    // Keyword only — no embedding available
    matchScore = keywordScore;
    explanation = effectiveMatches > 0
      ? `${exactMatches.length} direct + ${partialMatches.length} related skill matches`
      : 'No skill matches found';
  }

  // Apply experience-level multiplier
  if (candidateExperienceLevel && job.title) {
    const multiplier = experienceLevelMultiplier(candidateExperienceLevel, job.title);
    matchScore = Math.min(100, Math.round(matchScore * multiplier));
  }

  return {
    matchScore,
    matchTier: getMatchTier(matchScore),
    skillMatches: exactMatches,
    partialSkillMatches: partialMatches,
    aiExplanation: explanation,
    confidenceLevel: hasSemanticSignal ? 2 : 1,
  };
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
