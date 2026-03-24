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
  users,
  jobPostings,
  jobApplications,
  agentTasks,
  JobPosting,
} from "@shared/schema";
import { generateScreeningQuestions } from "./ai-service";
import { db, testDbConnection } from "./db";
import { seedDatabase } from "./seed.js";
import { ResumeService, ResumeProcessingError } from './services/resume.service';
import { ExamService } from './services/exam.service';
import { aiResumeParser } from './ai-resume-parser';
import { applicationIntelligence } from "./application-intelligence";
import { supabaseAdmin } from "./lib/supabase-admin";
import { CompanyJob } from '../server/company-jobs-aggregator';
import { externalJobsScheduler } from './services/external-jobs-scheduler';
import { jobIngestionService } from './services/job-ingestion.service';
import { getModelInfo } from './ml-matching';
import { sendWelcomeEmail, sendEmail } from './email-service';
import { sendEmail as sendTransactionalEmail, employerWelcomeEmail, employerNewApplicantEmail } from './lib/email';
// greenhouse-submit.service.ts kept for future use (verification code flow, etc.)
import { asyncHandler } from './middleware/error-handler';
import { verifyAdminSecret, verifyCronSecret } from './middleware/security';
import rateLimit from 'express-rate-limit';
import { captureException } from './error-monitoring';
import { recordMatchSignal, joinExamScore } from './services/match-signals.service';
import { scoreJob } from './job-scorer';
import type { SignalAction } from './services/match-signals.service';

/**
 * Fire-and-forget: record a match signal with the full feature snapshot.
 * Never blocks the request path — errors are swallowed.
 */
function recordSignal(candidateId: string, jobId: number, action: SignalAction, job?: any): void {
  const resolve = job ? Promise.resolve(job) : storage.getJobPosting(jobId);
  resolve.then(j => {
    if (!j) return;
    storage.getCandidateUser(candidateId).then(cp => {
      if (!cp) return;
      const skills = Array.isArray(cp.skills) ? (cp.skills as string[]) : [];
      const score = scoreJob(skills, cp.experienceLevel, j);
      recordMatchSignal(candidateId, jobId, action, score).catch(() => {});
    }).catch(() => {});
  }).catch(() => {});
}

