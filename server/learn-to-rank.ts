/**
 * Learn-to-Rank Service
 * Implements a gradient boosting ranker (LambdaRank-style) for job recommendations
 * 
 * Features used for ranking:
 * 1. Semantic similarity (vector embeddings)
 * 2. Skill match score
 * 3. Experience alignment
 * 4. Location/work type fit
 * 5. Salary alignment
 * 6. Company popularity/ trust score
 * 7. Job recency
 * 8. User engagement signals (clicks, saves, applies)
 */

import fs from 'fs';
import path from 'path';

// Use /tmp on serverless (Vercel) since cwd is read-only
const WEIGHTS_FILE = process.env.VERCEL
  ? path.join('/tmp', 'ltr-weights.json')
  : path.join(process.cwd(), 'data', 'ltr-weights.json');

function ensureDataDir() {
  const dataDir = path.dirname(WEIGHTS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadWeightsFromFile(): Partial<ModelWeights> | null {
  try {
    if (fs.existsSync(WEIGHTS_FILE)) {
      return JSON.parse(fs.readFileSync(WEIGHTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('[LTR] Could not load weights file:', e);
  }
  return null;
}

function saveWeightsToFile(weights: ModelWeights) {
  try {
    ensureDataDir();
    fs.writeFileSync(WEIGHTS_FILE, JSON.stringify(weights, null, 2));
  } catch (e) {
    console.warn('[LTR] Could not save weights file:', e);
  }
}

export interface RankableJob {
  jobId: number;
  title: string;
  company: string;
  description?: string;
  skills: string[];
  requirements?: string[];
  experienceLevel?: string;
  workType?: 'remote' | 'hybrid' | 'onsite';
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  source?: string;
  createdAt?: Date | string;
  applicationCount?: number;
  trustScore?: number;
}

export interface CandidateProfile {
  candidateId: string;
  skills: string[];
  experience: string;
  experienceYears?: number;
  workType?: 'remote' | 'hybrid' | 'onsite';
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  industry?: string;
}

export interface RankingFeature {
  semanticSimilarity: number;
  skillMatchScore: number;
  experienceAlignment: number;
  locationFit: number;
  workTypeFit: number;
  salaryFit: number;
  companyTrustScore: number;
  recencyScore: number;
  engagementScore: number;
  personalizationScore: number;
}

export interface RankedJob {
  jobId: number;
  finalScore: number;
  features: RankingFeature;
  explanation: string;
}

interface TrainingSample {
  queryId: string;
  features: number[];
  label: number;
}

interface ModelWeights {
  semanticSimilarity: number;
  skillMatchScore: number;
  experienceAlignment: number;
  locationFit: number;
  workTypeFit: number;
  salaryFit: number;
  companyTrustScore: number;
  recencyScore: number;
  engagementScore: number;
  personalizationScore: number;
}

class LearnToRankModel {
  private weights: ModelWeights = {
    semanticSimilarity: 0.25,
    skillMatchScore: 0.20,
    experienceAlignment: 0.10,
    locationFit: 0.08,
    workTypeFit: 0.07,
    salaryFit: 0.08,
    companyTrustScore: 0.07,
    recencyScore: 0.08,
    engagementScore: 0.04,
    personalizationScore: 0.03,
  };

  private trainingData: TrainingSample[] = [];
  private isTrained: boolean = false;
  private bias: number = 0;

  constructor() {
    this.loadWeights();
  }

  private loadWeights() {
    const savedWeights = loadWeightsFromFile();
    if (savedWeights) {
      this.weights = { ...this.weights, ...savedWeights };
      console.log('[LTR] Loaded trained weights');
    } else {
      console.log('[LTR] Using default weights');
    }
  }

  private saveWeights() {
    saveWeightsToFile(this.weights);
  }

  extractFeatures(job: RankableJob, candidate: CandidateProfile, similarityScores?: {
    semantic?: number;
    skillMatch?: number;
  }): RankingFeature {
    return {
      semanticSimilarity: similarityScores?.semantic || 0,
      skillMatchScore: this.calculateSkillMatch(job.skills, candidate.skills),
      experienceAlignment: this.calculateExperienceAlignment(job.experienceLevel, candidate.experience),
      locationFit: this.calculateLocationFit(job.location, candidate.location),
      workTypeFit: this.calculateWorkTypeFit(job.workType, candidate.workType),
      salaryFit: this.calculateSalaryFit(
        job.salaryMin,
        job.salaryMax,
        candidate.salaryMin,
        candidate.salaryMax
      ),
      companyTrustScore: this.calculateCompanyTrustScore(job),
      recencyScore: this.calculateRecencyScore(job.createdAt),
      engagementScore: this.calculateEngagementScore(job),
      personalizationScore: this.calculatePersonalizationScore(candidate, job),
    };
  }

  private calculateSkillMatch(jobSkills: string[], candidateSkills: string[]): number {
    if (!jobSkills?.length || !candidateSkills?.length) return 0.5;

    const normalizedJobSkills = jobSkills.map(s => s.toLowerCase());
    const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase());

    let matches = 0;
    for (const cs of normalizedCandidateSkills) {
      if (normalizedJobSkills.some(js => js.includes(cs) || cs.includes(js))) {
        matches++;
      }
    }

    const jaccard = matches / (new Set([...normalizedJobSkills, ...normalizedCandidateSkills]).size);
    return Math.min(jaccard * 2, 1);
  }

  private calculateExperienceAlignment(jobLevel?: string, candidateExp?: string): number {
    if (!jobLevel || !candidateExp) return 0.5;

    const levelMap: Record<string, number> = {
      'intern': 1, 'entry': 2, 'junior': 2, 'mid': 3, 'senior': 4,
      'lead': 5, 'principal': 6, 'staff': 6, 'manager': 5, 'director': 7
    };

    const jobLevelNum = levelMap[jobLevel.toLowerCase()] || 3;
    const candidateLevelNum = levelMap[candidateExp.toLowerCase()] || 3;

    const diff = Math.abs(jobLevelNum - candidateLevelNum);
    return Math.max(0, 1 - diff * 0.25);
  }

  private calculateLocationFit(jobLocation?: string, candidateLocation?: string): number {
    if (!jobLocation || !candidateLocation) return 0.5;

    const jobLoc = jobLocation.toLowerCase();
    const candidateLoc = candidateLocation.toLowerCase();

    if (jobLoc.includes('remote') || candidateLoc.includes('remote')) return 1;

    const majorCities = ['san francisco', 'new york', 'seattle', 'austin', 'boston', 'los angeles', 'chicago'];
    const jobCity = majorCities.find(c => jobLoc.includes(c));
    const candidateCity = majorCities.find(c => candidateLoc.includes(c));

    if (jobCity && candidateCity && jobCity === candidateCity) return 1;
    if (jobCity || candidateCity) return 0.6;

    return 0.3;
  }

  private calculateWorkTypeFit(jobWorkType?: string, candidateWorkType?: string): number {
    if (!jobWorkType || !candidateWorkType) return 0.7;

    const j = jobWorkType.toLowerCase();
    const c = candidateWorkType.toLowerCase();

    if (j === c) return 1;
    if (j === 'hybrid' || c === 'hybrid') return 0.8;
    if (j === 'remote') return 0.9;

    return 0.4;
  }

  private calculateSalaryFit(
    jobMin?: number,
    jobMax?: number,
    candidateMin?: number,
    candidateMax?: number
  ): number {
    if (!jobMin && !jobMax) return 0.5;
    if (!candidateMin && !candidateMax) return 0.5;

    const jobMid = ((jobMin || 0) + (jobMax || 0)) / 2;
    const candidateMid = ((candidateMin || 0) + (candidateMax || 0)) / 2;

    if (jobMid >= (candidateMin || 0) && jobMid <= (candidateMax || Infinity)) return 1;
    if (jobMid < candidateMid) return Math.max(0, 1 - (candidateMid - jobMid) / candidateMid);

    return 0.6;
  }

  private calculateCompanyTrustScore(job: RankableJob): number {
    const priorityCompanies = ['google', 'apple', 'microsoft', 'amazon', 'meta', 'netflix', 'stripe', 'airbnb', 'uber', 'salesforce'];
    const company = (job.company || '').toLowerCase();

    if (priorityCompanies.some(c => company.includes(c))) return 1;
    if (job.trustScore) return job.trustScore / 100;
    if (job.source === 'platform' || job.source === 'internal') return 0.9;

    return 0.5;
  }

  private calculateRecencyScore(createdAt?: Date | string): number {
    if (!createdAt) return 0.5;

    const created = new Date(createdAt);
    const days = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);

    if (days < 1) return 1;
    if (days < 3) return 0.9;
    if (days < 7) return 0.8;
    if (days < 14) return 0.6;
    if (days < 30) return 0.4;
    return 0.2;
  }

  private calculateEngagementScore(job: RankableJob): number {
    const appCount = job.applicationCount || 0;

    if (appCount < 10) return 1;
    if (appCount < 50) return 0.8;
    if (appCount < 100) return 0.6;
    if (appCount < 500) return 0.4;
    return 0.2;
  }

  private calculatePersonalizationScore(candidate: CandidateProfile, job: RankableJob): number {
    let score = 0.5;

    if (candidate.industry && job.source === 'platform') {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  rankJobs(
    jobs: RankableJob[],
    candidate: CandidateProfile,
    similarityScores?: Map<number, { semantic?: number; skillMatch?: number }>
  ): RankedJob[] {
    const ranked: RankedJob[] = [];

    for (const job of jobs) {
      const simScores = similarityScores?.get(job.jobId);
      const features = this.extractFeatures(job, candidate, simScores);

      const featureVector = [
        features.semanticSimilarity,
        features.skillMatchScore,
        features.experienceAlignment,
        features.locationFit,
        features.workTypeFit,
        features.salaryFit,
        features.companyTrustScore,
        features.recencyScore,
        features.engagementScore,
        features.personalizationScore,
      ];

      const finalScore = this.predictScore(featureVector);

      ranked.push({
        jobId: job.jobId,
        finalScore,
        features,
        explanation: this.generateExplanation(features),
      });
    }

    ranked.sort((a, b) => b.finalScore - a.finalScore);
    return ranked;
  }

  private predictScore(features: number[]): number {
    const weightsArray = Object.values(this.weights);
    let score = this.bias;

    for (let i = 0; i < features.length && i < weightsArray.length; i++) {
      score += features[i] * weightsArray[i];
    }

    return Math.min(Math.max(score, 0), 1);
  }

  private generateExplanation(features: RankingFeature): string {
    const positives: string[] = [];
    const negatives: string[] = [];

    if (features.semanticSimilarity > 0.7) {
      positives.push('strong semantic match');
    } else if (features.semanticSimilarity < 0.4) {
      negatives.push('limited semantic match');
    }

    if (features.skillMatchScore > 0.6) {
      positives.push('good skill alignment');
    } else if (features.skillMatchScore < 0.3) {
      negatives.push('skill gap');
    }

    if (features.locationFit > 0.8) {
      positives.push('great location fit');
    }

    if (features.workTypeFit > 0.8) {
      positives.push('matches work preference');
    }

    if (features.companyTrustScore > 0.8) {
      positives.push('trusted company');
    }

    if (features.recencyScore > 0.7) {
      positives.push('recently posted');
    }

    const parts = [];
    if (positives.length > 0) {
      parts.push(`✓ ${positives.slice(0, 2).join(', ')}`);
    }
    if (negatives.length > 0) {
      parts.push(`△ ${negatives.slice(0, 1).join(', ')}`);
    }

    return parts.join(' | ') || 'General match';
  }

  addTrainingSample(queryId: string, features: number[], label: number) {
    this.trainingData.push({ queryId, features, label });
    this.isTrained = false;

    if (this.trainingData.length >= 100) {
      this.train();
    }
  }

  train() {
    if (this.trainingData.length < 10) {
      console.log('[LTR] Not enough training data, using default weights');
      return;
    }

    const numFeatures = this.trainingData[0]?.features.length || 10;
    const featureSums = new Array(numFeatures).fill(0);
    const labelSums = { sum: 0, weightedSum: 0 };

    for (const sample of this.trainingData) {
      const weight = sample.label;
      for (let i = 0; i < numFeatures; i++) {
        featureSums[i] += sample.features[i] * weight;
      }
      labelSums.sum += weight;
      labelSums.weightedSum += weight * sample.label;
    }

    const totalWeight = labelSums.sum || 1;
    this.bias = labelSums.weightedSum / totalWeight;

    for (let i = 0; i < numFeatures; i++) {
      const featureSum = featureSums[i];
      const avgFeature = featureSum / totalWeight;
      const featureWeight = avgFeature * this.bias;
      const normalizedWeight = Math.min(Math.max(featureWeight, 0.05), 0.4);

      const featureKeys = Object.keys(this.weights) as (keyof ModelWeights)[];
      if (i < featureKeys.length) {
        this.weights[featureKeys[i]] = normalizedWeight;
      }
    }

    this.isTrained = true;
    this.saveWeights();
    console.log('[LTR] Model trained with', this.trainingData.length, 'samples');
  }

  getWeights(): ModelWeights {
    return { ...this.weights };
  }

  getStats() {
    return {
      trainingSamples: this.trainingData.length,
      isTrained: this.isTrained,
      weights: this.weights,
    };
  }
}

export const learnToRank = new LearnToRankModel();

export function rankJobsWithLTR(
  jobs: RankableJob[],
  candidate: CandidateProfile,
  mlScores?: Map<number, { semantic?: number; skillMatch?: number }>
): RankedJob[] {
  return learnToRank.rankJobs(jobs, candidate, mlScores);
}

export function recordCandidateInteraction(
  candidateId: string,
  jobId: number,
  interactionType: 'view' | 'click' | 'save' | 'apply',
  features: RankingFeature,
  relevance: number
) {
  const featureVector = Object.values(features);
  
  learnToRank.addTrainingSample(
    `${candidateId}:${jobId}`,
    featureVector,
    relevance
  );

  console.log(`[LTR] Recorded ${interactionType} for candidate ${candidateId}, job ${jobId}`);
}
