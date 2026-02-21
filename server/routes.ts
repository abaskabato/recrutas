import type { Express } from "express";
import { eq } from "drizzle-orm";
import { inArray } from "drizzle-orm/sql/expressions";
import { sql } from "drizzle-orm/sql";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";

import { storage } from "./storage";
import { isAuthenticated } from "./middleware/auth";
import { companyJobsAggregator } from "./company-jobs-aggregator";
import { universalJobScraper } from "./universal-job-scraper";
import { jobAggregator } from "./job-aggregator";
import { notificationService } from "./notification-service";
import { newsService } from './news-service';
import {
  insertCandidateProfileSchema,
  insertJobPostingSchema,
  updateJobPostingSchema,
  scheduleInterviewSchema,
  completeTalentOwnerProfileSchema,
} from "@shared/schema";
import { generateJobMatch, generateScreeningQuestions } from "./ai-service";
import { db, testDbConnection } from "./db";
import { seedDatabase } from "./seed.js";
import { advancedMatchingEngine, EnhancedJobMatch } from "./advanced-matching-engine";
import { ResumeService, ResumeProcessingError } from './services/resume.service';
import { ExamService } from './services/exam.service';
import { aiResumeParser } from './ai-resume-parser';
import { applicationIntelligence } from "./application-intelligence";
import { supabaseAdmin } from "./lib/supabase-admin";
import { users, jobPostings, jobApplications, JobPosting } from "@shared/schema";
import { CompanyJob } from '../server/company-jobs-aggregator';
import { externalJobsScheduler } from './services/external-jobs-scheduler';
import { hiringCafeService } from './services/hiring-cafe.service';
import { jobIngestionService } from './services/job-ingestion.service';
import { calculateMLMatchScore, generateCandidateEmbedding, getModelInfo } from './ml-matching';
import { normalizeSkills } from './skill-normalizer';

// In-memory cache for RemoteOK jobs (15-min TTL, same pattern as hiring.cafe)
let remoteOkCache: { data: any[]; timestamp: number } | null = null;
const REMOTEOK_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ML-enhanced job scoring (disable with ENABLE_ML_MATCHING=false)
const mlScoringEnabled = process.env.ENABLE_ML_MATCHING !== 'false';

/**
 * Simple skill-matching fallback (no ML model needed)
 */
function simpleSkillMatch(candidateSkills: string[], job: any): {
  matchScore: number;
  skillMatches: string[];
  aiExplanation: string;
  confidenceLevel: number;
} {
  const normalizedSkills = candidateSkills.map((s: string) => s.toLowerCase());
  // Normalize job skills so "ReactJS" matches candidate's "React"
  const jobSkills = normalizeSkills(job.skills || []).map((s: string) => s.toLowerCase());
  const matchingSkills = normalizedSkills.filter((s: string) =>
    jobSkills.some((js: string) => js === s)
  );
  const jobSkillsCount = jobSkills.length || 1;
  const matchScore = matchingSkills.length > 0
    ? Math.round((matchingSkills.length / Math.max(jobSkillsCount, 1)) * 100)
    : 0;
  return {
    matchScore,
    skillMatches: matchingSkills,
    aiExplanation: matchingSkills.length > 0
      ? `${matchingSkills.length} skill matches: ${matchingSkills.join(', ')}`
      : 'No skill matches found',
    confidenceLevel: 1,
  };
}

/**
 * Enhanced job scoring using ML embeddings (open-source)
 */
async function scoreJobWithML(
  candidateSkills: string[],
  candidateExperience: string,
  job: any,
  precomputedCandidateEmbedding?: number[]
): Promise<{
  matchScore: number;
  skillMatches: string[];
  aiExplanation: string;
  confidenceLevel: number;
}> {
  if (!mlScoringEnabled) {
    return simpleSkillMatch(candidateSkills, job);
  }

  try {
    const mlResult = await calculateMLMatchScore(
      candidateSkills,
      candidateExperience,
      job.title || '',
      job.description || '',
      job.requirements || [],
      job.skills || [],
      precomputedCandidateEmbedding
    );

    return {
      matchScore: mlResult.score,
      skillMatches: mlResult.skillMatches,
      aiExplanation: mlResult.explanation,
      confidenceLevel: mlResult.confidence, // 0-100, no division
    };
  } catch (error) {
    console.warn('[ML Scoring] Falling back to simple matching:', error);
    return simpleSkillMatch(candidateSkills, job);
  }
}

type AggregatedJob = (JobPosting | CompanyJob) & { aiCurated: boolean };

interface AIMatch {
  id: number;
  job: (JobPosting | CompanyJob) & { confidenceScore: number };
  matchScore: string;
  confidenceLevel: number;
  aiExplanation: string;
  status: string;
  createdAt: string;
}


// Instantiate services
const resumeService = new ResumeService(storage, aiResumeParser);
const examService = new ExamService(storage, notificationService);

// Helper function to safely parse integer params
function parseIntParam(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

// Background job processor for async job posting
// Processes candidate matching and notifications in the background
// Uses setTimeout with 0ms delay for better Vercel serverless compatibility
function processJobMatchesInBackground(jobId: number) {
  // Fire and forget - process in background without blocking the request
  // Use setTimeout instead of setImmediate for better Vercel compatibility
  setTimeout(async () => {
    try {
      console.log(`[Background] Starting candidate matching for job ${jobId}`);
      const job = await storage.getJobPosting(jobId);
      if (!job) {
        console.error(`[Background] Job ${jobId} not found`);
        return;
      }

      // Fetch matching candidates
      const candidates = await storage.findMatchingCandidates(jobId);
      console.log(`[Background] Found ${candidates.length} matching candidates for job ${jobId}`);

      // Process matches in batches to avoid overwhelming the system
      const BATCH_SIZE = 5;
      for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const batch = candidates.slice(i, i + BATCH_SIZE);

        try {
          // Process batch in parallel
          await Promise.all(
            batch.map(async (candidate) => {
              // Create job match
              await storage.createJobMatch({
                jobId: job.id,
                ...candidate,
              });

              // Send notification
              await notificationService.createNotification({
                userId: candidate.candidateId,
                type: "new_match",
                title: "New Job Match",
                message: `You have a new match for the position of ${job.title}`,
                data: { jobId: job.id },
              }).catch(err => console.error(`[Background] Notification failed for candidate ${candidate.candidateId}:`, err?.message));
            })
          );

          console.log(`[Background] Processed batch ${Math.floor(i / BATCH_SIZE) + 1} for job ${jobId}`);
        } catch (batchError) {
          console.error(`[Background] Batch processing error for job ${jobId}:`, batchError?.message);
          // Continue with next batch
        }
      }

      console.log(`[Background] Completed candidate matching for job ${jobId}`);
    } catch (error) {
      console.error(`[Background] Error processing job matches for job ${jobId}:`, error?.message);
    }
  }, 0);
}

// Magic bytes for file type validation
const FILE_SIGNATURES = {
  // PDF starts with %PDF
  pdf: [0x25, 0x50, 0x44, 0x46],
  // DOC starts with D0 CF 11 E0 (Microsoft Compound Document)
  doc: [0xD0, 0xCF, 0x11, 0xE0],
  // DOCX is a ZIP file starting with PK
  docx: [0x50, 0x4B, 0x03, 0x04],
};

function validateFileSignature(buffer: Buffer, extension: string): boolean {
  if (buffer.length < 4) return false;

  const ext = extension.toLowerCase().replace('.', '');
  const signature = FILE_SIGNATURES[ext as keyof typeof FILE_SIGNATURES];

  if (!signature) return false;

  // Check if the file starts with the expected magic bytes
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

// Configure multer for file uploads
// Use memory storage for serverless compatibility (no filesystem access)
const storageConfig = multer.memoryStorage();
const upload = multer({
  storage: storageConfig,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'));
    }
  }
});

