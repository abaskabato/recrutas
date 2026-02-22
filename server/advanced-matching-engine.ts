import { generateJobMatch } from './ai-service';
import { storage } from './storage';
import { sql } from "drizzle-orm/sql";
import { generateEmbedding, cosineSimilarity, generateCandidateEmbedding } from './ml-matching.js';
import { semanticJobSearch, indexJobForSearch, hybridJobSearch, type SearchResult } from './vector-search.js';
import { rankJobsWithLTR, learnToRank, type RankableJob, type CandidateProfile, type RankedJob } from './learn-to-rank.js';
import { db } from './db.js';
import { jobPostings } from '../shared/schema.js';

export class MatchingEngineError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'MatchingEngineError';
  }
}

export interface EnhancedJobMatch {
  jobId: number;
  matchScore: number;
  confidenceLevel: number;
  skillMatches: string[];
  aiExplanation: string;
  urgencyScore: number;
  semanticRelevance: number;
  recencyScore: number;
  livenessScore: number;
  personalizationScore: number;
  finalScore: number;
  trustScore: number;
  livenessStatus: 'active' | 'stale' | 'unknown';
  isVerifiedActive: boolean;
  isDirectFromCompany: boolean;
  compatibilityFactors: {
    skillAlignment: number;
    experienceMatch: number;
    locationFit: number;
    salaryMatch: number;
    industryRelevance: number;
  };
}

interface AdvancedMatchCriteria {
  candidateId: string;
  skills: string[];
  experience: string;
  location?: string;
  salaryExpectation?: number;
  workType?: 'remote' | 'hybrid' | 'onsite';
  industry?: string;
}

// PRD Ranking Weights
const RANKING_WEIGHTS = {
  SEMANTIC_RELEVANCE: 0.45,  // w1 - skill/experience match
  RECENCY: 0.25,             // w2 - prefer newer jobs
  LIVENESS: 0.20,            // w3 - verified active jobs
  PERSONALIZATION: 0.10     // w4 - user behavior signals
};

// Sources that publish directly from company ATSs (direct-from-company badge)
const ATS_SOURCES = new Set(['greenhouse', 'lever', 'workday', 'company-api', 'platform']);

export class AdvancedMatchingEngine {
  private matchCache: Map<string, EnhancedJobMatch[]> = new Map();
  private readonly CACHE_DURATION = 60 * 1000; // 1 minute for fresh matches
  private static readonly MAX_CACHE_SIZE = 200;

