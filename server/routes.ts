import type { Express } from "express";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import multer from "multer";
import path from "path";
import fs from "fs";

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
} from "@shared/schema";
import { generateJobMatch, generateScreeningQuestions } from "./ai-service";
import { db } from "./db";
import { seedDatabase } from "./seed.js";
import { advancedMatchingEngine } from "./advanced-matching-engine";
import { ResumeService, ResumeProcessingError } from './services/resume.service';
import { ExamService } from './services/exam.service';
import { aiResumeParser } from './ai-resume-parser';
import { applicationIntelligence } from "./application-intelligence";
import { supabaseAdmin } from "./lib/supabase-admin";
import { users, jobPostings, jobApplications, JobPosting } from "@shared/schema";
import { CompanyJob } from '../server/company-jobs-aggregator';
import { externalJobsScheduler } from './services/external-jobs-scheduler';

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

  // Dev-only route for seeding the database
  app.post('/api/dev/seed', async (req, res) => {
    try {
      await seedDatabase();
      res.status(200).json({ message: "Database seeded successfully" });
    } catch (error) {
      console.error("Error seeding database:", error);
      res.status(500).json({ message: "Failed to seed database" });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
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

  // AI-powered job matching
  app.get('/api/ai-matches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log(`Fetching job recommendations for user: ${userId}`);

      // Add timeout to prevent hanging on database issues
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Job recommendations timeout')), 10000)
      );

      const recommendations = await Promise.race([
        storage.getJobRecommendations(userId),
        timeoutPromise
      ]) as any[];

      console.log(`Found ${recommendations?.length || 0} job recommendations`);

      // Return empty array if no recommendations or timeout
      if (!recommendations || recommendations.length === 0) {
        console.log('No job recommendations found - candidate may have no skills in profile or no matching jobs');
        return res.json([]);
      }

      const aiMatches = recommendations.map((job, index) => ({
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
          aiCurated: job.source !== 'internal',
          confidenceScore: job.matchScore,
          externalSource: job.source,
          externalUrl: job.externalUrl
        },
        matchScore: `${job.matchScore}%`,
        confidenceLevel: job.matchScore > 80 ? 3 : (job.matchScore > 60 ? 2 : 1),
        skillMatches: job.skillMatches || [],
        aiExplanation: job.aiExplanation,
        status: 'pending',
        createdAt: new Date().toISOString()
      }));

      res.json(aiMatches);
    } catch (error: any) {
      console.error('Error fetching job matches:', error?.message);

      // Return empty array on timeout/connection errors - better UX than 500 error
      if (error?.message?.includes('timeout') || error?.message?.includes('cancel')) {
        return res.json([]);
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

      // Return cached external jobs from database (instant, no scraping)
      // External jobs are kept up-to-date by background scheduler
      const externalJobs = await storage.getExternalJobs(skills);

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
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
      );

      const profile = await Promise.race([
        storage.getCandidateUser(req.user.id),
        timeoutPromise
      ]) as any;

      res.json(profile || {});
    } catch (error: any) {
      console.error("Error fetching candidate profile:", error?.message);

      // Return empty profile instead of error if database is slow
      // User can still proceed without full profile data
      if (error?.message?.includes('timeout') || error?.message?.includes('cancel')) {
        return res.json({
          userId: req.user.id,
          skills: [],
          experience: 'unknown',
          location: '',
          message: 'Profile data temporarily unavailable'
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
      const jobId = parseInt(req.params.jobId);
      if (!jobId) {
        return res.status(400).json({ message: "jobId is required" });
      }
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

  // Job application
  app.post('/api/candidate/apply/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseInt(req.params.jobId);
      const existingApplication = await storage.getApplicationByJobAndCandidate(jobId, userId);
      if (existingApplication) return res.status(400).json({ message: "Already applied to this job" });

      const application = await storage.createJobApplication({ jobId, candidateId: userId, status: 'applied' });
      await storage.createActivityLog(userId, "job_applied", `Applied to job ID: ${jobId}`);

      const job = await storage.getJobPosting(jobId);
      if (job) {
        await notificationService.createNotification({
          userId: job.talentOwnerId,
          type: 'new_application',
          title: 'New Application Received',
          message: `You have a new application for ${job.title}.`,
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
      const jobs = await storage.getJobPostings(req.user.id);
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
      const jobData = insertJobPostingSchema.parse({ ...req.body, talentOwnerId: req.user.id });
      const job = await storage.createJobPosting(jobData);

      if (job.hasExam) {
        try {
          const examData = {
            jobId: job.id,
            title: `${job.title} Assessment`,
            questions: await generateExamQuestions(job)
          };
          await storage.createJobExam(examData);
        } catch (examError) {
          console.warn("Failed to generate exam questions:", examError?.message);
          // Continue - exam generation is not critical
        }
      }

      // Log activity immediately
      await storage.createActivityLog(req.user.id, "job_posted", `Job posted: ${job.title}`);

      // Return job immediately (within <100ms)
      // Candidate matching happens in background asynchronously
      res.status(201).json({
        ...job,
        message: "Job posted successfully! Matching candidates in background..."
      });

      // Process candidate matching in background - fire and forget
      // This prevents 50+ second timeouts when processing many candidates
      processJobMatchesInBackground(job.id);

    } catch (error) {
      console.error("Error creating job posting:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.flatten().fieldErrors,
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
      const jobId = parseInt(req.params.jobId);
      const userId = req.user.id;

      // Verify ownership
      const job = await storage.getJobPosting(jobId);
      if (!job || job.talentOwnerId !== userId) {
        return res.status(404).json({ message: 'Job not found' });
      }

      const updatedJob = await storage.updateJobPosting(jobId, userId, req.body);
      await storage.createActivityLog(userId, "job_updated", `Job updated: ${updatedJob.title}`);
      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating job posting:", error);
      res.status(500).json({ message: "Failed to update job posting" });
    }
  });

  // Delete job posting (DELETE /api/jobs/:jobId)
  app.delete('/api/jobs/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
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
      const jobId = parseInt(req.params.jobId);
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
      } = req.body;

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
      console.error("Error completing talent owner profile:", error);
      res.status(500).json({ message: "Failed to complete profile" });
    }
  });


  app.get('/api/jobs/:jobId/applicants', isAuthenticated, async (req: any, res) => {
    try {
      const applicants = await storage.getApplicantsForJob(parseInt(req.params.jobId), req.user.id);
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
      const jobId = parseInt(req.params.jobId);
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
      const jobId = parseInt(req.params.jobId);
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
      const applicationId = parseInt(req.params.applicationId);
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
      const jobId = parseInt(req.params.jobId);
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
      const updatedApplication = await storage.updateApplicationStatus(parseInt(req.params.applicationId), status, req.user.id);

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
      const notificationId = parseInt(req.params.id);
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
      const { candidateId, jobId, applicationId, scheduledAt, duration, platform, meetingLink, notes } = req.body;

      if (!candidateId || !jobId || !applicationId || !scheduledAt) {
        return res.status(400).json({ message: "candidateId, jobId, applicationId, and scheduledAt are required" });
      }

      // Verify the talent owner has permission to schedule interviews for this job
      const job = await storage.getJobPosting(jobId);
      if (!job || job.talentOwnerId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized to schedule interviews for this job" });
      }

      const interview = await storage.createInterview({
        candidateId,
        interviewerId: req.user.id,
        jobId,
        applicationId,
        scheduledAt,
        duration: duration || 60,
        platform: platform || 'video',
        meetingLink,
        notes
      });

      // Notify the candidate about the scheduled interview
      const candidate = await storage.getCandidateUser(candidateId);
      const formattedDate = new Date(scheduledAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      await notificationService.notifyInterviewScheduled(
        candidateId,
        job.company,
        job.title,
        formattedDate,
        applicationId
      );

      res.json(interview);
    } catch (error) {
      console.error("Error scheduling interview:", error);
      res.status(500).json({ message: "Failed to schedule interview" });
    }
  });

  // Advanced matching endpoints
  app.get('/api/advanced-matches/:candidateId', isAuthenticated, async (req: any, res) => {
    try {
      const { candidateId } = req.params;

      // Verify the user is requesting their own matches or is a talent owner
      const user = await storage.getUser(req.user.id);
      if (candidateId !== req.user.id && user?.role !== 'talent_owner') {
        return res.status(403).json({ message: "Unauthorized to view these matches" });
      }

      const matches = await advancedMatchingEngine.getPersonalizedJobFeed(candidateId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching advanced matches:", error);
      res.status(500).json({ message: "Failed to fetch advanced matches" });
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
      const jobId = parseInt(req.params.jobId);
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

  // Create checkout session
  app.post('/api/stripe/create-checkout', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripeService.isConfigured()) {
        return res.status(503).json({ message: "Payment system is not configured" });
      }

      const { tierId, billingCycle } = req.body;

      if (!tierId || !billingCycle) {
        return res.status(400).json({ message: "Missing tierId or billingCycle" });
      }

      const checkoutUrl = await stripeService.createCheckoutSession(
        req.user.id,
        tierId,
        billingCycle
      );

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

  // Stripe webhook (must be before body parser for raw body)
  // Note: This should be set up at the Express app level with raw body parser
  app.post('/api/stripe/webhook', async (req: any, res) => {
    try {
      const sig = req.headers['stripe-signature'];

      if (!sig) {
        return res.status(400).json({ message: "Missing stripe-signature header" });
      }

      // The body should be raw for webhook verification
      const event = stripeService.constructWebhookEvent(req.body, sig);
      await stripeService.handleWebhook(event);

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ message: `Webhook Error: ${error.message}` });
    }
  });

  // Initialize default subscription tiers (admin endpoint)
  app.post('/api/admin/init-subscription-tiers', async (req, res) => {
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
      // Optional: Verify cron secret for security
      const cronSecret = req.headers['x-cron-secret'];
      if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
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

  return app;
}