async function generateExamQuestions(job: any) {
  const questions = [];
  const skills = job.skills || [];
  const requirements = job.requirements || [];

  // Generate skill-based questions
  for (let i = 0; i < Math.min(skills.length, 5); i++) {
    const skill = skills[i];
    questions.push({
      id: `skill_${i + 1}`,
      question: `What is your experience level with ${skill}?`,
      type: 'multiple-choice' as const,
      options: [
        'Beginner (0-1 years)',
        'Intermediate (2-3 years)',
        'Advanced (4-5 years)',
        'Expert (5+ years)'
      ],
      correctAnswer: 2, // Intermediate or higher
      points: 20
    });
  }

  // Generate requirement-based questions
  for (let i = 0; i < Math.min(requirements.length, 3); i++) {
    const requirement = requirements[i];
    questions.push({
      id: `req_${i + 1}`,
      question: `How would you approach: ${requirement}?`,
      type: 'short-answer' as const,
      points: 15
    });
  }

  // Add general questions
  questions.push({
    id: 'general_1',
    question: `Why are you interested in the ${job.title} position?`,
    type: 'short-answer' as const,
    points: 25
  });

  return questions;
}

async function findMatchingCandidates(job: any) {
  // This is a placeholder function. In a real application, this would
  // involve a more complex matching algorithm.
  const allCandidates = await storage.getAllCandidateUsers();
  const matches = [];

  for (const candidate of allCandidates) {
    let score = 0;
    if (candidate.skills && job.skills) {
      for (const skill of job.skills) {
        if (candidate.skills.includes(skill)) {
          score += 10;
        }
      }
    }

    if (score > 0) {
      matches.push({
        candidateId: candidate.userId,
        matchScore: score,
        matchReasons: [`Shared skills: ${job.skills.filter((s: any) => candidate.skills.includes(s)).join(", ")}`],
      });
    }
  }

  return matches;
}