// Admin/owner accounts bypass daily usage limits
// Set via ADMIN_EMAILS env var (comma-separated): "alice@example.com,bob@example.com"
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '').replace(/\\n/g, '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
);
function isAdminUser(req: any): boolean {
  return ADMIN_EMAILS.has(req.user?.email?.toLowerCase());
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
  if (!value) {return null;}
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
          console.error(`[Background] Batch processing error for job ${jobId}:`, (batchError as Error)?.message);
          // Continue with next batch
        }
      }

      console.log(`[Background] Completed candidate matching for job ${jobId}`);
    } catch (error) {
      console.error(`[Background] Error processing job matches for job ${jobId}:`, (error as Error)?.message);
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
  if (buffer.length < 4) {return false;}

  const ext = extension.toLowerCase().replace('.', '');
  const signature = FILE_SIGNATURES[ext as keyof typeof FILE_SIGNATURES];

  if (!signature) {return false;}

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
      correctAnswer: 1, // Intermediate or higher (index into options array)
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

import { registerMetricsRoutes } from './routes/metrics-api.js';

export async function registerRoutes(app: Express): Promise<Express> {
  console.log('registerRoutes called!');
  registerMetricsRoutes(app);

  // Dev-only route for seeding the database - DISABLED in production
  app.post('/api/dev/seed', asyncHandler(async (req, res) => {
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
  }));

  // Health check endpoint
  app.get('/api/health', asyncHandler(async (req, res) => {
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
  }));

  // ML Matching info endpoint
  app.get('/api/ml-matching/status', asyncHandler(async (req, res) => {
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
  }));

  // Layoff news endpoint
  app.get('/api/news/layoffs', asyncHandler(async (req, res) => {
    try {
      const articles = await newsService.getLayoffNews();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching layoff news:", error);
      res.status(500).json({ message: "Failed to fetch layoff news" });
    }
  }));

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
      matchScore: job.matchScore != null ? `${job.matchScore}%` : 'N/A',
      matchTier: job.matchTier ?? (job.matchScore != null ? (job.matchScore >= 75 ? 'great' : job.matchScore >= 50 ? 'good' : 'worth-a-look') : null),
      confidenceLevel: job.confidenceLevel ?? (job.matchScore != null ? (job.matchScore > 80 ? 90 : job.matchScore > 60 ? 70 : 50) : null),
      skillMatches: job.skillMatches || [],
      matchReasons: job.skillMatches?.length > 0 ? job.skillMatches : undefined,
      aiExplanation: aiExplanation || job.aiExplanation,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }

  // AI-powered job matching — single DB query, scored in application code
  app.get('/api/ai-matches', isAuthenticated, asyncHandler(async (req: any, res) => {
    const TIMEOUT_MS = 10000;

    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Matching timeout')), TIMEOUT_MS);
    });
    const finish = () => clearTimeout(timeoutId);

    try {
      const userId = req.user.id;
      console.log(`[ai-matches] user=${userId}`);

      const filters = {
        jobTitle: (req.query.jobTitle as string) || undefined,
        location: (req.query.location as string) || undefined,
        workType: (req.query.workType as string) || undefined,
      };

      // Single DB query — scored, filtered, and sorted inside storage layer
      const allRecommendations = await Promise.race([
        storage.getJobRecommendations(userId, filters),
        timeoutPromise,
      ]) as any[];

      finish();
      console.log(`[ai-matches] ${allRecommendations.length} matched jobs`);

      if (allRecommendations.length === 0) {
        return res.json({ applyAndKnowToday: [], matchedForYou: [] });
      }

      // Split into sections (already sorted by composite score from storage)
      const applyAndKnowToday = allRecommendations
        .filter((job: any) => job.source === 'platform' || !job.externalUrl)
        .map((job: any, index: number) => formatJobMatch(job, index));
      const matchedForYou = allRecommendations
        .filter((job: any) => job.source !== 'platform' && job.externalUrl)
        .map((job: any, index: number) => formatJobMatch(job, index));

      console.log(`[ai-matches] Sections: ${applyAndKnowToday.length} apply, ${matchedForYou.length} matched`);
      res.json({ applyAndKnowToday, matchedForYou });
    } catch (error: any) {
      console.error('[ai-matches] Error:', error?.message);
      finish();
      if (error?.message?.includes('timeout') || error?.message?.includes('cancel')) {
        return res.json({ applyAndKnowToday: [], matchedForYou: [] });
      }
      res.status(500).json({
        message: "Failed to generate job matches",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  }));

  // AI-powered screening questions
  app.post('/api/ai/screening-questions', isAuthenticated, asyncHandler(async (req: any, res) => {
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
  }));

  // Universal job scraper with database persistence
  // In-memory response cache for /api/external-jobs.
  // Keyed by normalized query string; entries expire after 3 minutes.
  // On Vercel each invocation is stateless, but within a warm instance this
  // eliminates repeated DB round-trips for identical searches.
  const externalJobsCache = new Map<string, { jobs: any[]; ts: number }>();
  const EXTERNAL_JOBS_TTL_MS = 3 * 60 * 1000; // 3 minutes

  app.get('/api/external-jobs', asyncHandler(async (req, res) => {
    try {
      const skills = req.query.skills
        ? String(req.query.skills).split(',').filter(Boolean).slice(0, 20).map(s => s.slice(0, 100))
        : [];
      const jobTitle = req.query.jobTitle ? String(req.query.jobTitle).slice(0, 200) : undefined;
      const location = req.query.location ? String(req.query.location).slice(0, 200) : undefined;
      const rawWorkType = req.query.workType ? String(req.query.workType) : undefined;
      const VALID_WORK_TYPES = ['remote', 'hybrid', 'onsite'] as const;
      const workType = rawWorkType && (VALID_WORK_TYPES as readonly string[]).includes(rawWorkType)
        ? rawWorkType
        : undefined;

      const cacheKey = JSON.stringify({ skills: skills.sort(), jobTitle, location, workType });
      const cached = externalJobsCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < EXTERNAL_JOBS_TTL_MS) {
        res.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=300');
        return res.json({ jobs: cached.jobs, cached: true, message: 'External jobs from cache' });
      }

      // Return external jobs from database (no live scraping)
      const externalJobs = await storage.getExternalJobs(skills, { jobTitle, location, workType });
      externalJobsCache.set(cacheKey, { jobs: externalJobs || [], ts: Date.now() });

      // triggerRefresh is only honoured for authenticated requests to prevent
      // unauthenticated callers from hammering the scrape pipeline (DOS risk)
      if (req.query.triggerRefresh === 'true' && (req as any).user) {
        const { externalJobsScheduler } = await import('./services/external-jobs-scheduler');
        externalJobsScheduler.triggerScrape()
          .catch(err => console.error('Background scrape trigger failed:', err?.message));
      }

      res.set('Cache-Control', 'public, max-age=180, stale-while-revalidate=300');
      res.json({
        jobs: externalJobs || [],
        cached: false,
        message: 'External jobs from database',
      });
    } catch (error) {
      console.error('Error fetching cached external jobs:', error);
      res.status(503).json({ jobs: [], cached: false, message: 'External jobs unavailable' });
    }
  }));

  // Platform stats
  app.get('/api/platform/stats', asyncHandler(async (req, res) => {
    if (!db) return res.status(503).json({ message: 'Database not available' });
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Stats query timeout')), 8000)
      );
      const [userCount, jobCount, matchCount] = await Promise.race([
        Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(users),
          db.select({ count: sql<number>`count(*)` }).from(jobPostings),
          db.select({ count: sql<number>`count(*)` }).from(jobApplications)
        ]),
        timeout
      ]) as any;
      const stats = {
        totalUsers: userCount[0].count || 0,
        totalJobs: jobCount[0].count || 0,
        totalMatches: matchCount[0].count || 0,
      };
      res.set('Cache-Control', 'public, max-age=300');
      res.json(stats);
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      res.status(503).json({ message: 'Stats temporarily unavailable' });
    }
  }));

  // Auth routes

  // Extension login — proxies email/password to Supabase, returns JWT tokens.
  // No isAuthenticated middleware: this IS the sign-in endpoint.
  app.post('/api/auth/extension-login', asyncHandler(async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ message: 'email and password are required' });
      }

      const supabaseUrl  = process.env.SUPABASE_URL;
      const supabaseAnon = process.env.SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnon) {
        return res.status(503).json({ message: 'Auth service not configured' });
      }

      const sbRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnon,
        },
        body: JSON.stringify({ email, password }),
      });

      const sbBody = await sbRes.json() as any;

      if (!sbRes.ok) {
        const msg = sbBody?.error_description || sbBody?.message || 'Invalid credentials';
        return res.status(401).json({ message: msg });
      }

      return res.json({
        accessToken:  sbBody.access_token,
        refreshToken: sbBody.refresh_token,
        expiresAt:    Date.now() + (sbBody.expires_in ?? 3600) * 1000,
        user: {
          email: sbBody.user?.email,
          name:  sbBody.user?.user_metadata?.first_name
                  ? `${sbBody.user.user_metadata.first_name} ${sbBody.user.user_metadata.last_name || ''}`.trim()
                  : sbBody.user?.email,
        },
      });
    } catch (error) {
      console.error('Extension login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  }));

  app.get('/api/auth/user', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      if (!req.user) {return res.status(401).json({ message: "Unauthorized" });}
      // Fetch user + candidate profile in parallel to eliminate sequential round-trip
      const [user, candidateProfile] = await Promise.all([
        storage.getUser(req.user.id),
        storage.getCandidateUser(req.user.id).catch(() => null),
      ]);
      if (!user) {return res.status(404).json({ message: "User not found" });}
      res.json({ ...user, candidateProfile: candidateProfile || null });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  }));

  // Sync Supabase auth user into local DB (called after signup/login)
  // For new users: requires a valid invite code (early access gate).
  // Existing users pass through without a code.
  app.post('/api/auth/sync', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      if (!req.user) {return res.status(401).json({ message: "Unauthorized" });}
      const isNew = !(await storage.getUser(req.user.id));

      // Early access gate: new users must provide a valid invite code
      if (isNew) {
        const inviteCode = req.body?.inviteCode || req.headers['x-invite-code'];
        if (!inviteCode) {
          return res.status(403).json({ message: 'Invite code required', code: 'INVITE_REQUIRED' });
        }
        const role = req.user.user_metadata?.role || 'candidate';
        const result = await storage.validateAndRedeemInviteCode(inviteCode, req.user.id, role);
        if (!result.valid) {
          return res.status(403).json({ message: result.error, code: 'INVITE_INVALID' });
        }
      }

      const user = await storage.upsertUser({
        id: req.user.id,
        email: req.user.email || '',
        name: req.user.email || req.user.id,
        emailVerified: true,
      });
      if (isNew && req.user.email) {
        sendWelcomeEmail(req.user.email, req.user.user_metadata?.first_name).catch((err: Error) =>
          console.error("Failed to send welcome email:", err)
        );
      }
      res.json({ success: true, user });
    } catch (error) {
      console.error("Error syncing user:", error);
      res.status(500).json({ message: "Failed to sync user" });
    }
  }));

  app.post('/api/auth/role', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      if (!req.user) {return res.status(401).json({ message: "Unauthorized" });}
      const { role } = req.body;
      if (!['candidate', 'talent_owner'].includes(role)) {return res.status(400).json({ message: "Invalid role" });}

      // Early access gate: if user is not yet in local DB, they must have an invite code
      const existingUser = await storage.getUser(req.user.id);
      if (!existingUser) {
        const inviteCode = req.body?.inviteCode || req.headers['x-invite-code'];
        if (!inviteCode) {
          return res.status(403).json({ message: 'Invite code required', code: 'INVITE_REQUIRED' });
        }
        const result = await storage.validateAndRedeemInviteCode(inviteCode, req.user.id, role);
        if (!result.valid) {
          return res.status(403).json({ message: result.error, code: 'INVITE_INVALID' });
        }
      }

      // Ensure user exists in local DB before updating role (Supabase Auth doesn't auto-sync)
      await storage.upsertUser({
        id: req.user.id,
        email: req.user.email || '',
        name: req.user.email || req.user.id,
        emailVerified: true,
      });
      const updatedUser = await storage.updateUserRole(req.user.id, role);

      if (role === 'talent_owner' && req.user.email) {
        const firstName = req.user.user_metadata?.first_name;
        sendTransactionalEmail({
          to: req.user.email,
          subject: 'Welcome to Recrutas — post your first job',
          html: employerWelcomeEmail(firstName),
        }).catch((err: Error) => console.error('[Email] employer welcome failed:', err));
      }

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error setting user role:", error);
      res.status(500).json({ message: "Failed to set user role" });
    }
  }));

  // Candidate profile
  app.get('/api/candidate/profile', isAuthenticated, asyncHandler(async (req: any, res) => {
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

      // Return null for new users (no profile yet) - not an error
      if (!profile) {
        return res.json({ exists: false, profile: null });
      }

      res.json({ exists: true, profile });
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
  }));

  app.post('/api/candidate/profile', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const profileData = insertCandidateProfileSchema.parse({ ...req.body, userId: req.user.id });
      const profile = await storage.upsertCandidateUser(profileData);
      
      await storage.updateUserInfo(req.user.id, { profile_complete: true });
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating candidate profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  }));

  app.post('/api/candidate/profile/complete', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const { skills } = req.body;
      
      const profileData: any = { userId: req.user.id };
      if (skills && Array.isArray(skills)) {
        profileData.skills = skills;
      }
      
      await storage.upsertCandidateUser(profileData);
      await storage.updateUserInfo(req.user.id, { profile_complete: true });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing candidate profile:", error);
      res.status(500).json({ message: "Failed to complete profile" });
    }
  }));

  app.put('/api/candidate/preferences', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const { jobPreferences } = req.body;
      if (!jobPreferences || typeof jobPreferences !== 'object') {
        return res.status(400).json({ message: 'jobPreferences object required' });
      }
      await storage.upsertCandidateUser({ userId: req.user.id, jobPreferences });
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving preferences:', error);
      res.status(500).json({ message: 'Failed to save preferences' });
    }
  }));

  // Get job statistics (for monitoring)
  app.get('/api/job-stats', asyncHandler(async (req: any, res) => {
    try {
      const stats = await storage.getJobStatistics();
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching job stats:", error?.message);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  }));

  // Get signed URL for resume (secure access)
  app.get('/api/resume/:resumePath', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const resumePath = decodeURIComponent(req.params.resumePath);
      const normalizedPath = path.posix.normalize(resumePath);
      if (normalizedPath.includes('..') ||
          (!normalizedPath.startsWith(`resumes/${req.user.id}/`) && !normalizedPath.startsWith(`${req.user.id}/`))) {
        return res.status(403).json({ message: "Not authorized to access this resume" });
      }
      const signedUrl = await storage.getResumeSignedUrl(resumePath);
      res.json({ url: signedUrl });
    } catch (error) {
      console.error("Error generating resume URL:", error);
      res.status(500).json({ message: "Failed to generate resume URL" });
    }
  }));

  // Resume upload
  // NOTE: multer errors (wrong type, file too large) must be caught explicitly —
  // Express default error handler returns 500 for them. Use callback form instead.
  app.post('/api/candidate/resume', isAuthenticated, (req: any, res: any, next: any) => {
    upload.single('resume')(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: 'File too large. Maximum size is 4MB.' });
        }
        // fileFilter rejection or other multer error → 400
        return res.status(400).json({ message: err.message || 'File upload rejected.' });
      }
      next();
    });
  }, asyncHandler(async (req: any, res) => {
    try {
      // Daily limit: 3 resume uploads per day (admins exempt)
      if (!isAdminUser(req)) {
        const limitCheck = await storage.checkDailyLimit(req.user.id, 'resume_upload', 3);
        if (!limitCheck.allowed) {
          return res.status(429).json({ message: `Resume upload limit reached (${limitCheck.limit}/day). Try again tomorrow.` });
        }
      }

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
      await storage.incrementDailyUsage(req.user.id, 'resume_upload');
      res.json(result);
    } catch (error) {
      console.error("Error processing resume upload:", error);
      if (res.headersSent) return;
      if (error instanceof ResumeProcessingError) {
        return res.status(500).json({
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.originalError?.message : undefined
        });
      }
      return res.status(500).json({
        message: "Failed to upload resume",
        details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
      });
    }
  }));

  // Candidate specific stats
  app.get('/api/candidate/stats', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const stats = await storage.getCandidateStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching candidate stats:", error);
      res.status(500).json({ message: "Failed to fetch candidate stats" });
    }
  }));

  // Candidate activity
  app.get('/api/candidate/activity', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const activity = await storage.getActivityLogs(req.user.id);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching candidate activity:", error);
      res.status(500).json({ message: "Failed to fetch candidate activity" });
    }
  }));

  // Candidate applications
  app.get('/api/candidate/applications', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const applications = await storage.getApplicationsWithStatus(req.user.id);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching candidate applications:", error);
      res.status(500).json({ message: "Failed to fetch candidate applications" });
    }
  }));

  // Get saved jobs for a candidate
  app.get('/api/candidate/saved-jobs', isAuthenticated, asyncHandler(async (req: any, res) => {
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
  }));

  // Save a job for a candidate
  app.post('/api/candidate/saved-jobs', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const { jobId } = req.body;
      if (!jobId) {
        return res.status(400).json({ message: "jobId is required" });
      }
      await storage.saveJob(req.user.id, jobId);

      recordSignal(req.user.id, jobId, 'save');

      res.status(201).json({ message: "Job saved successfully" });
    } catch (error) {
      console.error("Error saving job:", error);
      res.status(500).json({ message: "Failed to save job" });
    }
  }));

  // Unsave a job for a candidate
  app.delete('/api/candidate/saved-jobs/:jobId', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) {return res.status(400).json({ message: "Invalid jobId" });}
      await storage.unsaveJob(req.user.id, jobId);
      res.status(200).json({ message: "Job unsaved successfully" });
    } catch (error) {
      console.error("Error unsaving job:", error);
      res.status(500).json({ message: "Failed to unsave job" });
    }
  }));

  // Hide a job for a candidate
  app.post('/api/candidate/hidden-jobs', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const { jobId } = req.body;
      if (!jobId) {
        return res.status(400).json({ message: "jobId is required" });
      }
      await storage.hideJob(req.user.id, jobId);

      recordSignal(req.user.id, jobId, 'hide');

      res.status(201).json({ message: "Job hidden successfully" });
    } catch (error) {
      console.error("Error hiding job:", error);
      res.status(500).json({ message: "Failed to hide job" });
    }
  }));

  // Get all job actions for a candidate
  app.get('/api/candidate/job-actions', isAuthenticated, asyncHandler(async (req: any, res) => {
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
  }));

  // Candidate can update their own application status (for external jobs)
  app.put('/api/candidate/application/:applicationId/status', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!status) {return res.status(400).json({ message: "Status is required" });}

      const VALID_CANDIDATE_STATUSES = ['submitted', 'screening', 'interview_scheduled', 'offer', 'rejected', 'withdrawn'];
      if (!VALID_CANDIDATE_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_CANDIDATE_STATUSES.join(', ')}` });
      }
      
      const applicationId = parseIntParam(req.params.applicationId);
      if (!applicationId) {return res.status(400).json({ message: "Invalid applicationId" });}
      
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
  }));

  // Job application
  app.post('/api/candidate/apply/:jobId', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) {return res.status(400).json({ message: "Invalid jobId" });}

      // Daily limit: 20 applications per day (admins exempt)
      if (!isAdminUser(req)) {
        const limitCheck = await storage.checkDailyLimit(userId, 'application', 20);
        if (!limitCheck.allowed) {
          return res.status(429).json({ message: `Application limit reached (${limitCheck.limit}/day). Try again tomorrow.` });
        }
      }

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

      // Atomic duplicate check + insert inside transaction
      const application = await db.transaction(async (tx: any) => {
        const [existing] = await tx.select().from(jobApplications)
          .where(sql`${jobApplications.jobId} = ${jobId} AND ${jobApplications.candidateId} = ${userId}`);
        if (existing) throw new Error('DUPLICATE_APPLICATION');
        const [created] = await tx.insert(jobApplications).values({
          jobId,
          candidateId: userId,
          status: isInternalJob && job.hasExam ? 'pending_exam' : 'submitted',
          metadata: applicationMetadata
        }).returning();
        return created;
      });
      if (!application) {return res.status(500).json({ message: "Failed to create application" });}

      await storage.incrementDailyUsage(userId, 'application');
      await storage.createActivityLog(userId, "job_applied", `Applied to job ID: ${jobId}`);

      recordSignal(userId, jobId, 'apply', job);

      if (isInternalJob) {
        // Notify talent owner of new application
        const hasLinks = applicationMetadata?.linkedinUrl || applicationMetadata?.githubUrl || applicationMetadata?.portfolioUrl;
        await notificationService.createNotification({
          userId: job.talentOwnerId,
          type: 'new_application',
          title: 'New Application Received',
          message: `You have a new application for ${job.title}.${hasLinks ? ' Candidate has provided professional links.' : ''}`,
          relatedApplicationId: application.id,
        });

        // Email employer about new applicant
        storage.getUser(job.talentOwnerId).then(employer => {
          if (!employer?.email) return;
          const candidateProfile = applicationMetadata as any;
          const candidateName = candidateProfile?.firstName
            ? `${candidateProfile.firstName} ${candidateProfile.lastName || ''}`.trim()
            : 'A candidate';
          sendTransactionalEmail({
            to: employer.email,
            subject: `New applicant for ${job.title}`,
            html: employerNewApplicantEmail(
              (employer as any).name?.split(' ')[0],
              candidateName,
              job.title,
              !!job.hasExam,
              application.id,
            ),
          }).catch((err: Error) => console.error('[Email] new applicant failed:', err));
        }).catch(() => {});

        // Notify candidate their application was received (core promise: know where you stand)
        const examNote = job.hasExam ? ' Complete the screening exam to advance your application.' : '';
        await notificationService.createNotification({
          userId,
          type: 'application_submitted',
          title: 'Application Submitted',
          message: `Your application for ${job.title} at ${job.company} was received.${examNote}`,
          priority: 'medium',
          relatedApplicationId: application.id,
          data: { jobTitle: job.title, companyName: job.company, hasExam: job.hasExam }
        });
      }

      res.json(application);
    } catch (error: any) {
      if (error?.message === 'DUPLICATE_APPLICATION') {
        return res.status(400).json({ message: "Already applied to this job" });
      }
      console.error("Error applying to job:", error);
      res.status(500).json({ message: "Failed to apply to job" });
    }
  }));

  // Talent Owner routes
  app.get('/api/talent-owner/jobs', isAuthenticated, asyncHandler(async (req: any, res) => {
    if (!db) return res.status(503).json({ message: 'Database not available' });
    try {
      console.log(`[Talent Owner Jobs] Fetching jobs for user: ${req.user.id}`);
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Jobs query timeout')), 8000)
      );
      const jobs = await Promise.race([
        storage.getJobPostings(req.user.id),
        timeout,
      ]);
      console.log(`[Talent Owner Jobs] Found ${jobs.length} jobs for user ${req.user.id}`);
      if (jobs.length > 0) {
        console.log(`[Talent Owner Jobs] Job IDs: ${jobs.map((j: any) => j.id).join(', ')}`);
      }
      res.json(jobs);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Jobs query timeout') {
        console.warn('[Talent Owner Jobs] Query timed out for user:', req.user.id);
        return res.status(503).json({ message: 'Request timed out, please retry' });
      }
      console.error("Error fetching talent owner jobs:", error);
      res.status(500).json({ message: "Failed to fetch job postings" });
    }
  }));

  // Get all applicants across all jobs for a talent owner (for analytics)
  app.get('/api/talent-owner/all-applicants', isAuthenticated, asyncHandler(async (req: any, res) => {
    if (!db) return res.status(503).json({ message: 'Database not available' });
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Applicants query timeout')), 8000)
      );
      const candidates = await Promise.race([
        storage.getCandidatesForRecruiter(req.user.id),
        timeout,
      ]);
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
      const msg = (error as Error).message;
      if (msg === 'Applicants query timeout') {
        console.warn('[All Applicants] Query timed out for user:', req.user.id);
        return res.status(503).json({ message: 'Request timed out, please retry' });
      }
      console.error("Error fetching all applicants:", error);
      res.status(500).json({ message: "Failed to fetch applicants" });
    }
  }));

  // Get talent owner profile
  app.get('/api/talent-owner/profile', isAuthenticated, asyncHandler(async (req: any, res) => {
    if (!db) return res.status(503).json({ message: 'Database not available' });
    try {
      const profile = await storage.getTalentOwnerProfile(req.user.id);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching talent owner profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  }));

  // Recruiter specific stats
  app.get('/api/recruiter/stats', isAuthenticated, asyncHandler(async (req: any, res) => {
    if (!db) return res.status(503).json({ message: 'Database not available' });
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Stats query timeout')), 8000)
      );
      const stats = await Promise.race([storage.getRecruiterStats(req.user.id), timeout]);
      res.json(stats);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Stats query timeout') {
        console.warn('[Recruiter Stats] Query timed out for user:', req.user.id);
        return res.status(503).json({ message: 'Request timed out, please retry' });
      }
      console.error("Error fetching recruiter stats:", error);
      res.status(500).json({ message: "Failed to fetch recruiter stats" });
    }
  }));

  app.post('/api/jobs', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      // Daily limit: 5 job posts per day (admins exempt)
      if (!isAdminUser(req)) {
        const limitCheck = await storage.checkDailyLimit(req.user.id, 'job_post', 5);
        if (!limitCheck.allowed) {
          return res.status(429).json({ message: `Job posting limit reached (${limitCheck.limit}/day). Try again tomorrow.` });
        }
      }

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
      await storage.incrementDailyUsage(req.user.id, 'job_post');
      console.log(`[Job Creation] Successfully created job ID: ${job.id} for talent owner: ${job.talentOwnerId}`);

      // Return job IMMEDIATELY (within <100ms) before any async operations
      // All heavy processing happens in background to prevent timeouts
      res.status(201).json({
        ...job,
        examGenerated: false, // exam questions generate async in background
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
              console.warn(`[Background] Failed to generate exam for job ${job.id}:`, (examError as Error)?.message);
              // Continue - exam generation is not critical
            }
          }

          // Log activity in background
          await storage.createActivityLog(req.user.id, "job_posted", `Job posted: ${job.title}`);
          console.log(`[Background] Activity logged for job ${job.id}`);

          // Process candidate matching in background
          processJobMatchesInBackground(job.id);

          // Fire Inngest event to recompute embeddings + invalidate match cache
          const { sendInngestEvent } = await import('./inngest-service.js');
          await sendInngestEvent('match/recompute', { jobId: job.id, talentOwnerId: req.user.id });
        } catch (bgError) {
          console.error(`[Background] Error processing job ${job.id}:`, (bgError as Error)?.message);
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
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }));

  // Update job posting (PUT /api/jobs/:jobId)
  app.put('/api/jobs/:jobId', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) {return res.status(400).json({ message: "Invalid jobId" });}
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
  }));

  // Delete job posting (DELETE /api/jobs/:jobId)
  app.delete('/api/jobs/:jobId', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) {return res.status(400).json({ message: "Invalid jobId" });}
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
  }));

  // Update job status (pause/resume/close)
  app.patch('/api/jobs/:jobId/status', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) {return res.status(400).json({ message: "Invalid jobId" });}
      const userId = req.user.id;
      const { status, notifyCandidates } = req.body;

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

      if (status === 'closed' && notifyCandidates) {
        await storage.closeJobAndNotifyCandidates(jobId, userId);
      }

      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating job status:", error);
      res.status(500).json({ message: "Failed to update job status" });
    }
  }));

  app.post('/api/talent-owner/profile/complete', isAuthenticated, asyncHandler(async (req: any, res) => {
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
  }));


  app.get('/api/jobs/:jobId/applicants', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) {return res.status(400).json({ message: "Invalid jobId" });}
      const applicants = await storage.getApplicantsForJob(jobId, req.user.id);
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      res.status(500).json({ message: "Failed to fetch applicants" });
    }
  }));

  // Screening Questions API
  // Get screening questions for a job
  app.get('/api/jobs/:jobId/screening-questions', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) {return res.status(400).json({ message: "Invalid jobId" });}
      const questions = await storage.getScreeningQuestions(jobId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching screening questions:", error);
      res.status(500).json({ message: "Failed to fetch screening questions" });
    }
  }));

  // Create/Update screening questions for a job
  app.post('/api/jobs/:jobId/screening-questions', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) {return res.status(400).json({ message: "Invalid jobId" });}
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
  }));

  // Submit screening answers for an application
  app.post('/api/applications/:applicationId/screening-answers', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const applicationId = parseIntParam(req.params.applicationId);
      if (!applicationId) {return res.status(400).json({ message: "Invalid applicationId" });}

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
  }));

  app.get('/api/jobs/:jobId/discovery', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) {return res.status(400).json({ message: "Invalid jobId" });}
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
  }));

  app.put('/api/applications/:applicationId/status', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!status) {return res.status(400).json({ message: "Status is required." });}
      const VALID_APPLICATION_STATUSES = [
        'pending_exam', 'submitted', 'viewed', 'screening',
        'interview_scheduled', 'interview_completed', 'offer', 'rejected', 'withdrawn'
      ] as const;
      if (!(VALID_APPLICATION_STATUSES as readonly string[]).includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_APPLICATION_STATUSES.join(', ')}` });
      }
      const applicationId = parseIntParam(req.params.applicationId);
      if (!applicationId) {return res.status(400).json({ message: "Invalid applicationId" });}
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
  }));

  app.post('/api/jobs/:jobId/exam/submit', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) { return res.status(400).json({ message: "Invalid jobId" }); }
      const { answers } = req.body;
      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ message: "Answers are required" });
      }
      const result = await examService.submitExam(jobId, req.user.id, answers);

      // Fire-and-forget: join exam score back to match signal
      joinExamScore(req.user.id, jobId, result.score).catch(() => {});

      res.json(result);
    } catch (error) {
      console.error("Error submitting exam:", error);
      const message = (error as Error).message;
      if (message === 'Exam already submitted for this job') {
        return res.status(409).json({ message });
      }
      res.status(500).json({ message: "Failed to submit exam" });
    }
  }));

  // Notification endpoints
  app.get('/api/notifications', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const notifications = await notificationService.getAllNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  }));

  app.get('/api/notifications/count', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const count = await notificationService.getUnreadCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ message: "Failed to fetch notification count" });
    }
  }));

  app.post('/api/notifications/:id/read', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const notificationId = parseIntParam(req.params.id);
      if (!notificationId) {return res.status(400).json({ message: "Invalid notification id" });}
      await notificationService.markAsRead(notificationId, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  }));

  app.post('/api/notifications/mark-all-read', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      await notificationService.markAllAsRead(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  }));

  // Polling-based notification endpoints (Vercel serverless compatible)
  app.get('/api/notifications/poll', isAuthenticated, asyncHandler(async (req: any, res) => {
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
  }));

  app.post('/api/notifications/subscribe', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const result = await notificationService.subscribePolling(req.user.id);
      res.json(result);
    } catch (error) {
      console.error("Error subscribing to notifications:", error);
      res.status(500).json({ message: "Failed to subscribe to notifications" });
    }
  }));

  app.post('/api/notifications/unsubscribe', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      await notificationService.unsubscribePolling(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unsubscribing from notifications:", error);
      res.status(500).json({ message: "Failed to unsubscribe from notifications" });
    }
  }));

  app.get('/api/notifications/connection-status', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const status = await notificationService.getConnectionStatus(req.user.id);
      res.json(status);
    } catch (error) {
      console.error("Error getting connection status:", error);
      res.status(500).json({ message: "Failed to get connection status" });
    }
  }));

  // Interview scheduling endpoint
  app.post('/api/interviews/schedule', isAuthenticated, asyncHandler(async (req: any, res) => {
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
  }));

  // Advanced matching endpoints
  app.get('/api/advanced-matches/:candidateId', isAuthenticated, asyncHandler(async (req: any, res) => {
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

      // Use the unified matching pipeline
      const matches = await Promise.race([
        storage.getJobRecommendations(candidateId),
        timeoutPromise
      ]) as any[];

      res.json({ matches: matches || [], total: matches?.length || 0, algorithm: 'skill-match-v2' });
    } catch (error: any) {
      console.error("Error fetching advanced matches:", error?.message);
      if (error?.message?.includes('timeout')) {
        return res.status(504).json({ message: "Match generation timed out", matches: [], total: 0 });
      }
      res.status(500).json({ message: "Failed to fetch advanced matches", matches: [], total: 0 });
    }
  }));

  app.put('/api/candidate/match-preferences', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const preferences = req.body;
      // Store preferences on the candidate profile — fetchScoredJobs reads them
      const { candidateProfiles } = await import('../shared/schema.js');
      await db.update(candidateProfiles)
        .set({ jobPreferences: preferences })
        .where(eq(candidateProfiles.userId, req.user.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating match preferences:", error);
      res.status(500).json({ message: "Failed to update match preferences" });
    }
  }));

  // Exam retrieval endpoint
  app.get('/api/jobs/:jobId/exam', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) {return res.status(400).json({ message: "Invalid jobId" });}
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

      // Candidate must have applied before accessing the exam
      const application = await storage.getApplicationByJobAndCandidate(jobId, req.user.id);
      if (!application) {
        return res.status(403).json({ message: "You must apply for this job before taking the exam" });
      }

      // Return exam without correct answers for candidates
      const examForCandidate = {
        id: exam.id,
        jobId: exam.jobId,
        title: exam.title,
        jobTitle: job.title,
        company: job.company,
        maxChatCandidates: job.maxChatCandidates || 5,
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
  }));

  // ==========================================
  // STRIPE SUBSCRIPTION ROUTES
  // ==========================================

  // Import Stripe service
  const { stripeService } = await import('./services/stripe.service');

  // Get subscription status
  app.get('/api/subscription/status', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const subscription = await stripeService.getUserSubscription(req.user.id);
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  }));

  // Get available subscription tiers
  app.get('/api/subscription/tiers', asyncHandler(async (req, res) => {
    try {
      const tiers = await stripeService.getAvailableTiers();
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching subscription tiers:", error);
      res.status(500).json({ message: "Failed to fetch subscription tiers" });
    }
  }));

  // Create checkout session (accepts tierName or tierId for backward compat)
  app.post('/api/stripe/create-checkout', isAuthenticated, asyncHandler(async (req: any, res) => {
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
  }));

  // Create customer portal session
  app.post('/api/stripe/portal', isAuthenticated, asyncHandler(async (req: any, res) => {
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
  }));

  // Check feature access
  app.get('/api/subscription/can-access/:feature', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const { feature } = req.params;
      const access = await stripeService.canAccessFeature(req.user.id, feature);
      res.json(access);
    } catch (error) {
      console.error("Error checking feature access:", error);
      res.status(500).json({ message: "Failed to check feature access" });
    }
  }));

  // Stripe webhook route is in index.ts (before express.json() for raw body verification)

  // Initialize default subscription tiers (admin endpoint) - DISABLED in production
  app.post('/api/admin/init-subscription-tiers', asyncHandler(async (req, res) => {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: "This endpoint is disabled in production" });
    }

    // Require admin secret (timing-safe)
    if (!verifyAdminSecret(req, res)) return;

    try {
      await stripeService.initializeDefaultTiers();
      res.json({ success: true, message: "Subscription tiers initialized" });
    } catch (error) {
      console.error("Error initializing subscription tiers:", error);
      res.status(500).json({ message: "Failed to initialize subscription tiers" });
    }
  }));

  // Trigger external jobs scraping (for Vercel Cron or manual requests)
  // Returns immediately and scrapes in background (non-blocking)
  app.post('/api/cron/scrape-external-jobs', asyncHandler(async (req, res) => {
    try {
      // Verify cron secret (timing-safe)
      if (!verifyCronSecret(req, res)) return;

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
  }));

  // 24h Response SLA enforcement — called hourly by GitHub Actions cron
  // Finds applications where candidate passed exam but recruiter hasn't acted
  // within 24h, marks them as rejected, and notifies the candidate.
  app.post('/api/cron/enforce-response-sla', asyncHandler(async (req, res) => {
    try {
      if (!verifyCronSecret(req, res)) return;

      const overdue = await storage.getOverdueExamApplications();
      if (overdue.length === 0) {
        return res.json({ message: 'No overdue applications', closed: 0 });
      }

      let closed = 0;
      for (const { applicationId, candidateId, jobTitle, company } of overdue) {
        try {
          // Mark as rejected with a system note — not a human rejection
          await storage.updateApplicationStatusByCandidate(applicationId, 'rejected');
          // Notify candidate: transparent, not a ghosting
          await notificationService.createNotification({
            userId: candidateId,
            type: 'application_rejected',
            title: 'Application Closed — No Response',
            message: `${company} did not respond to your ${jobTitle} application within 24 hours. The application has been automatically closed.`,
            priority: 'high',
            relatedApplicationId: applicationId,
            data: { jobTitle, company, reason: 'sla_expired' },
          });
          closed++;
        } catch (err) {
          console.error(`[SLA] Failed to close application ${applicationId}:`, (err as Error).message);
        }
      }

      console.log(`[SLA] Closed ${closed}/${overdue.length} overdue applications`);
      res.json({ message: 'SLA enforcement complete', closed, total: overdue.length });
    } catch (error: any) {
      console.error('[SLA] Enforcement failed:', error?.message);
      res.status(500).json({ message: 'SLA enforcement failed', error: error?.message });
    }
  }));

  // Auto-hide stale internal jobs — called daily by GitHub Actions cron
  // Closes platform jobs with no applicant activity in 14 days, after being
  // active for 30+ days. Prevents ghost jobs from accumulating in the feed.
  app.post('/api/cron/auto-hide-ghost-jobs', asyncHandler(async (req, res) => {
    try {
      if (!verifyCronSecret(req, res)) return;

      const staleDays = Math.max(7, Math.min(365, parseInt((req.query.staleDays as string) || '30', 10) || 30));
      const staleJobs = await storage.getStaleInternalJobs(staleDays);

      if (staleJobs.length === 0) {
        return res.json({ message: 'No stale jobs found', closed: 0 });
      }

      const ids = staleJobs.map((j: any) => j.id);
      const closed = await storage.closeJobsByIds(ids);

      console.log(`[Ghost Auto-Hide] Closed ${closed} stale jobs:`, staleJobs.map((j: any) => `${j.title} @ ${j.company} (id:${j.id})`).join(', '));
      res.json({
        message: 'Ghost job auto-hide complete',
        closed,
        jobs: staleJobs.map((j: any) => ({ id: j.id, title: j.title, company: j.company })),
      });
    } catch (error: any) {
      console.error('[Ghost Auto-Hide] Failed:', error?.message);
      res.status(500).json({ message: 'Ghost job auto-hide failed', error: error?.message });
    }
  }));

  // Purge old external jobs — called daily by GitHub Actions cron
  // Deletes external jobs older than 90 days to prevent unbounded table growth.
  // Internal/platform jobs are never purged (recruiters own them).
  app.post('/api/cron/purge-old-jobs', asyncHandler(async (req, res) => {
    if (!db) return res.status(503).json({ message: 'Database not available' });
    try {
      if (!verifyCronSecret(req, res)) return;

      const retainDays = Math.max(30, Math.min(365, parseInt((req.query.retainDays as string) || '90', 10) || 90));

      // First, find old external jobs eligible for purge
      const candidates = await db.execute(sql`
        SELECT jp.id FROM job_postings jp
        WHERE (jp.source != 'platform' OR jp.source IS NULL)
          AND jp.external_url IS NOT NULL
          AND jp.created_at < NOW() - (${retainDays} || ' days')::interval
      `);
      const candidateIds = ((candidates as any).rows ?? (candidates as any)).map((r: any) => r.id);

      if (candidateIds.length === 0) {
        return res.json({ message: 'No jobs to purge', deleted: 0, retainDays });
      }

      // Delete dependent rows first, then the job postings
      for (const table of ['job_applications', 'job_matches', 'exam_attempts', 'job_exams', 'chat_rooms', 'notifications', 'interviews', 'saved_jobs', 'hidden_jobs']) {
        const col = table === 'notifications' ? 'related_job_id' : 'job_id';
        await db.execute(sql.raw(`DELETE FROM ${table} WHERE ${col} IN (${candidateIds.join(',')})`));
      }
      const result = await db.execute(sql.raw(`DELETE FROM job_postings WHERE id IN (${candidateIds.join(',')}) RETURNING id`));
      const deleted = ((result as any).rows ?? (result as any)).length;
      console.log(`[Purge] Deleted ${deleted} external jobs older than ${retainDays} days`);
      res.json({ message: 'Purge complete', deleted, retainDays });
    } catch (error: any) {
      console.error('[Purge] Failed:', error?.message);
      res.status(500).json({ message: 'Purge failed', error: error?.message });
    }
  }));

  // Discover new companies + ATS probe (two-phase, called by GitHub Actions)
  app.post('/api/cron/discover-companies', asyncHandler(async (req, res) => {
    if (!db) return res.status(503).json({ message: 'Database not available' });
    try {
      if (!verifyCronSecret(req, res)) return;

      const phase = (req.query.phase as string) || 'discover';
      const limit = Math.min(parseInt((req.query.limit as string) || '300', 10), 300);

      if (phase === 'discover') {
        // Phase 1: mine job postings for new company names → save to discovered_companies
        const { companyDiscoveryPipeline } = await import('./company-discovery.js');
        await companyDiscoveryPipeline.runDiscovery();
        const stats = await companyDiscoveryPipeline.getStatistics();
        return res.json({ phase: 'discover', ...stats });
      }

      if (phase === 'probe') {
        // Phase 2: probe pending companies against Greenhouse/Lever/Ashby APIs
        const { probePendingCompanies } = await import('./lib/ats-probe.js');
        const { discoveredCompanies: dcTable } = await import('../shared/schema.js');
        const results = await probePendingCompanies(limit);

        let approved = 0;
        let rejected = 0;
        for (const result of results) {
          if (result.atsType && result.atsId) {
            await db.update(dcTable)
              .set({
                detectedAts: result.atsType,
                atsId: result.atsId,
                careerPageUrl: result.careerPageUrl ?? undefined,
                status: 'approved',
                updatedAt: new Date(),
              })
              .where(eq(dcTable.normalizedName, result.normalizedName));
            approved++;
          } else {
            await db.update(dcTable)
              .set({ status: 'rejected', updatedAt: new Date() })
              .where(eq(dcTable.normalizedName, result.normalizedName));
            rejected++;
          }
        }

        console.log(`[DiscoverCompanies] Probe done: ${approved} approved, ${rejected} rejected`);
        return res.json({ phase: 'probe', probed: results.length, approved, rejected });
      }

      if (phase === 'apollo') {
        // Phase 3: seed companies from Apollo.io (broad industry coverage)
        const { runApolloDiscovery } = await import('./services/apollo-discovery.service.js');
        const apolloResult = await runApolloDiscovery(300);
        return res.json({ phase: 'apollo', ...apolloResult });
      }

      return res.status(400).json({ message: 'Invalid phase. Use ?phase=discover, ?phase=probe, or ?phase=apollo' });
    } catch (error: any) {
      console.error('[DiscoverCompanies] Failed:', error?.message);
      res.status(500).json({ message: 'Company discovery failed', error: error?.message });
    }
  }));

  // Retry failed resume parses — called daily by GitHub Actions
  app.post('/api/cron/retry-failed-parses', asyncHandler(async (req, res) => {
    if (!verifyCronSecret(req, res)) return;
    try {
      // Process 3 per run — Gemini multimodal PDFs are large; spreading over days avoids quota limits
      const candidates = await storage.getCandidatesForParseRetry(3);
      if (candidates.length === 0) {
        return res.json({ retried: 0, succeeded: 0, message: 'No failed parses to retry' });
      }
      const { ResumeService } = await import('./services/resume.service.js');
      const { AIResumeParser } = await import('./ai-resume-parser.js');
      const resumeService = new ResumeService(storage, new AIResumeParser());

      let succeeded = 0;
      const results: Array<{ userId: string; success: boolean; skills: number }> = [];
      for (const candidate of candidates) {
        const result = await resumeService.retryFailedParse(candidate.userId, candidate.resumeUrl!);
        results.push(result);
        if (result.success) succeeded++;
        // 4s delay between candidates — Gemini PDF multimodal is token-heavy
        if (candidates.indexOf(candidate) < candidates.length - 1) {
          await new Promise(r => setTimeout(r, 4000));
        }
      }
      console.log(`[RetryParse] Retried ${candidates.length}, succeeded: ${succeeded}`);
      res.json({ retried: candidates.length, succeeded, results });
    } catch (error: any) {
      console.error('[RetryParse] Failed:', error?.message);
      res.status(500).json({ message: 'Retry failed', error: error?.message });
    }
  }));

  // Warm match cache for all active candidates — called daily by GitHub Actions
  app.post('/api/cron/warm-candidate-matches', asyncHandler(async (req, res) => {
    if (!verifyCronSecret(req, res)) return;
    try {
      const allCandidates = await storage.getAllCandidateUsers();
      const withSkills = allCandidates.filter((c: any) => Array.isArray(c.skills) && c.skills.length > 0);

      res.json({ warming: withSkills.length, message: 'Match warming started in background' });

      // Warm in background — fire and forget
      (async () => {
        let warmed = 0;
        for (const candidate of withSkills) {
          try {
            await storage.getJobRecommendations(candidate.userId);
            warmed++;
            await new Promise(r => setTimeout(r, 100));
          } catch (e: any) {
            console.warn(`[WarmMatches] Failed for ${candidate.userId}:`, e?.message);
          }
        }
        console.log(`[WarmMatches] Warmed ${warmed}/${withSkills.length} candidates`);
      })().catch((e: any) => console.error('[WarmMatches] Background error:', e?.message));
    } catch (error: any) {
      console.error('[WarmMatches] Failed:', error?.message);
      res.status(500).json({ message: 'Warming failed', error: error?.message });
    }
  }));

  // Ghost job detection endpoints
  app.post('/api/admin/run-ghost-job-detection', asyncHandler(async (req, res) => {
    try {
      // Verify admin secret (timing-safe)
      if (!verifyAdminSecret(req, res)) return;

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
  }));

  app.get('/api/admin/ghost-job-stats', asyncHandler(async (req, res) => {
    try {
      // Verify admin secret (timing-safe)
      if (!verifyAdminSecret(req, res)) return;

      const { ghostJobDetectionService } = await import('./ghost-job-detection.service');
      const stats = await ghostJobDetectionService.getStatistics();
      const flaggedJobs = await ghostJobDetectionService.getFlaggedJobs(50);

      // Map to match admin UI field names
      res.json({
        totalChecked: stats.totalJobs,
        ghostsFound: stats.flaggedJobs,
        deactivated: stats.criticalRiskJobs,
        lastRun: stats.lastRun || null,
        flaggedJobs,
      });
    } catch (error: any) {
      console.error("Error fetching ghost job stats:", error?.message);
      res.status(500).json({ message: "Failed to fetch ghost job stats", error: error?.message });
    }
  }));

  // Company verification endpoints
  app.post('/api/admin/run-company-verification', asyncHandler(async (req, res) => {
    try {
      // Verify admin secret (timing-safe)
      if (!verifyAdminSecret(req, res)) return;

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
  }));

  app.get('/api/admin/company-verification-stats', asyncHandler(async (req, res) => {
    try {
      // Verify admin secret (timing-safe)
      if (!verifyAdminSecret(req, res)) return;

      const { companyVerificationService } = await import('./company-verification.service');
      const stats = await companyVerificationService.getStatistics();

      // Map to match admin UI field names
      res.json({
        totalCompanies: stats.totalJobs,
        verified: stats.verifiedJobs,
        unverified: stats.thirdPartyJobs,
        lastRun: stats.lastRun || null,
      });
    } catch (error: any) {
      console.error("Error fetching company verification stats:", error?.message);
      res.status(500).json({ message: "Failed to fetch company verification stats", error: error?.message });
    }
  }));

  // ── Error Monitoring Admin Endpoints ─────────────────────────────────────────

  // Recent errors — grouped by fingerprint, newest first
  app.get('/api/admin/errors', asyncHandler(async (req, res) => {
    if (!verifyAdminSecret(req, res)) return;
    if (!db) return res.status(503).json({ message: 'Database not available' });
    const { errorEvents } = await import('../shared/schema.js');
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10) || 50, 200);
    const level = req.query.level as string; // optional filter: error, warning, fatal

    const errors = level
      ? await db.select().from(errorEvents).where(eq(errorEvents.level, level)).orderBy(sql`created_at DESC`).limit(limit)
      : await db.select().from(errorEvents).orderBy(sql`created_at DESC`).limit(limit);

    // Also get grouped counts (top errors by fingerprint in last 24h)
    const grouped = await db.execute(sql`
      SELECT fingerprint, message, component, level, COUNT(*)::int as count,
             MAX(created_at) as last_seen
      FROM error_events
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY fingerprint, message, component, level
      ORDER BY count DESC
      LIMIT 20
    `);

    res.json({
      errors,
      grouped: (grouped as any).rows ?? grouped,
      total: errors.length,
    });
  }));

  // Cleanup old errors (keep last 30 days) — called by cron or manually
  app.post('/api/cron/cleanup-errors', asyncHandler(async (req, res) => {
    if (!verifyCronSecret(req, res)) return;
    if (!db) return res.status(503).json({ message: 'Database not available' });
    const result = await db.execute(sql`
      DELETE FROM error_events WHERE created_at < NOW() - INTERVAL '30 days' RETURNING id
    `);
    const deleted = ((result as any).rows ?? (result as any)).length;
    console.log(`[ErrorCleanup] Deleted ${deleted} error events older than 30 days`);
    res.json({ deleted });
  }));

  // ── Invite Code Admin Endpoints ──────────────────────────────────────────────

  // Create invite codes (single or batch)
  app.post('/api/admin/invite-codes', asyncHandler(async (req, res) => {
    if (!verifyAdminSecret(req, res)) return;
    const { code, description, role, maxUses, count, prefix, expiresAt } = req.body;

    // Batch mode: generate `count` codes with a prefix
    if (count && count > 0) {
      const codes = [];
      const batchSize = Math.min(count, 100);
      for (let i = 0; i < batchSize; i++) {
        const generated = (prefix || 'REC') + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const created = await storage.createInviteCode({
          code: generated,
          description: description || `Batch ${new Date().toISOString().split('T')[0]}`,
          role: role || 'any',
          maxUses: maxUses ?? 1,
          createdBy: 'admin',
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        });
        codes.push(created);
      }
      return res.json({ created: codes.length, codes: codes.map((c: any) => c.code) });
    }

    // Single code mode
    if (!code) return res.status(400).json({ message: 'Code or count required' });
    const created = await storage.createInviteCode({
      code,
      description,
      role: role || 'any',
      maxUses: maxUses ?? 1,
      createdBy: 'admin',
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    res.json(created);
  }));

  // List all invite codes with usage stats
  app.get('/api/admin/invite-codes', asyncHandler(async (req, res) => {
    if (!verifyAdminSecret(req, res)) return;
    const codes = await storage.listInviteCodes();
    res.json(codes);
  }));

  // ── End Invite Code Endpoints ──────────────────────────────────────────────

  // ── Feedback Loop / Weight Tuning Endpoints ─────────────────────────────────

  // Correlation stats: how well do current match scores predict exam outcomes?
  app.get('/api/admin/feedback-loop/stats', asyncHandler(async (req, res) => {
    if (!verifyAdminSecret(req, res)) return;
    const { getCorrelationStats } = await import('./services/match-signals.service');
    const stats = await getCorrelationStats();
    res.json(stats);
  }));

  // Trigger weight tuning: learn optimal weights from labeled exam data
  app.post('/api/admin/feedback-loop/tune', asyncHandler(async (req, res) => {
    if (!verifyAdminSecret(req, res)) return;
    const { tuneWeights } = await import('./services/match-signals.service');
    const result = await tuneWeights();
    res.json(result);
  }));

  // Get current learned weights (or null if no tuning has happened)
  app.get('/api/admin/feedback-loop/weights', asyncHandler(async (req, res) => {
    if (!verifyAdminSecret(req, res)) return;
    const { getLearnedWeights } = await import('./services/match-signals.service');
    const weights = await getLearnedWeights();
    res.json({ weights, isDefault: weights === null });
  }));

  // ── End Feedback Loop Endpoints ─────────────────────────────────────────────

  // Job quality indicators for candidates
  app.get('/api/jobs/:jobId/quality-indicators', isAuthenticated, asyncHandler(async (req: any, res) => {
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
  }));

  // ==========================================
  // AGENT APPLY ENDPOINTS
  // ==========================================

  const agentApplyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many applications. Please try again later.' },
  });

  app.post('/api/candidate/agent-apply/:jobId', isAuthenticated, agentApplyLimiter, asyncHandler(async (req: any, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseIntParam(req.params.jobId);
      if (!jobId) {return res.status(400).json({ message: "Invalid jobId" });}

      // Duplicate check — allow retry if previous attempt is stale (>15 min old)
      const existingApplication = await storage.getApplicationByJobAndCandidate(jobId, userId);
      if (existingApplication) {
        if (existingApplication.status === 'submitting' || existingApplication.status === 'queued') {
          const age = Date.now() - new Date(existingApplication.createdAt).getTime();
          if (age < 15 * 60 * 1000) {
            return res.status(400).json({ message: "Your application is queued and will be submitted shortly. Please wait." });
          }
          // Stale placeholder from crash — delete and allow retry
          await db.delete(jobApplications).where(eq(jobApplications.id, existingApplication.id));
          // Also clean up any orphaned agent tasks
          await db.delete(agentTasks).where(eq(agentTasks.applicationId, existingApplication.id)).catch(() => {});
        } else {
          return res.status(400).json({ message: "Already applied to this job" });
        }
      }

      // Validate job is external
      const job = await storage.getJobPosting(jobId);
      if (!job) {return res.status(404).json({ message: "Job not found" });}
      if (!job.externalUrl) {
        return res.status(400).json({ message: "Agent apply is only available for external jobs" });
      }

      // Validate candidate has resume
      const candidateProfile = await storage.getCandidateUser(userId);
      if (!candidateProfile?.resumeUrl) {
        return res.status(400).json({ message: "Please upload your resume first" });
      }

      // Resolve email and phone — candidate_users.email may be empty, fall back to users table
      const user = await storage.getUser(userId);
      const candidateEmail = candidateProfile.email || user?.email || '';
      const candidatePhone = user?.phone_number || '';

      // Validate the job has an external URL we can navigate to
      if (!job.externalUrl) {
        return res.status(422).json({
          message: "This job does not have an external application URL.",
          unsupported: true,
        });
      }

      // Create application with 'queued' status — shows immediately in Applications tab
      const application = await storage.createJobApplication({
        jobId,
        candidateId: userId,
        status: 'queued' as any,
        autoFilled: true,
        resumeUrl: candidateProfile.resumeUrl,
        metadata: {
          agentApply: true,
          queuedAt: new Date().toISOString(),
        },
      });

      // Create agent task — GitHub Actions worker picks this up
      const [agentTask] = await db.insert(agentTasks).values({
        applicationId: application.id,
        candidateId: userId,
        jobId,
        externalUrl: job.externalUrl,
        status: 'queued' as any,
        candidateData: {
          firstName: candidateProfile.firstName || user?.first_name || '',
          lastName: candidateProfile.lastName || user?.last_name || '',
          email: candidateEmail,
          phone: candidatePhone,
          location: candidateProfile.location || '',
          linkedinUrl: candidateProfile.linkedinUrl || '',
          githubUrl: candidateProfile.githubUrl || '',
          portfolioUrl: candidateProfile.portfolioUrl || '',
          personalWebsite: candidateProfile.personalWebsite || '',
          resumeUrl: candidateProfile.resumeUrl,
          resumeText: candidateProfile.resumeText || '',
          skills: (candidateProfile as any).skills || [],
          experience: (candidateProfile as any).experience || '',
          experienceLevel: (candidateProfile as any).experienceLevel || '',
          summary: (candidateProfile as any).summary || '',
          workType: (candidateProfile as any).workType || '',
        },
        resumeUrl: candidateProfile.resumeUrl,
      }).returning();

      recordSignal(userId, jobId, 'agent_apply', job);

      await notificationService.createNotification({
        userId,
        type: 'application_update',
        title: 'Application Queued',
        message: `Your application for ${job.title} at ${job.company} has been queued. We'll submit it within ~5 minutes and email you when it's done.`,
        relatedApplicationId: application.id,
      });

      // GH Actions cron picks up queued tasks every 5 min — no per-click dispatch
      // to avoid race conditions with parallel runs

      return res.json({
        application: { ...application, status: 'queued' },
        status: 'queued',
        ats: 'greenhouse',
        agentTaskId: agentTask.id,
        message: 'Your application has been queued and will be submitted within ~5 minutes.',
      });
    } catch (error: any) {
      console.error("Error in agent apply:", error?.message);
      res.status(500).json({ message: "Failed to submit application" });
    }
  }));

  app.get('/api/candidate/agent-tasks', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const tasks = await storage.getAgentTasksForCandidate(req.user.id);
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching agent tasks:", error?.message);
      res.status(500).json({ message: "Failed to fetch agent tasks" });
    }
  }));

  // Submit verification code for an agent task awaiting verification
  app.post('/api/candidate/agent-tasks/:taskId/verify', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const taskId = parseIntParam(req.params.taskId);
    const { code } = req.body;

    if (!taskId || !code) {
      return res.status(400).json({ message: 'Task ID and verification code are required' });
    }

    const [task] = await db.select().from(agentTasks).where(eq(agentTasks.id, taskId));
    if (!task || task.candidateId !== userId) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (task.status !== 'awaiting_verification') {
      return res.status(400).json({ message: `Task is not awaiting verification (status: ${task.status})` });
    }

    const log = task.agentLog as any;
    const candidateData = task.candidateData as any;
    if (!log?.boardToken || !log?.ghJobId) {
      return res.status(400).json({ message: 'Task is missing Greenhouse metadata' });
    }

    // Store the verification code and re-queue the task for the GH Actions worker
    await db.update(agentTasks).set({
      status: 'queued' as any,
      agentLog: { ...log, verificationCode: code, verificationProvidedAt: new Date().toISOString() },
      updatedAt: new Date(),
    }).where(eq(agentTasks.id, taskId));

    // GH Actions cron picks this up within 5 min
    const result = { success: true } as any;

    if (result.success) {
      await db.update(agentTasks).set({
        status: 'submitted',
        completedAt: new Date(),
        agentLog: { ...log, verifiedAt: new Date().toISOString() },
      }).where(eq(agentTasks.id, taskId));

      // Send confirmation email after successful verification
      const job = await storage.getJobPosting(task.jobId);
      if (job && candidateData.email) {
        const candidateName = [candidateData.firstName, candidateData.lastName].filter(Boolean).join(' ') || 'there';
        const dashboardUrl = (process.env.FRONTEND_URL || 'https://www.recrutas.ai') + '/candidate-dashboard';

        await notificationService.createNotification({
          userId,
          type: 'application_update',
          title: 'Application Submitted',
          message: `Your application for ${job.title} at ${job.company} has been verified and submitted successfully.`,
          relatedApplicationId: task.applicationId,
        });

        sendTransactionalEmail({
          to: candidateData.email,
          subject: `Application submitted: ${job.title} at ${job.company}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <div style="background:#000;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;font-size:20px;">Application Submitted</h1>
              </div>
              <div style="padding:24px;background:#f9f9f9;">
                <p>Hi ${candidateName},</p>
                <p>Your verification was successful! Your application for <strong>${job.title}</strong> at <strong>${job.company}</strong> has been submitted.</p>
                <div style="background:#e8f5e9;padding:15px;border-radius:5px;margin:15px 0;">
                  <strong>What was sent:</strong><br/>
                  &bull; Your resume<br/>
                  &bull; Name, email, and contact info<br/>
                  &bull; Screening questions answered automatically
                </div>
                <p><strong>What happens next:</strong> You should receive a confirmation email from ${job.company} shortly. They'll reach out directly if they'd like to move forward.</p>
                <div style="text-align:center;margin:20px 0;">
                  <a href="${dashboardUrl}" style="display:inline-block;padding:12px 30px;background:#000;color:#fff;text-decoration:none;border-radius:5px;">View Your Applications</a>
                </div>
              </div>
              <div style="text-align:center;padding:15px;color:#666;font-size:13px;">Recrutas &mdash; No ghosting, guaranteed.</div>
            </div>`,
        }).catch((err: any) => console.error('[AgentApply] Verification confirmation email failed:', err?.message));
      }

      return res.json({ success: true, message: 'Application submitted successfully' });
    }

    // Check if code was wrong
    if (result.error?.includes('Incorrect')) {
      return res.status(400).json({ success: false, message: 'Incorrect verification code. Check your email for the latest code.' });
    }

    // Other failure
    await db.update(agentTasks).set({
      status: 'failed',
      lastError: result.error,
    }).where(eq(agentTasks.id, taskId));

    return res.status(502).json({ success: false, message: result.error });
  }));

  app.get('/api/candidate/notification-preferences', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const prefs = await storage.getNotificationPreferences(req.user.id);
      res.json(prefs || {});
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  }));

  app.put('/api/candidate/notification-preferences', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const prefs = await storage.updateNotificationPreferences(req.user.id, req.body);
      res.json(prefs);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  }));

  app.delete('/api/candidate/agent-tasks/:taskId', isAuthenticated, asyncHandler(async (req: any, res) => {
    try {
      const taskId = parseIntParam(req.params.taskId);
      if (!taskId) {return res.status(400).json({ message: "Invalid task id" });}
      // Verify task belongs to this candidate and is still cancellable
      const tasks = await storage.getAgentTasksForCandidate(req.user.id);
      const task = tasks.find((t: any) => t.id === taskId);
      if (!task) {return res.status(404).json({ message: "Task not found" });}
      if (!['queued', 'processing'].includes(task.status)) {
        return res.status(409).json({ message: "Task cannot be cancelled in its current state" });
      }
      await storage.updateAgentTaskStatus(taskId, 'cancelled');
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error cancelling agent task:", error?.message);
      res.status(500).json({ message: "Failed to cancel task" });
    }
  }));

  // User feedback / bug reports — emails Abas directly
  // Rate-limited to prevent spam; sanitized to prevent email HTML injection.
  app.post('/api/feedback', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), asyncHandler(async (req: any, res) => {
    const { type, message, userEmail, userName } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const validTypes = ['Bug', 'Suggestion', 'Other'];
    const feedbackType = validTypes.includes(type) ? type : 'Other';
    const safeEmail = typeof userEmail === 'string' ? escHtml(userEmail.slice(0, 200)) : '';
    const safeName = typeof userName === 'string' ? escHtml(userName.slice(0, 100)) : '';
    const safeMessage = escHtml(String(message).slice(0, 5000));
    const from = safeEmail ? `${safeName || safeEmail} <${safeEmail}>` : 'Anonymous';
    await sendEmail({
      to: 'support@recrutas.ai',
      from: 'noreply@recrutas.ai',
      subject: `[Recrutas Feedback] ${feedbackType} — ${safeEmail || 'anonymous'}`,
      html: `
        <p><strong>Type:</strong> ${feedbackType}</p>
        <p><strong>From:</strong> ${from}</p>
        <hr/>
        <p>${safeMessage.replace(/\n/g, '<br/>')}</p>
      `,
    });
    res.json({ ok: true });
  }));

  // Inngest serve endpoint — receives events from Inngest Cloud
  // Required for background functions (match/recompute, sla/enforce, candidate/notify)
  if (process.env.INNGEST_EVENT_KEY) {
    const { serve } = await import('inngest/express');
    const { inngest, inngestFunctions } = await import('./inngest-service.js');
    app.use('/api/inngest', serve({ client: inngest, functions: inngestFunctions }));
    console.log('[Inngest] Serve endpoint registered at /api/inngest');
  }

  return app;
}