  async generateAdvancedMatches(criteria: AdvancedMatchCriteria): Promise<EnhancedJobMatch[]> {
    const cacheKey = this.generateCacheKey(criteria);
    const cached = this.matchCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Fetch available jobs from multiple sources
      const [internalJobs, externalJobs] = await Promise.all([
        storage.getJobPostings(''),
        this.fetchExternalJobs(criteria)
      ]);

      const allJobs = [...internalJobs, ...externalJobs];

      // Limit to 500 jobs, prioritizing most recent
      allJobs.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
        return dateB - dateA;
      });
      const limitedJobs = allJobs.slice(0, 500);

      const matches: EnhancedJobMatch[] = [];

      // Process each job for advanced matching
      for (const job of limitedJobs) {
        const match = await this.calculateAdvancedMatch(criteria, job);
        if (match.matchScore >= 0.6) { // Only include good matches
          matches.push(match);
        }
      }

      // Sort by PRD hybrid formula: FinalScore = w1*Semantic + w2*Recency + w3*Liveness + w4*Personalization
      matches.sort((a, b) => b.finalScore - a.finalScore);

      // Cache results with size limit to prevent unbounded growth
      if (this.matchCache.size >= AdvancedMatchingEngine.MAX_CACHE_SIZE) {
        const oldestKey = this.matchCache.keys().next().value;
        if (oldestKey !== undefined) this.matchCache.delete(oldestKey);
      }
      this.matchCache.set(cacheKey, matches.slice(0, 50)); // Top 50 matches
      setTimeout(() => this.matchCache.delete(cacheKey), this.CACHE_DURATION);

      return matches;
    } catch (error) {
      console.error('Advanced matching error:', error);
      throw new MatchingEngineError(
        'Failed to generate job matches. Please try again later.',
        error instanceof Error ? error : undefined
      );
    }
  }

  private async calculateAdvancedMatch(criteria: AdvancedMatchCriteria, job: any): Promise<EnhancedJobMatch> {
    // Use AI service for basic matching
    const aiMatch = await generateJobMatch({
      skills: criteria.skills,
      experience: criteria.experience,
      location: criteria.location,
      workType: criteria.workType,
      industry: criteria.industry
    }, {
      title: job.title,
      company: job.company,
      skills: job.skills || [],
      requirements: job.requirements || [],
      description: job.description,
      location: job.location,
      workType: job.workType,
      industry: job.industry
    });

    // Calculate detailed compatibility factors
    const compatibilityFactors = this.calculateCompatibilityFactors(criteria, job);

    // Calculate urgency score based on job characteristics
    const urgencyScore = this.calculateUrgencyScore(job);

    // PRD: Calculate semantic relevance (skill/experience match)
    const semanticRelevance = aiMatch.score;

    // PRD: Calculate recency score (prefer newer jobs)
    const recencyScore = this.calculateRecencyScore(job);

    // PRD: Calculate liveness score (verified active jobs)
    const { livenessScore, trustScore, livenessStatus } = this.calculateLivenessScore(job);

    // PRD: Calculate personalization score (user behavior signals)
    const personalizationScore = this.calculatePersonalizationScore(criteria, job);

    // PRD: Final hybrid ranking formula
    const finalScore =
      RANKING_WEIGHTS.SEMANTIC_RELEVANCE * semanticRelevance +
      RANKING_WEIGHTS.RECENCY * recencyScore +
      RANKING_WEIGHTS.LIVENESS * livenessScore +
      RANKING_WEIGHTS.PERSONALIZATION * personalizationScore;

    // Determine trust badges
    const isVerifiedActive = trustScore >= 85 && livenessStatus === 'active';
    const isDirectFromCompany = ATS_SOURCES.has((job.source || '').toLowerCase());

    return {
      jobId: job.id,
      matchScore: aiMatch.score,
      confidenceLevel: aiMatch.confidenceLevel,
      skillMatches: aiMatch.skillMatches,
      aiExplanation: aiMatch.aiExplanation,
      urgencyScore,
      semanticRelevance,
      recencyScore,
      livenessScore,
      personalizationScore,
      finalScore,
      trustScore,
      livenessStatus,
      isVerifiedActive,
      isDirectFromCompany,
      compatibilityFactors
    };
  }

  /**
   * PRD: Calculate recency score - prefer newer jobs
   * Jobs posted recently get higher scores
   */
  private calculateRecencyScore(job: any): number {
    if (!job.createdAt && !job.postedDate) return 0.5;

    const postedDate = new Date(job.postedDate || job.createdAt);
    const daysSincePosted = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24);

    // Scoring:
    // < 1 day: 1.0
    // 1-3 days: 0.9
    // 3-7 days: 0.8
    // 7-14 days: 0.6
    // 14-30 days: 0.4
    // > 30 days: 0.2
    if (daysSincePosted < 1) return 1.0;
    if (daysSincePosted < 3) return 0.9;
    if (daysSincePosted < 7) return 0.8;
    if (daysSincePosted < 14) return 0.6;
    if (daysSincePosted < 30) return 0.4;
    return 0.2;
  }

  /**
   * PRD: Calculate liveness/trust score
   * Internal jobs get highest trust, verified external jobs score based on liveness checks
   */
  private calculateLivenessScore(job: any): { livenessScore: number; trustScore: number; livenessStatus: 'active' | 'stale' | 'unknown' } {
    // Internal/platform jobs always get highest trust
    if (job.source === 'platform' || job.source === 'internal') {
      return {
        livenessScore: 1.0,
        trustScore: 100,
        livenessStatus: 'active'
      };
    }

    // Use stored trust score if available
    const trustScore = job.trustScore ?? 50;
    const livenessStatus = job.livenessStatus ?? 'unknown';

    // Calculate liveness score based on trust and status
    let livenessScore = trustScore / 100;

    // Boost for recently verified active jobs
    if (livenessStatus === 'active' && job.lastLivenessCheck) {
      const hoursSinceCheck = (Date.now() - new Date(job.lastLivenessCheck).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCheck < 24) livenessScore = Math.min(1.0, livenessScore + 0.1);
    }

    // Time-decay: downgrade jobs that haven't been re-verified recently
    if (job.lastLivenessCheck) {
      const hoursSinceCheck = (Date.now() - new Date(job.lastLivenessCheck).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCheck > 336) {       // > 14 days
        livenessScore *= 0.55;
      } else if (hoursSinceCheck > 168) { // > 7 days
        livenessScore *= 0.70;
      } else if (hoursSinceCheck > 72) {  // > 3 days
        livenessScore *= 0.85;
      }
    }

    // Penalty for stale jobs
    if (livenessStatus === 'stale') {
      livenessScore *= 0.3;
    }

    return {
      livenessScore,
      trustScore,
      livenessStatus: livenessStatus as 'active' | 'stale' | 'unknown'
    };
  }

  /**
   * PRD: Calculate personalization score based on user behavior signals
   */
  private calculatePersonalizationScore(criteria: AdvancedMatchCriteria, job: any): number {
    let score = 0.5; // Base personalization score

    // Boost for matching work type preference
    if (criteria.workType && job.workType === criteria.workType) {
      score += 0.2;
    }

    // Boost for matching industry
    if (criteria.industry && job.industry &&
        criteria.industry.toLowerCase() === job.industry.toLowerCase()) {
      score += 0.2;
    }

    // Boost for salary alignment
    if (criteria.salaryExpectation && job.salaryMin && job.salaryMax) {
      const midSalary = (job.salaryMin + job.salaryMax) / 2;
      const salaryDiff = Math.abs(criteria.salaryExpectation - midSalary);
      const salaryAlignment = Math.max(0, 1 - salaryDiff / criteria.salaryExpectation);
      score += 0.1 * salaryAlignment;
    }

    return Math.min(1.0, score);
  }

  private calculateCompatibilityFactors(criteria: AdvancedMatchCriteria, job: any) {
    const factors = {
      skillAlignment: 0,
      experienceMatch: 0,
      locationFit: 1,
      salaryMatch: 1,
      industryRelevance: 0.5
    };

    // Skill alignment calculation
    const jobSkills = job.skills || [];
    const candidateSkills = criteria.skills || [];
    const matchingSkills = candidateSkills.filter(skill =>
      jobSkills.some((jobSkill: string) =>
        jobSkill.toLowerCase() === skill.toLowerCase()
      )
    );
    factors.skillAlignment = jobSkills.length > 0 ? matchingSkills.length / jobSkills.length : 0;

    // Experience matching
    if (job.experienceLevel && criteria.experience) {
      const experienceMap: Record<string, number> = {
        'entry': 1, 'junior': 1, 'mid': 2, 'senior': 3, 'lead': 4, 'principal': 5
      };
      const candidateLevel = experienceMap[criteria.experience.toLowerCase()] || 2;
      const jobLevel = experienceMap[job.experienceLevel.toLowerCase()] || 2;
      factors.experienceMatch = Math.max(0, 1 - Math.abs(candidateLevel - jobLevel) * 0.2);
    }

    // Location compatibility
    if (criteria.location && job.location) {
      if (job.workType === 'remote' || criteria.workType === 'remote') {
        factors.locationFit = 1;
      } else {
        const distance = this.calculateLocationDistance(criteria.location, job.location);
        factors.locationFit = Math.max(0, 1 - distance / 100); // Normalize by 100 miles
      }
    }

    // Salary matching
    if (criteria.salaryExpectation && job.salaryMin && job.salaryMax) {
      const jobSalaryMid = (job.salaryMin + job.salaryMax) / 2;
      const salaryDiff = Math.abs(criteria.salaryExpectation - jobSalaryMid);
      factors.salaryMatch = Math.max(0, 1 - salaryDiff / criteria.salaryExpectation);
    }

    // Industry relevance
    if (criteria.industry && job.industry) {
      factors.industryRelevance = criteria.industry.toLowerCase() === job.industry.toLowerCase() ? 1 : 0.3;
    }

    return factors;
  }

  private calculateUrgencyScore(job: any): number {
    let urgency = 0.5; // Base urgency

    // Time-based urgency
    if (job.postedDate) {
      const daysSincePosted = (Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePosted < 1) urgency += 0.3; // Very fresh
      else if (daysSincePosted < 3) urgency += 0.2; // Fresh
      else if (daysSincePosted > 30) urgency -= 0.2; // Old
    }

    // Company priority (Fortune 500, unicorns, etc.)
    const priorityCompanies = ['google', 'apple', 'microsoft', 'amazon', 'meta', 'tesla', 'netflix'];
    if (priorityCompanies.some(company => job.company.toLowerCase().includes(company))) {
      urgency += 0.2;
    }

    // Application count (fewer applications = higher urgency)
    if (job.applicationCount !== undefined) {
      if (job.applicationCount < 10) urgency += 0.2;
      else if (job.applicationCount > 100) urgency -= 0.1;
    }

    // Remote work bonus
    if (job.workType === 'remote') {
      urgency += 0.1;
    }

    return Math.min(1, Math.max(0, urgency));
  }

  private calculateLocationDistance(loc1: string, loc2: string): number {
    // Simplified distance calculation (in practice, would use geolocation API)
    const majorCities: Record<string, {lat: number, lng: number}> = {
      'san francisco': {lat: 37.7749, lng: -122.4194},
      'new york': {lat: 40.7128, lng: -74.0060},
      'seattle': {lat: 47.6062, lng: -122.3321},
      'austin': {lat: 30.2672, lng: -97.7431},
      'denver': {lat: 39.7392, lng: -104.9903},
      'chicago': {lat: 41.8781, lng: -87.6298},
      'boston': {lat: 42.3601, lng: -71.0589},
      'los angeles': {lat: 34.0522, lng: -118.2437}
    };

    const city1 = majorCities[loc1.toLowerCase()];
    const city2 = majorCities[loc2.toLowerCase()];

    if (!city1 || !city2) return 50; // Default distance for unknown cities

    // Haversine formula for distance calculation
    const R = 3959; // Earth's radius in miles
    const dLat = (city2.lat - city1.lat) * Math.PI / 180;
    const dLng = (city2.lng - city1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(city1.lat * Math.PI / 180) * Math.cos(city2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private async fetchExternalJobs(criteria: AdvancedMatchCriteria): Promise<any[]> {
    // Fetch real external jobs from the database
    try {
      const { db } = await import('./db.js');
      const { jobPostings } = await import('../shared/schema.js');
      
      // Only fetch external jobs (have an externalUrl), excluding likely ghost jobs
      const externalJobs = await db
        .select()
        .from(jobPostings)
        .where(sql`${jobPostings.status} = 'active' AND ${jobPostings.externalUrl} IS NOT NULL AND (${jobPostings.ghostJobScore} IS NULL OR ${jobPostings.ghostJobScore} < 60)`)
        .limit(200);

      return externalJobs.map((job: any) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        workType: job.workType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        description: job.description,
        skills: job.skills || [],
        source: job.source || 'external',
        externalUrl: job.externalUrl,
        postedDate: job.createdAt?.toISOString() || new Date().toISOString(),
        requirements: [],
      }));
    } catch (error) {
      console.error('[AdvancedMatchingEngine] Error fetching external jobs:', error);
      return [];
    }
  }

  private generateCacheKey(criteria: AdvancedMatchCriteria): string {
    const skills = criteria.skills || [];
    return `${criteria.candidateId}_${skills.join(',')}_${criteria.location || ''}_${criteria.workType || ''}`;
  }

  async getPersonalizedJobFeed(candidateId: string, limit: number = 20): Promise<EnhancedJobMatch[]> {
    try {
      // Get candidate profile
      const profile = await storage.getCandidateUser(candidateId);
      if (!profile) return [];

      const criteria: AdvancedMatchCriteria = {
        candidateId,
        skills: profile.skills || [],
        experience: profile.experience || 'mid',
        location: profile.location || undefined,
        workType: profile.workType as any,
        industry: profile.industry || undefined
      };

      const matches = await this.generateAdvancedMatches(criteria);
      return matches.slice(0, limit);
    } catch (error) {
      console.error('Personalized feed error:', error);
      return [];
    }
  }

  async updateMatchPreferences(candidateId: string, preferences: Partial<AdvancedMatchCriteria>): Promise<void> {
    // Store updated preferences for future matching
    await storage.upsertCandidateUser({
      userId: candidateId,
      workType: preferences.workType,
      industry: preferences.industry,
      location: preferences.location
    });

    // Clear cache to force refresh
    const keys = Array.from(this.matchCache.keys()).filter(key => key.startsWith(candidateId));
    keys.forEach(key => this.matchCache.delete(key));
  }

  async generateSOTAMatches(criteria: AdvancedMatchCriteria, limit: number = 50): Promise<EnhancedJobMatch[]> {
    try {
      console.log('[SOTA Matching] Starting SOTA job matching...');
      
      const [internalJobs, externalJobs] = await Promise.all([
        storage.getJobPostings(''),
        this.fetchExternalJobs(criteria)
      ]);

      const allJobs = [...internalJobs, ...externalJobs];

      const rankableJobs: RankableJob[] = allJobs.map(job => ({
        jobId: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        skills: job.skills || [],
        requirements: job.requirements || [],
        experienceLevel: job.experienceLevel,
        workType: job.workType as any,
        location: job.location,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        source: job.source,
        createdAt: job.createdAt,
        applicationCount: job.applicationCount,
        trustScore: job.trustScore,
      }));

      const candidate: CandidateProfile = {
        candidateId: criteria.candidateId,
        skills: criteria.skills,
        experience: criteria.experience,
        workType: criteria.workType,
        location: criteria.location,
        salaryMin: criteria.salaryExpectation,
        industry: criteria.industry,
      };

      const mlScores = new Map<number, { semantic?: number; skillMatch?: number }>();
      for (const job of rankableJobs.slice(0, 100)) {
        try {
          const jobText = [job.title, ...job.skills, job.description?.slice(0, 500)].join(' ');
          const candidateText = [...criteria.skills, criteria.experience].join(' ');
          
          const [jobEmb, candEmb] = await Promise.all([
            generateEmbedding(jobText),
            generateEmbedding(candidateText)
          ]);
          
          const semanticSim = cosineSimilarity(jobEmb.embedding, candEmb.embedding);
          const skillMatch = this.calculateSimpleSkillMatch(criteria.skills, job.skills);
          
          mlScores.set(job.jobId, { semantic: semanticSim, skillMatch });
        } catch (e) {
          console.warn(`[SOTA Matching] Could not compute ML score for job ${job.jobId}:`, e);
        }
      }

      console.log('[SOTA Matching] Running learn-to-rank model...');
      const rankedJobs = rankJobsWithLTR(rankableJobs, candidate, mlScores);

      const matches: EnhancedJobMatch[] = rankedJobs.slice(0, limit).map((ranked: RankedJob) => {
        const job = rankableJobs.find(j => j.jobId === ranked.jobId)!;
        
        return {
          jobId: ranked.jobId,
          matchScore: ranked.finalScore * 100,
          confidenceLevel: Math.round(ranked.finalScore * 100),
          skillMatches: ranked.features.skillMatchScore > 0.5 ? criteria.skills.slice(0, 5) : [],
          aiExplanation: ranked.explanation,
          urgencyScore: this.calculateUrgencyScore(job),
          semanticRelevance: ranked.features.semanticSimilarity,
          recencyScore: ranked.features.recencyScore,
          livenessScore: ranked.features.companyTrustScore,
          personalizationScore: ranked.features.personalizationScore,
          finalScore: ranked.finalScore,
          trustScore: ranked.features.companyTrustScore * 100,
          livenessStatus: ranked.features.companyTrustScore > 0.8 ? 'active' : 'unknown',
          isVerifiedActive: ranked.features.companyTrustScore > 0.85,
          isDirectFromCompany: ATS_SOURCES.has((job.source || '').toLowerCase()),
          compatibilityFactors: {
            skillAlignment: ranked.features.skillMatchScore,
            experienceMatch: ranked.features.experienceAlignment,
            locationFit: ranked.features.locationFit,
            salaryMatch: ranked.features.salaryFit,
            industryRelevance: ranked.features.personalizationScore,
          },
        };
      });

      console.log(`[SOTA Matching] Generated ${matches.length} ranked jobs`);
      return matches;
    } catch (error) {
      console.error('[SOTA Matching] Error:', error);
      throw new MatchingEngineError('SOTA matching failed', error instanceof Error ? error : undefined);
    }
  }

  private calculateSimpleSkillMatch(candidateSkills: string[], jobSkills: string[]): number {
    if (!candidateSkills?.length || !jobSkills?.length) return 0;
    
    const normalizedCand = candidateSkills.map(s => s.toLowerCase());
    const normalizedJob = jobSkills.map(s => s.toLowerCase());
    
    let matches = 0;
    for (const cs of normalizedCand) {
      if (normalizedJob.some(js => js.includes(cs) || cs.includes(js))) {
        matches++;
      }
    }
    
    return Math.min(matches / normalizedJob.length, 1);
  }

  getLTRStats() {
    return learnToRank.getStats();
  }

  async fastMatchWithStoredEmbeddings(
    criteria: AdvancedMatchCriteria,
    limit: number = 20
  ): Promise<EnhancedJobMatch[]> {
    try {
      const candidateText = [...criteria.skills, criteria.experience].join(' ');
      const candidateEmbedding = await generateCandidateEmbedding(criteria.skills, criteria.experience);

      const jobsWithEmbeddings = await db
        .select({
          id: jobPostings.id,
          title: jobPostings.title,
          company: jobPostings.company,
          description: jobPostings.description,
          skills: jobPostings.skills,
          location: jobPostings.location,
          workType: jobPostings.workType,
          salaryMin: jobPostings.salaryMin,
          salaryMax: jobPostings.salaryMax,
          source: jobPostings.source,
          status: jobPostings.status,
          createdAt: jobPostings.createdAt,
          trustScore: jobPostings.trustScore,
          vectorEmbedding: jobPostings.vectorEmbedding,
        })
        .from(jobPostings)
        .where(sql`${jobPostings.status} = 'active' AND ${jobPostings.vectorEmbedding} IS NOT NULL`)
        .limit(500);

      const matches: EnhancedJobMatch[] = [];

      for (const job of jobsWithEmbeddings) {
        if (!job.vectorEmbedding) continue;

        try {
          const jobEmbedding = JSON.parse(job.vectorEmbedding);
          const semanticSim = cosineSimilarity(candidateEmbedding, jobEmbedding);
          const skillMatch = this.calculateSimpleSkillMatch(criteria.skills, job.skills || []);

          const finalScore = (semanticSim * 0.6) + (skillMatch * 0.4);

          if (finalScore >= 0.3) {
            matches.push({
              jobId: job.id,
              matchScore: finalScore * 100,
              confidenceLevel: Math.round(finalScore * 100),
              skillMatches: criteria.skills.filter(s => 
                (job.skills || []).some((js: string) => js.toLowerCase().includes(s.toLowerCase()))
              ),
              aiExplanation: `Semantic match: ${Math.round(semanticSim * 100)}%, Skill match: ${Math.round(skillMatch * 100)}%`,
              urgencyScore: 0.5,
              semanticRelevance: semanticSim,
              recencyScore: this.calculateRecencyScore(job),
              livenessScore: (job.trustScore || 50) / 100,
              personalizationScore: 0.5,
              finalScore,
              trustScore: job.trustScore || 50,
              livenessStatus: (job.trustScore || 50) > 70 ? 'active' : 'unknown',
              isVerifiedActive: (job.trustScore || 50) > 85,
              isDirectFromCompany: ATS_SOURCES.has((job.source || '').toLowerCase()),
              compatibilityFactors: {
                skillAlignment: skillMatch,
                experienceMatch: 0.5,
                locationFit: 0.5,
                salaryMatch: 0.5,
                industryRelevance: 0.5,
              },
            });
          }
        } catch (e) {
          console.warn(`[FastMatch] Error processing job ${job.id}:`, e);
        }
      }

      matches.sort((a, b) => b.finalScore - a.finalScore);
      return matches.slice(0, limit);
    } catch (error) {
      console.error('[FastMatch] Error:', error);
      return [];
    }
  }
}

export const advancedMatchingEngine = new AdvancedMatchingEngine();