export async function registerRoutes(app: Express): Promise<Express> {
  console.log('registerRoutes called!');

  // Dev-only route for seeding the database - DISABLED in production
  app.post('/api/dev/seed', async (req, res) => {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: "This endpoint is disabled in production" });
    }

    // Require a secret key even in development
    const devSecret = req.headers['x-dev-secret'];
    if (!process.env.DEV_SECRET || devSecret !== process.env.DEV_SECRET) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      await seedDatabase();
      res.status(200).json({ message: "Database seeded successfully" });
    } catch (error) {
      console.error("Error seeding database:", error);
      res.status(500).json({ message: "Failed to seed database" });
    }
  });

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      // Check database connectivity
      const isDbHealthy = await testDbConnection();
      
      if (!isDbHealthy) {
        return res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          checks: {
            database: 'unavailable'
          }
        });
      }

      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        checks: {
          database: 'connected'
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        checks: {
          database: 'error'
        }
      });
    }
  });

  // ML Matching info endpoint
  app.get('/api/ml-matching/status', async (req, res) => {
    try {
      const modelInfo = getModelInfo();
      res.json({
        status: 'available',
        ...modelInfo,
        note: 'Using open-source Xenova/all-MiniLM-L6-v2 model for semantic embeddings',
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'ML matching service unavailable',
      });
    }
  });

  // Layoff news endpoint
  app.get('/api/news/layoffs', async (req, res) => {
    try {
      const articles = await newsService.getLayoffNews();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching layoff news:", error);
      res.status(500).json({ message: "Failed to fetch layoff news" });
    }
  });

  // Helper function to format job match
  function formatJobMatch(job: any, index: number, aiExplanation?: string): any {
    return {
      id: index + 1,
      job: {
        ...job,
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        workType: job.workType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        description: job.description,
        requirements: job.requirements || [],
        skills: job.skills || [],
        aiCurated: job.source !== 'internal' && job.source !== 'platform',
        confidenceScore: job.matchScore,
        externalSource: job.source,
        externalUrl: job.externalUrl,
        postedDate: job.postedDate || job.createdAt,
        trustScore: job.trustScore ?? 0,
        livenessStatus: job.livenessStatus ?? 'unknown',
      },
      isVerifiedActive: job.isVerifiedActive ?? (job.livenessStatus === 'active' && (job.trustScore ?? 0) >= 90),
      isDirectFromCompany: job.isDirectFromCompany ?? ((job.trustScore ?? 0) >= 85),
      matchScore: `${job.matchScore}%`,
      confidenceLevel: job.confidenceLevel ?? (job.matchScore > 80 ? 90 : (job.matchScore > 60 ? 70 : 50)),
      skillMatches: job.skillMatches || [],
      aiExplanation: aiExplanation || job.aiExplanation,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }

  // AI-powered job matching
  app.get('/api/ai-matches', isAuthenticated, async (req: any, res) => {
    const MATCHING_TIMEOUT_MS = 25000; // 25 second timeout for entire matching process
    const EARLY_RETURN_THRESHOLD_MS = 18000; // return DB-only results if exceeded after fetches
    const BATCH_ABORT_THRESHOLD_MS = 20000;  // stop scoring batches if exceeded

    // Create a timeout controller
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Matching timeout')), MATCHING_TIMEOUT_MS);
    });
    
    const finish = () => clearTimeout(timeoutId);
    
    try {
      const userId = req.user.id;
      console.log(`Fetching job recommendations for user: ${userId}`);

      // Fetch candidate skills for hiring.cafe query
      const candidate = await storage.getCandidateUser(userId);
      const candidateSkills = candidate?.skills || [];

      const startTime = Date.now();

      // Add timeout to prevent hanging on database issues
      const dbTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB recommendations timeout')), 8000)
      );

      // Run DB recommendations + hiring.cafe in parallel
      const dbPromise = Promise.race([
        storage.getJobRecommendations(userId),
        dbTimeoutPromise
      ]);

      // Limit hiring.cafe jobs to reduce processing time
      const hiringCafePromise = candidateSkills.length > 0
        ? Promise.race([
            hiringCafeService.searchByKeywords(candidateSkills.slice(0, 5).join(' '))
              .then(jobs => jobs.slice(0, 15)), // Limit to 15 jobs max
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Hiring.cafe timeout')), 5000)
            )
          ])
        : Promise.resolve([]);

      // Also try RemoteOK as fallback (free, no rate limits) — cached for 15 min
      const remoteOkPromise = (async () => {
        if (candidateSkills.length === 0) return [];
        // Return cached data if fresh
        if (remoteOkCache && Date.now() - remoteOkCache.timestamp < REMOTEOK_CACHE_TTL) {
          console.log(`[RemoteOK] Cache hit (${remoteOkCache.data.length} jobs)`);
          return remoteOkCache.data;
        }
        try {
          const { JobAggregator } = await import('./job-aggregator.js');
          const aggregator = new JobAggregator();
          const jobs = await aggregator.fetchRemoteOKJobs();
          console.log(`[RemoteOK] Got ${jobs.length} jobs`);
          remoteOkCache = { data: jobs, timestamp: Date.now() };
          return jobs;
        } catch (err) {
          console.warn('[RemoteOK] Failed:', err);
          // Return stale cache on error
          if (remoteOkCache) {
            console.log(`[RemoteOK] Returning stale cache (${remoteOkCache.data.length} jobs)`);
            return remoteOkCache.data;
          }
          return [];
        }
      })();

      const [dbResult, cafeResult, remoteOkResult] = await Promise.race([
        Promise.allSettled([dbPromise, hiringCafePromise, remoteOkPromise]),
        timeoutPromise
      ]) as any;

      const recommendations = (dbResult?.status === 'fulfilled' ? dbResult.value : []) as any[];
      const cafeJobs = (cafeResult?.status === 'fulfilled' ? cafeResult.value : []) as any[];
      const remoteOkJobs = (remoteOkResult?.status === 'fulfilled' ? remoteOkResult.value : []) as any[];

      if (cafeResult?.status === 'rejected') {
        console.warn('[HiringCafe] Search failed (non-fatal):', cafeResult.reason?.message);
      }

      // Fire-and-forget: ingest hiring.cafe results for future cache hits
      if (cafeJobs.length > 0) {
        console.log(`[HiringCafe] Ingesting ${cafeJobs.length} jobs in background`);
        jobIngestionService.ingestExternalJobs(cafeJobs)
          .then(stats => console.log(`[HiringCafe] Ingestion: ${stats.inserted} new, ${stats.duplicates} dupes`))
          .catch(err => console.error('[HiringCafe] Ingestion failed:', err?.message));
      }

      // If we've exceeded the early-return threshold, return DB results only without ML scoring
      if (Date.now() - startTime > EARLY_RETURN_THRESHOLD_MS) {
        console.log('[Matching] Timeout approaching - returning DB results without external jobs');
        finish();
        return res.json(recommendations);
      }

      // Score hiring.cafe jobs using ML matching (open-source transformers)
      const candidateExperience = candidate?.experience || '';

      // Pre-compute candidate embedding once (reused across all jobs)
      let candidateEmbedding: number[] | undefined;
      if (mlScoringEnabled && candidateSkills.length > 0) {
        try {
          candidateEmbedding = await generateCandidateEmbedding(candidateSkills, candidateExperience);
        } catch (err) {
          console.warn('[ML Scoring] Failed to pre-compute candidate embedding:', err);
        }
      }

      let scoredCafeJobs: any[] = [];

      // Process in batches to avoid overwhelming the ML model - reduce to 3 jobs per batch for speed
      const batchSize = 3;
      for (let i = 0; i < cafeJobs.length; i += batchSize) {
        // Check timeout before each batch
        if (Date.now() - startTime > BATCH_ABORT_THRESHOLD_MS) {
          console.log('[Matching] Timeout - stopping cafe job scoring');
          break;
        }
        const batch = cafeJobs.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(async (job) => {
            const mlScore = await scoreJobWithML(candidateSkills, candidateExperience, job, candidateEmbedding);
            return {
              ...job,
              id: `cafe_${job.externalId}`,
              matchScore: mlScore.matchScore,
              skillMatches: mlScore.skillMatches,
              aiExplanation: mlScore.aiExplanation,
              confidenceLevel: mlScore.confidenceLevel,
              source: 'hiring-cafe',
              trustScore: job.trustScore ?? 50,
              livenessStatus: job.livenessStatus ?? 'unknown',
            };
          })
        );
        scoredCafeJobs.push(...batchResults
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => r.value));
      }

      // If DB returned matches, filter cafe jobs to 40%+ match
      // If DB is empty, show ALL hiring.cafe jobs (no skill match required) for broader discovery
      if (recommendations.length > 0) {
        scoredCafeJobs = scoredCafeJobs.filter(job => job.matchScore >= 40);
      } else {
        console.log(`[HiringCafe] No DB matches - showing all ${scoredCafeJobs.length} hiring.cafe jobs`);
      }

      // Merge: DB results first, then hiring.cafe results, then RemoteOK (deduplicated by title+company)
      const seenKeys = new Set(
        recommendations.map((j: any) => `${j.title?.toLowerCase()}|${j.company?.toLowerCase()}`)
      );
      const uniqueCafeJobs = scoredCafeJobs.filter(
        j => !seenKeys.has(`${j.title?.toLowerCase()}|${j.company?.toLowerCase()}`)
      );

      // Add cafe job keys to seenKeys so RemoteOK deduplicates against them
      uniqueCafeJobs.forEach((j: any) => seenKeys.add(`${j.title?.toLowerCase()}|${j.company?.toLowerCase()}`));

      // Score and add RemoteOK jobs using ML matching (with timeout check)
      let scoredRemoteOkJobs: any[] = [];
      for (let i = 0; i < Math.min(remoteOkJobs.length, 10); i += batchSize) { // Limit to 10 jobs max
        // Check timeout before each batch
        if (Date.now() - startTime > BATCH_ABORT_THRESHOLD_MS) {
          console.log('[Matching] Timeout - stopping RemoteOK job scoring');
          break;
        }
        const batch = remoteOkJobs.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(async (job: any) => {
            const mlScore = await scoreJobWithML(candidateSkills, candidateExperience, job, candidateEmbedding);
            return {
              ...job,
              id: `remoteok_${job.externalId}`,
              matchScore: mlScore.matchScore,
              skillMatches: mlScore.skillMatches,
              aiExplanation: mlScore.aiExplanation,
              confidenceLevel: mlScore.confidenceLevel,
              source: 'remote-ok',
              trustScore: job.trustScore ?? 50,
              livenessStatus: job.livenessStatus ?? 'unknown',
            };
          })
        );
        scoredRemoteOkJobs.push(...batchResults
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => r.value));
      }

      // Filter RemoteOK jobs by match score and deduplication
      const filteredRemoteOkJobs = scoredRemoteOkJobs.filter((job: any) => {
        if (!seenKeys.has(`${job.title?.toLowerCase()}|${job.company?.toLowerCase()}`)) {
          if (recommendations.length > 0 ? job.matchScore >= 40 : true) {
            return true;
          }
        }
        return false;
      });

      const allRecommendations = [...(recommendations || []), ...uniqueCafeJobs, ...filteredRemoteOkJobs];
      
      finish();

      console.log(`Found ${recommendations?.length || 0} DB + ${uniqueCafeJobs.length} hiring.cafe + ${filteredRemoteOkJobs.length} RemoteOK recommendations`);

      // If still no recommendations, fetch recent jobs from DB as fallback (no skill matching)
      if (allRecommendations.length === 0 && candidateSkills.length > 0) {
        console.log('No skill-matched jobs found - fetching recent jobs as fallback');
        
        const { db } = await import('./db.js');
        const { jobPostings } = await import('../shared/schema.js');
        
        const recentJobs = await db
          .select()
          .from(jobPostings)
          .where(sql`${jobPostings.status} = 'active'`)
          .orderBy(sql`${jobPostings.createdAt} DESC`)
          .limit(20);
          
        if (recentJobs.length > 0) {
          // Return sectioned format
          const applyAndKnowToday = recentJobs
            .filter((job: any) => job.source === 'platform' || !job.externalUrl)
            .map((job: any, index: number) => formatJobMatch(job, index, 'Recent job - upload your resume to improve matching'));
          
          const matchedForYou = recentJobs
            .filter((job: any) => job.source !== 'platform' && job.externalUrl)
            .map((job: any, index: number) => formatJobMatch(job, index, 'Recent job - upload your resume to improve matching'));
          
          return res.json({ applyAndKnowToday, matchedForYou });
        }
      }

      // Return empty array if still no recommendations
      if (allRecommendations.length === 0) {
        console.log('No job recommendations found - candidate may have no skills in profile or no matching jobs');
        return res.json({ applyAndKnowToday: [], matchedForYou: [] });
      }

      // Transform into sectioned format
      const applyAndKnowToday = allRecommendations
        .filter((job: any) => job.source === 'platform' || !job.externalUrl)
        .map((job: any, index: number) => formatJobMatch(job, index));

      const matchedForYou = allRecommendations
        .filter((job: any) => job.source !== 'platform' && job.externalUrl)
        .map((job: any, index: number) => formatJobMatch(job, index));

      console.log(`Sectioned: ${applyAndKnowToday.length} applyAndKnowToday, ${matchedForYou.length} matchedForYou`);

      // Return sectioned response
      res.json({ applyAndKnowToday, matchedForYou });
    } catch (error: any) {
      console.error('Error fetching job matches:', error?.message);
      finish();

      // Return empty sections on timeout/connection errors - better UX than 500 error
      if (error?.message?.includes('timeout') || error?.message?.includes('cancel')) {
        return res.json({ applyAndKnowToday: [], matchedForYou: [] });
      }

      res.status(500).json({
        message: "Failed to generate job matches",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  });

  // AI-powered screening questions
  app.post('/api/ai/screening-questions', isAuthenticated, async (req: any, res) => {
    try {
      const { jobId, candidateId } = req.body;
      if (!jobId || !candidateId) {
        return res.status(400).json({ message: "jobId and candidateId are required" });
      }

      const job = await storage.getJobPosting(jobId);
      const candidate = await storage.getCandidateUser(candidateId);

      if (!job || !candidate) {
        return res.status(404).json({ message: "Job or Candidate not found" });
      }

      // Only the job owner can generate screening questions
      if (job.talentOwnerId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized: You do not own this job posting" });
      }

      const questions = await generateScreeningQuestions(candidate, job);
      res.json({ questions });
    } catch (error) {
      console.error("Error generating screening questions:", error);
      res.status(500).json({ message: "Failed to generate screening questions" });
    }
  });

  // Universal job scraper with database persistence
  app.get('/api/external-jobs', async (req, res) => {
    try {
      const skills = req.query.skills ? (req.query.skills as string).split(',') : [];
      const jobTitle = req.query.jobTitle as string | undefined;
      const location = req.query.location as string | undefined;
      const workType = req.query.workType as string | undefined;

      // Return cached external jobs from database (instant, no scraping)
      // External jobs are kept up-to-date by background scheduler
      const externalJobs = await storage.getExternalJobs(skills, { jobTitle, location, workType });

      // If there's a triggerRefresh query param, trigger background scraping
      if (req.query.triggerRefresh === 'true') {
        const { externalJobsScheduler } = await import('./services/external-jobs-scheduler');
        externalJobsScheduler.triggerScrape()
          .catch(err => console.error('Background scrape trigger failed:', err?.message));
      }

      res.json({
        jobs: externalJobs || [],
        cached: true,
        message: 'External jobs from cache. Use ?triggerRefresh=true to update in background'
      });
    } catch (error) {
      console.error('Error fetching cached external jobs:', error);
      // Return empty array instead of error - better UX
      res.json({ jobs: [], cached: true, message: 'External jobs unavailable' });
    }
  });

  // Platform stats
  app.get('/api/platform/stats', async (req, res) => {
    try {
      const [userCount, jobCount, matchCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users),
        db.select({ count: sql<number>`count(*)` }).from(jobPostings),
        db.select({ count: sql<number>`count(*)` }).from(jobApplications)
      ]);
      const stats = {
        totalUsers: userCount[0].count || 0,
        totalJobs: jobCount[0].count || 0,
        totalMatches: matchCount[0].count || 0,
      };
      res.set('Cache-Control', 'public, max-age=300');
      res.json(stats);
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      res.status(500).json({ message: 'Failed to fetch platform stats' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/role', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const { role } = req.body;
      if (!['candidate', 'talent_owner'].includes(role)) return res.status(400).json({ message: "Invalid role" });
      const updatedUser = await storage.updateUserRole(req.user.id, role);
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error setting user role:", error);
      res.status(500).json({ message: "Failed to set user role" });
    }
  });

  // Candidate profile
  app.get('/api/candidate/profile', isAuthenticated, async (req: any, res) => {
    try {
      // Add timeout to prevent hanging on database connection issues
      // 15s timeout allows for serverless cold starts + DB connection time
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 15000)
      );

      const profile = await Promise.race([
        storage.getCandidateUser(req.user.id),
        timeoutPromise
      ]) as any;

      res.json(profile || {});
    } catch (error: any) {
      console.error("Error fetching candidate profile:", error?.message);

      // Return a 503 Service Unavailable error on timeout
      if (error?.message?.includes('timeout') || error?.message?.includes('cancel')) {
        console.warn(`Profile fetch timeout for user ${req.user.id}`);
        return res.status(503).json({
          error: 'service_temporarily_unavailable',
          message: 'Profile data temporarily unavailable',
          retryAfter: 3
        });
      }

      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post('/api/candidate/profile', isAuthenticated, async (req: any, res) => {
    try {
      const profileData = insertCandidateProfileSchema.parse({ ...req.body, userId: req.user.id });
      const profile = await storage.upsertCandidateUser(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error updating candidate profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get job statistics (for monitoring)
  app.get('/api/job-stats', async (req: any, res) => {
    try {
      const stats = await storage.getJobStatistics();
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching job stats:", error?.message);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Get signed URL for resume (secure access)
  app.get('/api/resume/:resumePath', isAuthenticated, async (req: any, res) => {
    try {
      const resumePath = decodeURIComponent(req.params.resumePath);
      if (!resumePath.startsWith(`resumes/${req.user.id}/`) && !resumePath.startsWith(`${req.user.id}/`)) {
        return res.status(403).json({ message: "Not authorized to access this resume" });
      }
      const signedUrl = await storage.getResumeSignedUrl(resumePath);
      res.json({ url: signedUrl });
    } catch (error) {
      console.error("Error generating resume URL:", error);
      res.status(500).json({ message: "Failed to generate resume URL" });
    }
  });

  // Resume upload
  app.post('/api/candidate/resume', isAuthenticated, upload.single('resume'), async (req: any, res) => {
    try {
      if (!req.file) {
        console.error("Resume upload error: No file uploaded or file too large/wrong type.");
        return res.status(400).json({ message: "No file uploaded or file too large/wrong type" });
      }

      // Validate file magic bytes
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!validateFileSignature(req.file.buffer, ext)) {
        console.error("Resume upload error: File content does not match extension");
        return res.status(400).json({ message: "Invalid file: content does not match file type" });
      }

      console.log("Received file:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
      const result = await resumeService.uploadAndProcessResume(req.user.id, req.file.buffer, req.file.mimetype);
      res.json(result);
    } catch (error) {
      console.error("Error processing resume upload:", error);
      console.error("Error details:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        originalError: error?.originalError
      });
      if (error instanceof ResumeProcessingError) {
        return res.status(500).json({
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.originalError?.message : undefined
        });
      }
      res.status(500).json({
        message: "Failed to upload resume",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  });

  // Candidate specific stats
  app.get('/api/candidate/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getCandidateStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching candidate stats:", error);
      res.status(500).json({ message: "Failed to fetch candidate stats" });
    }
  });

  // Candidate activity
  app.get('/api/candidate/activity', isAuthenticated, async (req: any, res) => {
    try {
      const activity = await storage.getActivityLogs(req.user.id);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching candidate activity:", error);
      res.status(500).json({ message: "Failed to fetch candidate activity" });
    }
  });

  // Candidate applications
  app.get('/api/candidate/applications', isAuthenticated, async (req: any, res) => {
    try {
      const applications = await storage.getApplicationsWithStatus(req.user.id);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching candidate applications:", error);
      res.status(500).json({ message: "Failed to fetch candidate applications" });
    }
  });

  // Get saved jobs for a candidate
  app.get('/api/candidate/saved-jobs', isAuthenticated, async (req: any, res) => {
    try {
      const savedJobIds = await storage.getSavedJobIds(req.user.id);
      if (savedJobIds.length === 0) {
        return res.json([]);
      }
      
      // Fetch full job details for saved jobs
      const { db } = await import('./db.js');
      const { jobPostings } = await import('../shared/schema.js');

      const savedJobs = await db
        .select()
        .from(jobPostings)
        .where(inArray(jobPostings.id, savedJobIds));
      
      res.json(savedJobs);
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
      res.status(500).json({ message: "Failed to fetch saved jobs" });
    }
  });

  // Save a job for a candidate
  app.post('/api/candidate/saved-jobs', isAuthenticated, async (req: any, res) => {
    try {
      const { jobId } = req.body;
      if (!jobId) {
        return res.status(400).json({ message: "jobId is required" });
      }
      await storage.saveJob(req.user.id, jobId);
      res.status(201).json({ message: "Job saved successfully" });
    } catch (error) {
      console.error("Error saving job:", error);
      res.status(500).json({ message: "Failed to save job" });
    }
  });

  // Unsave a job for a candidate
  app.delete('/api/candidate/saved-jobs/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Invalid jobId" });
      await storage.unsaveJob(req.user.id, jobId);
      res.status(200).json({ message: "Job unsaved successfully" });
    } catch (error) {
      console.error("Error unsaving job:", error);
      res.status(500).json({ message: "Failed to unsave job" });
    }
  });

  // Hide a job for a candidate
  app.post('/api/candidate/hidden-jobs', isAuthenticated, async (req: any, res) => {
    try {
      const { jobId } = req.body;
      if (!jobId) {
        return res.status(400).json({ message: "jobId is required" });
      }
      await storage.hideJob(req.user.id, jobId);
      res.status(201).json({ message: "Job hidden successfully" });
    } catch (error) {
      console.error("Error hiding job:", error);
      res.status(500).json({ message: "Failed to hide job" });
    }
  });

  // Get all job actions for a candidate
  app.get('/api/candidate/job-actions', isAuthenticated, async (req: any, res) => {
    try {
      const savedJobIds = await storage.getSavedJobIds(req.user.id);
      const applications = await storage.getApplicationsForCandidate(req.user.id);
      const appliedJobIds = applications.map(app => app.jobId);

      res.json({
        saved: savedJobIds,
        applied: appliedJobIds,
      });
    } catch (error) {
      console.error("Error fetching job actions:", error);
      res.status(500).json({ message: "Failed to fetch job actions" });
    }
  });

  // Candidate can update their own application status (for external jobs)
  app.put('/api/candidate/application/:applicationId/status', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: "Status is required" });

      const VALID_CANDIDATE_STATUSES = ['submitted', 'screening', 'interview_scheduled', 'offer', 'rejected', 'withdrawn'];
      if (!VALID_CANDIDATE_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_CANDIDATE_STATUSES.join(', ')}` });
      }
      
      const applicationId = parseIntParam(req.params.applicationId);
      if (!applicationId) return res.status(400).json({ message: "Invalid applicationId" });
      
      // Verify the application belongs to this candidate
      const application = await storage.getApplicationById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (application.candidateId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Update the status
      const updatedApplication = await storage.updateApplicationStatusByCandidate(applicationId, status);
      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating application status:", error);
      res.status(500).json({ message: "Failed to update application status" });
    }
  });

  // Job application
  app.post('/api/candidate/apply/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Invalid jobId" });
      const existingApplication = await storage.getApplicationByJobAndCandidate(jobId, userId);
      if (existingApplication) return res.status(400).json({ message: "Already applied to this job" });

      const job = await storage.getJobPosting(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Check if it's an internal/platform job (not external)
      const isInternalJob = !job.externalUrl && (job.source === 'platform' || job.source === 'internal' || !job.source);
      
      let applicationMetadata = undefined;
      
      // Only store professional links for internal jobs
      if (isInternalJob) {
        const candidateProfile = await storage.getCandidateUser(userId);
        applicationMetadata = {
          linkedinUrl: (candidateProfile as any)?.linkedinUrl,
          githubUrl: (candidateProfile as any)?.githubUrl,
          portfolioUrl: (candidateProfile as any)?.portfolioUrl,
        };
      }
      
      const application = await storage.createJobApplication({
        jobId,
        candidateId: userId,
        status: 'submitted',
        metadata: applicationMetadata
      });
      
      await storage.createActivityLog(userId, "job_applied", `Applied to job ID: ${jobId}`);

      if (isInternalJob) {
        // Enhanced notification for internal jobs with professional links
        const hasLinks = applicationMetadata?.linkedinUrl || applicationMetadata?.githubUrl || applicationMetadata?.portfolioUrl;
        await notificationService.createNotification({
          userId: job.talentOwnerId,
          type: 'new_application',
          title: 'New Application Received',
          message: `You have a new application for ${job.title}.${hasLinks ? ' Candidate has provided professional links.' : ''}`,
          relatedApplicationId: application.id,
        });
      }
      
      res.json(application);
    } catch (error) {
      console.error("Error applying to job:", error);
      res.status(500).json({ message: "Failed to apply to job" });
    }
  });

  // Talent Owner routes
  app.get('/api/talent-owner/jobs', isAuthenticated, async (req: any, res) => {
    try {
      console.log(`[Talent Owner Jobs] Fetching jobs for user: ${req.user.id}`);
      const jobs = await storage.getJobPostings(req.user.id);
      console.log(`[Talent Owner Jobs] Found ${jobs.length} jobs for user ${req.user.id}`);
      if (jobs.length > 0) {
        console.log(`[Talent Owner Jobs] Job IDs: ${jobs.map((j: any) => j.id).join(', ')}`);
      }
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching talent owner jobs:", error);
      res.status(500).json({ message: "Failed to fetch job postings" });
    }
  });

  // Get all applicants across all jobs for a talent owner (for analytics)
  app.get('/api/talent-owner/all-applicants', isAuthenticated, async (req: any, res) => {
    try {
      const candidates = await storage.getCandidatesForRecruiter(req.user.id);
      // Transform to a flat applicant list
      const applicants = candidates.map((c: any) => ({
        applicationId: c.application.id,
        status: c.application.status,
        appliedAt: c.application.appliedAt,
        updatedAt: c.application.updatedAt || c.application.appliedAt,
        candidate: {
          id: c.candidate.id,
          firstName: c.candidate.firstName || c.candidate.first_name,
          lastName: c.candidate.lastName || c.candidate.last_name,
          email: c.candidate.email,
        },
        profile: {
          skills: c.profile?.skills || [],
          experience: c.profile?.experience,
          resumeUrl: c.profile?.resumeUrl,
        },
        job: {
          id: c.job.id,
          title: c.job.title,
          company: c.job.company,
        }
      }));
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching all applicants:", error);
      res.status(500).json({ message: "Failed to fetch applicants" });
    }
  });

  // Get talent owner profile
  app.get('/api/talent-owner/profile', isAuthenticated, async (req: any, res) => {
    try {
      const profile = await storage.getTalentOwnerProfile(req.user.id);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching talent owner profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Recruiter specific stats
  app.get('/api/recruiter/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getRecruiterStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching recruiter stats:", error);
      res.status(500).json({ message: "Failed to fetch recruiter stats" });
    }
  });

  app.post('/api/jobs', isAuthenticated, async (req: any, res) => {
    try {
      // Log request details for debugging job creation issues
      console.log('[Job Creation] Request:', {
        userId: req.user?.id,
        hasTitle: !!req.body?.title,
        hasCompany: !!req.body?.company,
        hasDescription: !!req.body?.description,
        hasSkills: !!req.body?.skills && Array.isArray(req.body.skills) && req.body.skills.length > 0,
        workType: req.body?.workType,
        bodyKeys: Object.keys(req.body || {})
      });

      const jobData = insertJobPostingSchema.parse({ ...req.body, talentOwnerId: req.user.id });
      console.log(`[Job Creation] Parsed job data with talentOwnerId: ${jobData.talentOwnerId}`);
      const job = await storage.createJobPosting(jobData);
      console.log(`[Job Creation] Successfully created job ID: ${job.id} for talent owner: ${job.talentOwnerId}`);

      // Return job IMMEDIATELY (within <100ms) before any async operations
      // All heavy processing happens in background to prevent timeouts
      res.status(201).json({
        ...job,
        message: "Job posted successfully! Processing in background..."
      });

      // Process everything asynchronously in background - fire and forget
      // This prevents timeouts when processing exams, matching candidates, etc.
      setTimeout(async () => {
        try {
          // Generate exam questions if needed
          if (job.hasExam) {
            try {
              const examData = {
                jobId: job.id,
                title: `${job.title} Assessment`,
                questions: await generateExamQuestions(job)
              };
              await storage.createJobExam(examData);
              console.log(`[Background] Exam generated for job ${job.id}`);
            } catch (examError) {
              console.warn(`[Background] Failed to generate exam for job ${job.id}:`, examError?.message);
              // Continue - exam generation is not critical
            }
          }

          // Log activity in background
          await storage.createActivityLog(req.user.id, "job_posted", `Job posted: ${job.title}`);
          console.log(`[Background] Activity logged for job ${job.id}`);

          // Process candidate matching in background
          processJobMatchesInBackground(job.id);
        } catch (bgError) {
          console.error(`[Background] Error processing job ${job.id}:`, bgError?.message);
        }
      }, 0);

    } catch (error) {
      console.error("[Job Creation] Error:", error);
      if (error instanceof z.ZodError) {
        const fieldErrors = error.flatten().fieldErrors;
        const errorSummary = Object.entries(fieldErrors)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
          .join('; ');
        console.error("[Job Creation] Validation errors:", errorSummary);
        return res.status(400).json({
          message: `Validation failed: ${errorSummary}`,
          errors: fieldErrors,
        });
      }
      res.status(500).json({
        message: "Failed to create job posting",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Update job posting (PUT /api/jobs/:jobId)
  app.put('/api/jobs/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Invalid jobId" });
      const userId = req.user.id;

      // Verify ownership
      const job = await storage.getJobPosting(jobId);
      if (!job || job.talentOwnerId !== userId) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Validate request body
      const validatedData = updateJobPostingSchema.parse(req.body);

      const updatedJob = await storage.updateJobPosting(jobId, userId, validatedData);
      await storage.createActivityLog(userId, "job_updated", `Job updated: ${updatedJob.title}`);
      res.json(updatedJob);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid job data",
          errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      console.error("Error updating job posting:", error);
      res.status(500).json({ message: "Failed to update job posting" });
    }
  });

  // Delete job posting (DELETE /api/jobs/:jobId)
  app.delete('/api/jobs/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Invalid jobId" });
      const userId = req.user.id;

      // Verify ownership
      const job = await storage.getJobPosting(jobId);
      if (!job || job.talentOwnerId !== userId) {
        return res.status(404).json({ message: 'Job not found' });
      }

      await storage.deleteJobPosting(jobId, userId);
      await storage.createActivityLog(userId, "job_deleted", `Job deleted: ${job.title}`);
      res.json({ message: 'Job deleted successfully' });
    } catch (error) {
      console.error("Error deleting job posting:", error);
      res.status(500).json({ message: "Failed to delete job posting" });
    }
  });

  // Update job status (pause/resume/close)
  app.patch('/api/jobs/:jobId/status', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Invalid jobId" });
      const userId = req.user.id;
      const { status } = req.body;

      if (!['active', 'paused', 'closed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be active, paused, or closed.' });
      }

      // Verify ownership
      const job = await storage.getJobPosting(jobId);
      if (!job || job.talentOwnerId !== userId) {
        return res.status(404).json({ message: 'Job not found' });
      }

      const updatedJob = await storage.updateJobPosting(jobId, userId, { status });
      await storage.createActivityLog(userId, "job_status_changed", `Job status changed to ${status}: ${job.title}`);
      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating job status:", error);
      res.status(500).json({ message: "Failed to update job status" });
    }
  });

  app.post('/api/talent-owner/profile/complete', isAuthenticated, async (req: any, res) => {
    try {
      const validated = completeTalentOwnerProfileSchema.parse(req.body);

      const {
        firstName,
        lastName,
        phoneNumber,
        jobTitle,
        companyName,
        companyWebsite,
        companySize,
        industry,
        companyLocation,
        companyDescription,
      } = validated;

      console.log(`[routes] Completing profile for talent owner ${req.user.id}`);

      // Update basic user info
      await storage.updateUserInfo(req.user.id, {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        profile_complete: true,
      });

      // Update/Create talent owner profile
      const updatedProfile = await storage.upsertTalentOwnerProfile({
        userId: req.user.id,
        jobTitle,
        companyName,
        companyWebsite,
        companySize,
        industry,
        companyLocation,
        companyDescription,
        profileComplete: true,
      });

      res.json({
        ...updatedProfile,
        firstName,
        lastName,
        phoneNumber,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid profile data",
          errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      console.error("Error completing talent owner profile:", error);
      res.status(500).json({ message: "Failed to complete profile" });
    }
  });


  app.get('/api/jobs/:jobId/applicants', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Invalid jobId" });
      const applicants = await storage.getApplicantsForJob(jobId, req.user.id);
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      res.status(500).json({ message: "Failed to fetch applicants" });
    }
  });

  // Screening Questions API
  // Get screening questions for a job
  app.get('/api/jobs/:jobId/screening-questions', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Invalid jobId" });
      const questions = await storage.getScreeningQuestions(jobId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching screening questions:", error);
      res.status(500).json({ message: "Failed to fetch screening questions" });
    }
  });

  // Create/Update screening questions for a job
  app.post('/api/jobs/:jobId/screening-questions', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Invalid jobId" });
      const userId = req.user.id;

      // Verify ownership
      const job = await storage.getJobPosting(jobId);
      if (!job || job.talentOwnerId !== userId) {
        return res.status(404).json({ message: 'Job not found' });
      }

      const { questions } = req.body;
      if (!Array.isArray(questions)) {
        return res.status(400).json({ message: 'Questions must be an array' });
      }

      const savedQuestions = await storage.saveScreeningQuestions(jobId, questions);
      res.json(savedQuestions);
    } catch (error) {
      console.error("Error saving screening questions:", error);
      res.status(500).json({ message: "Failed to save screening questions" });
    }
  });

  // Submit screening answers for an application
  app.post('/api/applications/:applicationId/screening-answers', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseIntParam(req.params.applicationId);
      if (!applicationId) return res.status(400).json({ message: "Invalid applicationId" });

      const [application] = await db.select({ candidateId: jobApplications.candidateId })
        .from(jobApplications).where(eq(jobApplications.id, applicationId));
      if (!application || application.candidateId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const { answers } = req.body;

      if (!Array.isArray(answers)) {
        return res.status(400).json({ message: 'Answers must be an array' });
      }

      const savedAnswers = await storage.saveScreeningAnswers(applicationId, answers);
      res.json(savedAnswers);
    } catch (error) {
      console.error("Error saving screening answers:", error);
      res.status(500).json({ message: "Failed to save screening answers" });
    }
  });

  app.get('/api/jobs/:jobId/discovery', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Invalid jobId" });
      const job = await storage.getJobPosting(jobId);

      if (!job || job.talentOwnerId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized to access this job's discovery" });
      }

      const matches = await storage.findMatchingCandidates(jobId);
      res.json(matches);
    } catch (error) {
      console.error("Error in job discovery:", error);
      res.status(500).json({ message: "Failed to fetch matching candidates" });
    }
  });

  app.put('/api/applications/:applicationId/status', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: "Status is required." });
      const applicationId = parseIntParam(req.params.applicationId);
      if (!applicationId) return res.status(400).json({ message: "Invalid applicationId" });
      const updatedApplication = await storage.updateApplicationStatus(applicationId, status, req.user.id);

      // Track AI event for status change
      try {
        await applicationIntelligence.trackApplicationEvent(
          req.params.applicationId,
          status as any,
          { role: 'recruiter', name: req.user.firstName || 'Recruiter' },
          { feedback: req.body.feedback || `Status updated to ${status}` }
        );
      } catch (error) {
        console.error("Error tracking application event:", error);
      }

      // Send richer notifications for terminal states
      if (status === 'accepted' || status === 'offer' || status === 'rejected') {
        try {
          const application = await storage.getApplicationById(applicationId);
          if (application) {
            const job = await storage.getJobPosting(application.jobId);
            
            if (status === 'accepted' || status === 'offer') {
              await notificationService.notifyApplicationAccepted(
                application.candidateId,
                job?.title || 'Unknown Job',
                job?.company || 'Unknown Company',
                applicationId
              );
            } else if (status === 'rejected') {
              await notificationService.notifyApplicationRejected(
                application.candidateId,
                job?.title || 'Unknown Job',
                job?.company || 'Unknown Company',
                applicationId
              );
            }
          }
        } catch (notifyError) {
          console.error("Error sending status notification:", notifyError);
        }
      }

      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating application status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.post('/api/jobs/:jobId/exam/submit', isAuthenticated, async (req: any, res) => {
    try {
      const { jobId } = req.params;
      const { answers } = req.body;
      const result = await examService.submitExam(parseInt(jobId), req.user.id, answers);
      res.json(result);
    } catch (error) {
      console.error("Error submitting exam:", error);
      res.status(500).json({ message: "Failed to submit exam" });
    }
  });

  // Notification endpoints
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const notifications = await notificationService.getAllNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/count', isAuthenticated, async (req: any, res) => {
    try {
      const count = await notificationService.getUnreadCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ message: "Failed to fetch notification count" });
    }
  });

  app.post('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseIntParam(req.params.id);
      if (!notificationId) return res.status(400).json({ message: "Invalid notification id" });
      await notificationService.markAsRead(notificationId, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      await notificationService.markAllAsRead(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Polling-based notification endpoints (Vercel serverless compatible)
  app.get('/api/notifications/poll', isAuthenticated, async (req: any, res) => {
    try {
      const lastNotificationId = req.query.lastId ? parseInt(req.query.lastId as string) : undefined;
      const longPoll = req.query.longPoll === 'true';

      const result = await notificationService.pollNotifications(req.user.id, {
        lastNotificationId,
        longPoll,
        timeout: 25000 // 25 seconds max for Vercel
      });

      res.json(result);
    } catch (error) {
      console.error("Error polling notifications:", error);
      res.status(500).json({ message: "Failed to poll notifications" });
    }
  });

  app.post('/api/notifications/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const result = await notificationService.subscribePolling(req.user.id);
      res.json(result);
    } catch (error) {
      console.error("Error subscribing to notifications:", error);
      res.status(500).json({ message: "Failed to subscribe to notifications" });
    }
  });

  app.post('/api/notifications/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      await notificationService.unsubscribePolling(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unsubscribing from notifications:", error);
      res.status(500).json({ message: "Failed to unsubscribe from notifications" });
    }
  });

  app.get('/api/notifications/connection-status', isAuthenticated, async (req: any, res) => {
    try {
      const status = await notificationService.getConnectionStatus(req.user.id);
      res.json(status);
    } catch (error) {
      console.error("Error getting connection status:", error);
      res.status(500).json({ message: "Failed to get connection status" });
    }
  });

  // Interview scheduling endpoint
  app.post('/api/interviews/schedule', isAuthenticated, async (req: any, res) => {
    try {
      const validated = scheduleInterviewSchema.parse(req.body);

      // Verify the talent owner has permission to schedule interviews for this job
      const job = await storage.getJobPosting(validated.jobId);
      if (!job || job.talentOwnerId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized to schedule interviews for this job" });
      }

      const interview = await storage.createInterview({
        candidateId: validated.candidateId,
        interviewerId: req.user.id,
        jobId: validated.jobId,
        applicationId: validated.applicationId,
        scheduledAt: validated.scheduledAt,
        duration: validated.duration || 60,
        platform: validated.platform || 'video',
        meetingLink: validated.meetingLink,
        notes: validated.notes,
      });

      // Notify the candidate about the scheduled interview
      const candidate = await storage.getCandidateUser(validated.candidateId);
      const formattedDate = new Date(validated.scheduledAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      await notificationService.notifyInterviewScheduled(
        validated.candidateId,
        job.company,
        job.title,
        formattedDate,
        validated.applicationId
      );

      res.json(interview);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid interview data",
          errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      console.error("Error scheduling interview:", error);
      res.status(500).json({ message: "Failed to schedule interview" });
    }
  });

  // Advanced matching endpoints
  app.get('/api/advanced-matches/:candidateId', isAuthenticated, async (req: any, res) => {
    // Add timeout to prevent hanging
    const timeoutMs = 15000; // 15 second timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Advanced matching timeout')), timeoutMs)
    );

    try {
      const { candidateId } = req.params;

      // Verify the user is requesting their own matches or is a talent owner
      const user = await storage.getUser(req.user.id);
      if (candidateId !== req.user.id && user?.role !== 'talent_owner') {
        return res.status(403).json({ message: "Unauthorized to view these matches" });
      }

      // Race between matching and timeout
      const matches = await Promise.race([
        advancedMatchingEngine.getPersonalizedJobFeed(candidateId),
        timeoutPromise
      ]) as EnhancedJobMatch[];
      
      res.json({ matches: matches || [], total: matches?.length || 0, algorithm: 'SOTA-10-factor' });
    } catch (error: any) {
      console.error("Error fetching advanced matches:", error?.message);
      if (error?.message?.includes('timeout')) {
        return res.status(504).json({ message: "Match generation timed out", matches: [], total: 0 });
      }
      res.status(500).json({ message: "Failed to fetch advanced matches", matches: [], total: 0 });
    }
  });

  app.put('/api/candidate/match-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const preferences = req.body;
      await advancedMatchingEngine.updateMatchPreferences(req.user.id, preferences);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating match preferences:", error);
      res.status(500).json({ message: "Failed to update match preferences" });
    }
  });

  // Exam retrieval endpoint
  app.get('/api/jobs/:jobId/exam', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Invalid jobId" });
      const job = await storage.getJobPosting(jobId);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (!job.hasExam) {
        return res.status(404).json({ message: "This job does not have an exam" });
      }

      const exam = await storage.getJobExam(jobId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found for this job" });
      }

      // Return exam without correct answers for candidates
      const examForCandidate = {
        id: exam.id,
        jobId: exam.jobId,
        title: exam.title,
        questions: exam.questions.map((q: any) => ({
          id: q.id,
          question: q.question,
          type: q.type,
          options: q.options,
          points: q.points
          // Note: correctAnswer is intentionally omitted
        })),
        timeLimit: exam.timeLimit,
        passingScore: exam.passingScore
      };

      res.json(examForCandidate);
    } catch (error) {
      console.error("Error fetching exam:", error);
      res.status(500).json({ message: "Failed to fetch exam" });
    }
  });

  // ==========================================
  // STRIPE SUBSCRIPTION ROUTES
  // ==========================================

  // Import Stripe service
  const { stripeService } = await import('./services/stripe.service');

  // Get subscription status
  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      const subscription = await stripeService.getUserSubscription(req.user.id);
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Get available subscription tiers
  app.get('/api/subscription/tiers', async (req, res) => {
    try {
      const tiers = await stripeService.getAvailableTiers();
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching subscription tiers:", error);
      res.status(500).json({ message: "Failed to fetch subscription tiers" });
    }
  });

  // Create checkout session (accepts tierName or tierId for backward compat)
  app.post('/api/stripe/create-checkout', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripeService.isConfigured()) {
        return res.status(503).json({ message: "Payment system is not configured" });
      }

      const { tierName, tierId, billingCycle } = req.body;

      if (!billingCycle) {
        return res.status(400).json({ message: "Missing billingCycle" });
      }

      let checkoutUrl: string;
      if (tierName) {
        checkoutUrl = await stripeService.createCheckoutSessionByName(
          req.user.id,
          tierName,
          billingCycle
        );
      } else if (tierId) {
        checkoutUrl = await stripeService.createCheckoutSession(
          req.user.id,
          tierId,
          billingCycle
        );
      } else {
        return res.status(400).json({ message: "Missing tierName or tierId" });
      }

      res.json({ url: checkoutUrl });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: error.message || "Failed to create checkout session" });
    }
  });

  // Create customer portal session
  app.post('/api/stripe/portal', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripeService.isConfigured()) {
        return res.status(503).json({ message: "Payment system is not configured" });
      }

      const portalUrl = await stripeService.createPortalSession(req.user.id);
      res.json({ url: portalUrl });
    } catch (error: any) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: error.message || "Failed to create portal session" });
    }
  });

  // Check feature access
  app.get('/api/subscription/can-access/:feature', isAuthenticated, async (req: any, res) => {
    try {
      const { feature } = req.params;
      const access = await stripeService.canAccessFeature(req.user.id, feature);
      res.json(access);
    } catch (error) {
      console.error("Error checking feature access:", error);
      res.status(500).json({ message: "Failed to check feature access" });
    }
  });

  // Stripe webhook route is in index.ts (before express.json() for raw body verification)

  // Initialize default subscription tiers (admin endpoint) - DISABLED in production
  app.post('/api/admin/init-subscription-tiers', async (req, res) => {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: "This endpoint is disabled in production" });
    }

    // Require admin secret
    const adminSecret = req.headers['x-admin-secret'];
    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      await stripeService.initializeDefaultTiers();
      res.json({ success: true, message: "Subscription tiers initialized" });
    } catch (error) {
      console.error("Error initializing subscription tiers:", error);
      res.status(500).json({ message: "Failed to initialize subscription tiers" });
    }
  });

  // Trigger external jobs scraping (for Vercel Cron or manual requests)
  // Returns immediately and scrapes in background (non-blocking)
  app.post('/api/cron/scrape-external-jobs', async (req, res) => {
    try {
      // Verify cron secret for security (required if CRON_SECRET is set)
      const cronSecret = req.headers['x-cron-secret'];
      if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Return immediately without waiting for scraping to complete
      // This prevents Vercel timeout while still allowing the scraping to happen
      res.json({ message: "External jobs scraping triggered", status: "in_progress" });

      // Trigger scraping in background (fire and forget)
      externalJobsScheduler.triggerScrape()
        .then(result => {
          console.log('[Routes] External jobs scrape completed:', result);
        })
        .catch(error => {
          console.error('[Routes] External jobs scrape failed:', error?.message);
        });
    } catch (error: any) {
      console.error("Error triggering external jobs scrape:", error?.message);
      res.status(500).json({ message: "Failed to trigger external jobs scraping", error: error?.message });
    }
  });

  // Ghost job detection endpoints
  app.post('/api/admin/run-ghost-job-detection', async (req, res) => {
    try {
      // Verify admin secret
      const adminSecret = req.headers['x-admin-secret'];
      if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { ghostJobDetectionService } = await import('./ghost-job-detection.service');
      
      // Run in background
      res.json({ message: "Ghost job detection started", status: "in_progress" });
      
      ghostJobDetectionService.runBatchAnalysis()
        .then(stats => {
          console.log('[Routes] Ghost job detection completed:', stats);
        })
        .catch(error => {
          console.error('[Routes] Ghost job detection failed:', error?.message);
        });
    } catch (error: any) {
      console.error("Error running ghost job detection:", error?.message);
      res.status(500).json({ message: "Failed to run ghost job detection", error: error?.message });
    }
  });

  app.get('/api/admin/ghost-job-stats', async (req, res) => {
    try {
      // Verify admin secret
      const adminSecret = req.headers['x-admin-secret'];
      if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { ghostJobDetectionService } = await import('./ghost-job-detection.service');
      const stats = await ghostJobDetectionService.getStatistics();
      const flaggedJobs = await ghostJobDetectionService.getFlaggedJobs(50);
      
      res.json({ stats, flaggedJobs });
    } catch (error: any) {
      console.error("Error fetching ghost job stats:", error?.message);
      res.status(500).json({ message: "Failed to fetch ghost job stats", error: error?.message });
    }
  });

  // Company verification endpoints
  app.post('/api/admin/run-company-verification', async (req, res) => {
    try {
      // Verify admin secret
      const adminSecret = req.headers['x-admin-secret'];
      if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { companyVerificationService } = await import('./company-verification.service');
      
      // Run in background
      res.json({ message: "Company verification started", status: "in_progress" });
      
      companyVerificationService.runBatchVerification()
        .then(stats => {
          console.log('[Routes] Company verification completed:', stats);
        })
        .catch(error => {
          console.error('[Routes] Company verification failed:', error?.message);
        });
    } catch (error: any) {
      console.error("Error running company verification:", error?.message);
      res.status(500).json({ message: "Failed to run company verification", error: error?.message });
    }
  });

  app.get('/api/admin/company-verification-stats', async (req, res) => {
    try {
      // Verify admin secret
      const adminSecret = req.headers['x-admin-secret'];
      if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { companyVerificationService } = await import('./company-verification.service');
      const stats = await companyVerificationService.getStatistics();
      
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching company verification stats:", error?.message);
      res.status(500).json({ message: "Failed to fetch company verification stats", error: error?.message });
    }
  });

  // Job quality indicators for candidates
  app.get('/api/jobs/:jobId/quality-indicators', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      const job = await storage.getJobPosting(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Return quality indicators without exposing sensitive data
      res.json({
        trustScore: job.trustScore || 50,
        livenessStatus: job.livenessStatus || 'unknown',
        ghostJobScore: job.ghostJobScore || 0,
        ghostJobStatus: job.ghostJobStatus || 'clean',
        companyVerified: job.companyVerified || false,
        viewCount: job.viewCount || 0,
        applicationCount: job.applicationCount || 0,
        isExternal: job.source !== 'platform',
      });
    } catch (error: any) {
      console.error("Error fetching job quality indicators:", error?.message);
      res.status(500).json({ message: "Failed to fetch job quality indicators", error: error?.message });
    }
  });

  // ==========================================
  // AGENT APPLY ENDPOINTS
  // ==========================================

  app.post('/api/candidate/agent-apply/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) return res.status(400).json({ message: "Invalid jobId" });

      // Duplicate check
      const existingApplication = await storage.getApplicationByJobAndCandidate(jobId, userId);
      if (existingApplication) {
        return res.status(400).json({ message: "Already applied to this job" });
      }

      // Validate job is external
      const job = await storage.getJobPosting(jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });
      if (!job.externalUrl) {
        return res.status(400).json({ message: "Agent apply is only available for external jobs" });
      }

      // Validate candidate has resume
      const candidateProfile = await storage.getCandidateUser(userId);
      if (!candidateProfile?.resumeUrl) {
        return res.status(400).json({ message: "Please upload your resume first" });
      }

      // Snapshot candidate data
      const candidateData = {
        firstName: candidateProfile.firstName || '',
        lastName: candidateProfile.lastName || '',
        email: candidateProfile.email || '',
        phone: (candidateProfile as any).phone || '',
        linkedinUrl: candidateProfile.linkedinUrl || '',
        githubUrl: candidateProfile.githubUrl || '',
        portfolioUrl: candidateProfile.portfolioUrl || '',
        skills: candidateProfile.skills || [],
        experience: candidateProfile.experience || '',
        location: candidateProfile.location || '',
      };

      // Create application with autoFilled flag
      const application = await storage.createJobApplication({
        jobId,
        candidateId: userId,
        status: 'submitted',
        autoFilled: true,
        resumeUrl: candidateProfile.resumeUrl,
        metadata: { agentApply: true, queuedAt: new Date().toISOString() },
      });

      // Create agent task
      const agentTask = await storage.createAgentTask({
        applicationId: application.id,
        candidateId: userId,
        jobId,
        externalUrl: job.externalUrl,
        status: 'queued',
        candidateData,
        resumeUrl: candidateProfile.resumeUrl,
      });

      await storage.createActivityLog(userId, "agent_apply_queued", `Queued agent apply for job ID: ${jobId}`);

      res.json({ application, agentTask: { id: agentTask.id, status: agentTask.status } });
    } catch (error: any) {
      console.error("Error queuing agent apply:", error?.message);
      res.status(500).json({ message: "Failed to queue agent apply" });
    }
  });

  app.get('/api/candidate/agent-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const tasks = await storage.getAgentTasksForCandidate(req.user.id);
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching agent tasks:", error?.message);
      res.status(500).json({ message: "Failed to fetch agent tasks" });
    }
  });

  return app;
}