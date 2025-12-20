import type { Express } from "express";
import { eq, sql } from "drizzle-orm";
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
import { aiResumeParser } from './ai-resume-parser';
import { supabaseAdmin } from "./lib/supabase-admin";
import { users, jobPostings, jobApplications, JobPosting } from "@shared/schema";
import { CompanyJob } from '../server/company-jobs-aggregator';

type AggregatedJob = (JobPosting | CompanyJob) & { aiCurated: boolean };

interface AIMatch {
  id: number;
  job: (JobPosting | CompanyJob) & { confidenceScore: number };
  matchScore: string;
  confidenceLevel: string;
  aiExplanation: string;
  status: string;
  createdAt: string;
}

// Instantiate ResumeService
const resumeService = new ResumeService(storage, aiResumeParser);

// Configure multer for file uploads
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storageConfig = multer.memoryStorage();
const upload = multer({
  storage: storageConfig,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
        matchScore: score.toString(),
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
      const candidateProfile = await storage.getCandidateUser(userId);
      
      if (!candidateProfile) {
        return res.status(404).json({ message: "Please complete your profile first" });
      }

      const hiddenJobIds = await storage.getHiddenJobIds(userId);

      const externalJobs = await companyJobsAggregator.getAllCompanyJobs(candidateProfile.skills, 50);
      const internalJobs = await db.query.jobPostings.findMany({ where: eq(jobPostings.status, 'active'), limit: 25 });

      const allJobs: AggregatedJob[] = [
        ...externalJobs.map((job: CompanyJob) => ({ ...job, id: Math.floor(Math.random() * 1000000), aiCurated: true })),
        ...internalJobs.map((job: JobPosting) => ({ ...job, aiCurated: false }))
      ].filter(job => !hiddenJobIds.includes(job.id));

      const aiMatches: AIMatch[] = [];
      for (const job of allJobs.slice(0, 15)) {
        try {
          const aiResult = await generateJobMatch(candidateProfile, job);
          if (aiResult.score >= 0.6) {
            aiMatches.push({
              id: Math.floor(Math.random() * 1000000),
              job: { ...job, confidenceScore: Math.round(aiResult.score * 100) },
              matchScore: `${Math.round(aiResult.score * 100)}%`,
              confidenceLevel: aiResult.confidenceLevel,
              aiExplanation: aiResult.aiExplanation,
              status: 'pending',
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error generating AI match for job:', job?.title, error);
        }
      }

      const sortedMatches = aiMatches.sort((a, b) => parseFloat(b.matchScore) - parseFloat(a.matchScore)).slice(0, 10);
      res.json(sortedMatches);
    } catch (error) {
      console.error('Error generating AI matches:', error);
      res.status(500).json({ message: "Failed to generate job matches" });
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

  // Universal job scraper
  app.get('/api/external-jobs', async (req, res) => {
    try {
      const skills = req.query.skills ? (req.query.skills as string).split(',') : [];
      const jobs = await jobAggregator.getAllJobs(skills);
      res.json({ jobs });
    } catch (error) {
      console.error('Error scraping external jobs:', error);
      res.status(500).json({ message: 'Failed to scrape external jobs' });
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
      const profile = await storage.getCandidateUser(req.user.id);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching candidate profile:", error);
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

  // Resume upload
  app.post('/api/candidate/resume', isAuthenticated, upload.single('resume'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const result = await resumeService.uploadAndProcessResume(req.user.id, req.file.buffer, req.file.mimetype);
      res.json(result);
    } catch (error) {
      console.error("Error processing resume upload:", error);
      if (error instanceof ResumeProcessingError) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to upload resume" });
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
  app.post('/api/candidates/apply/:jobId', isAuthenticated, async (req: any, res) => {
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
        const examData = {
          jobId: job.id,
          title: `${job.title} Assessment`,
          questions: await generateExamQuestions(job)
        };
        await storage.createJobExam(examData);
      }

      const candidates = await findMatchingCandidates(job);
      for (const candidate of candidates) {
        await storage.createJobMatch({ jobId: job.id, ...candidate });
        await notificationService.createNotification({
            userId: candidate.candidateId,
            type: "new_match",
            title: "New Job Match",
            message: `You have a new match for the position of ${job.title}`,
            data: { jobId: job.id },
        });
      }

      await storage.createActivityLog(req.user.id, "job_posted", `Job posted: ${job.title}`);
      res.json(job);
    } catch (error) {
      console.error("Error creating job posting:", error);
      res.status(500).json({ message: "Failed to create job posting" });
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

  app.put('/api/applications/:applicationId/status', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: "Status is required." });
      const updatedApplication = await storage.updateApplicationStatus(parseInt(req.params.applicationId), status, req.user.id);
      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating application status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  return app;
}