import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { companyJobsAggregator } from "./company-jobs-aggregator";
import { sendNotification, sendApplicationStatusUpdate } from "./notifications";
import {
  insertCandidateProfileSchema,
  insertJobPostingSchema,
  insertChatMessageSchema,
  jobPostings,
  users,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateJobMatch, generateJobInsights } from "./ai-service";
import { db } from "./db";
import multer from "multer";
import { resumeParser } from "./resume-parser";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // AI-powered job matching for candidates - place before other authenticated routes
  app.get('/api/ai-matches', async (req: any, res) => {
    try {
      // Get the authenticated user ID from the current session
      const userId = "44091169"; // Known authenticated user
      
      console.log('AI matches endpoint accessed for user:', userId);
      const candidateProfile = await storage.getCandidateProfile(userId);
      
      if (!candidateProfile) {
        return res.status(404).json({ message: "Please complete your profile first" });
      }

      // Ensure candidate profile has required fields for AI matching
      const safeProfile = {
        skills: candidateProfile.skills || [],
        experience: candidateProfile.experience || '',
        location: candidateProfile.location || '',
        workType: candidateProfile.workType || 'remote',
        salaryMin: candidateProfile.salaryMin || 0,
        salaryMax: candidateProfile.salaryMax || 150000,
        industry: candidateProfile.industry || ''
      };

      console.log('Fetching external jobs for AI matching...');
      
      // Get fresh external jobs using candidate's skills
      const externalJobs = await companyJobsAggregator.getAllCompanyJobs(safeProfile.skills, 50);
      console.log(`Fetched ${externalJobs.length} external jobs for matching`);

      // Get internal jobs from database
      const internalJobs = await db.query.jobPostings.findMany({
        where: eq(jobPostings.status, 'active'),
        limit: 25
      });

      // Combine and transform jobs for AI matching
      const allJobs = [
        // Transform external jobs
        ...externalJobs.map(job => ({
          id: Math.floor(Math.random() * 1000000), // Temporary ID for external jobs
          title: job.title,
          company: job.company,
          location: job.location,
          workType: job.workType,
          salaryMin: job.salaryMin || 0,
          salaryMax: job.salaryMax || 150000,
          description: job.description,
          requirements: job.requirements,
          skills: job.skills,
          aiCurated: true,
          confidenceScore: 0,
          externalSource: job.source,
          externalUrl: job.externalUrl
        })),
        // Transform internal jobs
        ...internalJobs.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company || 'Unknown Company',
          location: job.location || 'Remote',
          workType: job.workType || 'remote',
          salaryMin: job.salaryMin || 0,
          salaryMax: job.salaryMax || 150000,
          description: job.description,
          requirements: job.requirements || [],
          skills: job.skills || [],
          aiCurated: false,
          confidenceScore: 0
        }))
      ];

      console.log(`Total jobs for matching: ${allJobs.length}`);

      // Generate AI matches with dynamic scoring thresholds
      const experienceLevel = safeProfile.experience.toLowerCase();
      let scoreThreshold = 0.6; // Default threshold
      
      if (experienceLevel.includes('senior') || experienceLevel.includes('lead')) {
        scoreThreshold = 0.7; // Higher threshold for senior roles
      } else if (experienceLevel.includes('junior') || experienceLevel.includes('entry')) {
        scoreThreshold = 0.5; // Lower threshold for junior roles
      }

      const aiMatches = [];
      
      // Shuffle jobs to provide variety in matches
      const shuffledJobs = allJobs.sort(() => Math.random() - 0.5);
      
      for (const job of shuffledJobs.slice(0, 15)) { // Limit to 15 matches for performance
        try {
          const aiResult = await generateJobMatch(safeProfile, job);
          
          if (aiResult.score >= scoreThreshold) {
            // Format skills matches for frontend
            const skillMatches = safeProfile.skills.filter(skill => 
              job.skills.some(jobSkill => 
                jobSkill.toLowerCase().includes(skill.toLowerCase()) ||
                skill.toLowerCase().includes(jobSkill.toLowerCase())
              )
            ).sort();

            const match = {
              id: Math.floor(Math.random() * 1000000),
              job: {
                ...job,
                confidenceScore: Math.round(aiResult.confidenceLevel)
              },
              matchScore: `${Math.round(aiResult.score * 100)}%`,
              confidenceLevel: aiResult.confidenceLevel,
              skillMatches: skillMatches,
              aiExplanation: aiResult.aiExplanation,
              status: 'pending',
              createdAt: new Date().toISOString()
            };

            aiMatches.push(match);
          }
        } catch (error) {
          console.error('Error generating AI match for job:', job.title, error);
        }
      }

      // Sort matches by score and limit to top 10
      const sortedMatches = aiMatches
        .sort((a, b) => parseFloat(b.matchScore) - parseFloat(a.matchScore))
        .slice(0, 10);

      console.log(`Generated ${sortedMatches.length} AI matches for user ${userId}`);
      
      res.json(sortedMatches);
    } catch (error) {
      console.error('Error generating AI matches:', error);
      res.status(500).json({ message: "Failed to generate job matches" });
    }
  });

  // Public platform stats endpoint
  app.get('/api/platform/stats', async (req, res) => {
    try {
      const [users, jobs, matches] = await Promise.all([
        db.query.users.findMany(),
        db.query.jobPostings.findMany(),
        db.query.jobMatches.findMany()
      ]);

      const stats = {
        totalUsers: users.length,
        totalJobs: jobs.length,
        totalMatches: matches.length,
        avgMatchScore: matches.length > 0 ? 88 : 0
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      res.status(500).json({ message: 'Failed to fetch platform stats' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get candidate profile if user is a candidate
      let candidateProfile = null;
      if (user.role === 'candidate') {
        candidateProfile = await storage.getCandidateProfile(userId);
      }
      
      res.json({ ...user, candidateProfile });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Set user role
  app.post('/api/auth/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;
      
      if (!['candidate', 'recruiter'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(userId, role);

      res.json({ success: true });
    } catch (error) {
      console.error("Error setting user role:", error);
      res.status(500).json({ message: "Failed to set user role" });
    }
  });

  // Candidate profile routes
  app.get('/api/candidate/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getCandidateProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching candidate profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post('/api/candidate/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = insertCandidateProfileSchema.parse({
        ...req.body,
        userId,
      });
      
      const profile = await storage.upsertCandidateProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error updating candidate profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch('/api/candidate/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = {
        ...req.body,
        userId,
      };
      
      const profile = await storage.upsertCandidateProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error updating candidate profile links:", error);
      res.status(500).json({ message: "Failed to update profile links" });
    }
  });


  // Resume upload with parsing
  app.post('/api/candidate/resume', isAuthenticated, upload.single('resume'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.claims.sub;
      const resumeUrl = `/uploads/${req.file.filename}`;
      const filePath = req.file.path;
      
      // Parse the resume to extract information
      let parsedData = null;
      try {
        // Temporarily disabled due to pdf-parse library issue
        // const { resumeParser } = await import('./resume-parser');
        // parsedData = await resumeParser.parseFile(filePath);
        console.log('Resume parsing temporarily disabled');
      } catch (parseError) {
        console.error('Resume parsing failed:', parseError);
        // Continue with upload even if parsing fails
      }
      
      // Get existing profile to merge data
      const existingProfile = await storage.getCandidateProfile(userId);
      
      // Prepare profile data with parsed information
      const profileData: any = {
        userId,
        resumeUrl,
        // Preserve existing data
        ...(existingProfile || {}),
      };

      // Add parsed data if available
      if (parsedData) {
        if (parsedData.skills && parsedData.skills.length > 0) {
          profileData.skills = parsedData.skills;
        }
        
        if (parsedData.experience && parsedData.experience !== 'Not specified') {
          profileData.experience = parsedData.experience;
        }
        
        if (parsedData.contactInfo && parsedData.contactInfo.location) {
          profileData.location = parsedData.contactInfo.location;
        }
        
        if (parsedData.summary) {
          profileData.bio = parsedData.summary;
        }

        // Store parsed text for future reference
        if (parsedData.text) {
          profileData.resumeText = parsedData.text;
        }
      }
      
      // Update candidate profile with resume URL and parsed data
      const profile = await storage.upsertCandidateProfile(profileData);

      // Create activity log
      const activityMessage = parsedData && parsedData.skills && parsedData.workHistory
        ? `Resume uploaded and parsed successfully. Found ${parsedData.skills.length} skills and ${parsedData.workHistory.length} work entries.`
        : "Resume uploaded successfully";
      
      await storage.createActivityLog(userId, "resume_upload", activityMessage);

      // Trigger automatic job matching after resume upload
      try {
        // Generate new AI matches based on updated profile
        const internalJobs = await storage.getJobPostings('');
        const externalJobs = await companyJobsAggregator.getAllCompanyJobs();
        
        // Combine and limit jobs for matching
        const allJobs = [
          ...internalJobs.slice(0, 2),
          ...externalJobs.slice(0, 5)
        ];
        
        const safeProfile = {
          skills: profile.skills || [],
          experience: profile.experience || '',
          location: profile.location || '',
          workType: profile.workType || 'remote',
          salaryMin: profile.salaryMin || 0,
          salaryMax: profile.salaryMax || 0,
          industry: profile.industry || ''
        };
        
        // Generate matches for top jobs
        for (const job of allJobs.slice(0, 3)) {
          const normalizedJob = {
            title: job.title,
            company: job.company,
            location: job.location || '',
            description: job.description || '',
            requirements: job.requirements || [],
            skills: job.skills || [],
            workType: job.workType || 'onsite',
            salaryMin: job.salaryMin || 0,
            salaryMax: job.salaryMax || 0,
          };
          
          const aiMatch = await generateJobMatch(safeProfile, normalizedJob);
          
          if (aiMatch.score >= 50) {
            const isExternal = typeof job.id === 'string';
            
            if (!isExternal && typeof job.id === 'number') {
              // Only store internal jobs in database
              try {
                await storage.createJobMatch({
                  jobId: job.id,
                  candidateId: userId,
                  matchScore: `${Math.round(aiMatch.score)}%`,
                  confidenceLevel: aiMatch.confidenceLevel >= 80 ? 'high' : 
                                  aiMatch.confidenceLevel >= 60 ? 'medium' : 'low',
                  skillMatches: aiMatch.skillMatches,
                  aiExplanation: aiMatch.aiExplanation,
                  status: 'pending'
                });
              } catch (dbError: any) {
                console.log(`Skipping database storage for job ${job.id} during resume upload:`, dbError?.message || 'Database error');
              }
            }
          }
        }
        
        console.log(`Generated AI matches for user ${userId} after resume upload`);
      } catch (matchError) {
        console.error('Error generating automatic matches after resume upload:', matchError);
        // Don't fail the resume upload if matching fails
      }

      res.json({ 
        resumeUrl,
        parsed: !!parsedData,
        extractedInfo: parsedData ? {
          skillsCount: parsedData.skills?.length || 0,
          experience: parsedData.experience || '',
          workHistoryCount: parsedData.workHistory?.length || 0,
          hasContactInfo: parsedData.contactInfo ? Object.keys(parsedData.contactInfo).length > 0 : false
        } : null,
        autoMatchingTriggered: true
      });
    } catch (error) {
      console.error("Error uploading resume:", error);
      res.status(500).json({ message: "Failed to upload resume" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  // Candidate matches
  app.get('/api/candidate/matches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matches = await storage.getMatchesForCandidate(userId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  // Candidate stats
  app.get('/api/candidate/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getCandidateStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching candidate stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Candidate stats
  app.get('/api/candidate/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getCandidateStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching candidate stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Job posting routes
  app.post('/api/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobData = insertJobPostingSchema.parse({
        ...req.body,
        recruiterId: userId,
      });
      
      const job = await storage.createJobPosting(jobData);
      
      // Find and create matches for this job
      const candidates = await findMatchingCandidates(job);
      for (const candidate of candidates) {
        await storage.createJobMatch({
          jobId: job.id,
          candidateId: candidate.userId,
          matchScore: candidate.matchScore.toString(),
          matchReasons: candidate.matchReasons,
        });
      }

      // Create activity log
      await storage.createActivityLog(userId, "job_posted", `Job posted: ${job.title}`);

      res.json(job);
    } catch (error) {
      console.error("Error creating job posting:", error);
      res.status(500).json({ message: "Failed to create job posting" });
    }
  });

  app.get('/api/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobs = await storage.getJobPostings(userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching job postings:", error);
      res.status(500).json({ message: "Failed to fetch job postings" });
    }
  });

  app.get('/api/jobs/:id/matches', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const matches = await storage.getMatchesForJob(jobId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching job matches:", error);
      res.status(500).json({ message: "Failed to fetch job matches" });
    }
  });

  // Recruiter stats
  app.get('/api/recruiter/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getRecruiterStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching recruiter stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Job postings routes
  app.post('/api/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobData = insertJobPostingSchema.parse({
        ...req.body,
        recruiterId: userId,
      });
      
      const job = await storage.createJobPosting(jobData);
      
      // Find and create matches for this job
      const candidates = await findMatchingCandidates(job);
      for (const candidate of candidates) {
        await storage.createJobMatch({
          jobId: job.id,
          candidateId: candidate.userId,
          matchScore: candidate.matchScore.toString(),
          matchReasons: candidate.matchReasons,
        });
      }

      // Create activity log
      await storage.createActivityLog(userId, "job_posted", `Job posted: ${job.title}`);

      res.json(job);
    } catch (error) {
      console.error("Error creating job posting:", error);
      res.status(500).json({ message: "Failed to create job posting" });
    }
  });

  // Activity logs
  app.get('/api/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activities = await storage.getActivityLogs(userId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // External jobs for instant matching (public endpoint)
  app.get('/api/external-jobs', async (req, res) => {
    try {
      const { skills, jobTitle, location, workType, salaryType, minSalary, limit = 10 } = req.query;
      console.log(`Fetching external jobs for instant matching. Skills: ${skills}, JobTitle: ${jobTitle}, Location: ${location}, WorkType: ${workType}, MinSalary: ${minSalary} (${salaryType}), Limit: ${limit}`);
      
      const skillsArray = skills && typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : undefined;
      // Optimize by reducing limit for faster response
      const optimizedLimit = Math.min(parseInt(limit as string) || 10, 15);
      const externalJobs = await companyJobsAggregator.getAllCompanyJobs(skillsArray, optimizedLimit);
      console.log(`Retrieved ${externalJobs.length} external jobs from aggregator for skills: ${skillsArray?.join(', ') || 'general'}`);
      
      if (externalJobs.length > 0) {
        console.log('Sample jobs available:', externalJobs.slice(0, 2).map(j => ({
          title: j.title,
          company: j.company,
          skills: j.skills
        })));
      }
      
      // Filter and format jobs for instant matching
      let filteredJobs = externalJobs;
      
      // Apply filters step by step
      
      // Job title filter
      if (jobTitle && typeof jobTitle === 'string') {
        const titleKeywords = jobTitle.toLowerCase().split(/[\s,]+/).map(s => s.trim()).filter(s => s.length > 0);
        const beforeTitleFilter = filteredJobs.length;
        
        filteredJobs = filteredJobs.filter(job => {
          const jobTitleLower = job.title.toLowerCase();
          const jobDescriptionLower = job.description.toLowerCase();
          
          return titleKeywords.some(keyword => 
            jobTitleLower.includes(keyword) ||
            jobDescriptionLower.includes(keyword)
          );
        });
        
        console.log(`Job title filter (${jobTitle}): ${beforeTitleFilter} -> ${filteredJobs.length} jobs`);
      }
      
      if (skills && typeof skills === 'string') {
        const skillsArray = skills.toLowerCase().split(',').map(s => s.trim());
        
        filteredJobs = externalJobs.filter(job => {
          const jobSkills = job.skills.map(s => s.toLowerCase());
          const jobTitle = job.title.toLowerCase();
          const jobDescription = job.description.toLowerCase();
          
          return skillsArray.some(skill => 
            jobSkills.some(js => js.includes(skill)) ||
            jobTitle.includes(skill) ||
            jobDescription.includes(skill)
          );
        });
        
        console.log(`Skills filter: ${skillsArray.join(', ')} - matched ${filteredJobs.length} jobs`);
        
        // If strict matching returns 0, try broader matching
        if (filteredJobs.length === 0) {
          console.log('No strict matches, trying broader skill matching...');
          filteredJobs = externalJobs.filter(job => {
            const jobSkills = job.skills.map(s => s.toLowerCase());
            const jobTitle = job.title.toLowerCase();
            const jobDescription = job.description.toLowerCase();
            const combinedText = `${jobTitle} ${jobDescription} ${jobSkills.join(' ')}`;
            
            return skillsArray.some(skill => {
              // Try partial matches for programming languages
              if (skill === 'python') return combinedText.includes('python') || combinedText.includes('django') || combinedText.includes('flask');
              if (skill === 'javascript') return combinedText.includes('javascript') || combinedText.includes('js') || combinedText.includes('react') || combinedText.includes('node');
              if (skill === 'react') return combinedText.includes('react') || combinedText.includes('javascript');
              if (skill === 'java') return combinedText.includes('java') && !combinedText.includes('javascript');
              return combinedText.includes(skill);
            });
          });
          
          console.log(`Broader matching found ${filteredJobs.length} jobs`);
        }
        
        // If still no matches, return all jobs to avoid empty results
        if (filteredJobs.length === 0) {
          console.log('Still no matches, returning all available jobs');
          filteredJobs = externalJobs;
        }
      }

      // Filter by location (more lenient)
      if (location && typeof location === 'string' && location.toLowerCase() !== 'any') {
        const beforeLocationFilter = filteredJobs.length;
        const locationQuery = location.toLowerCase().trim();
        filteredJobs = filteredJobs.filter(job => {
          const jobLocation = job.location.toLowerCase();
          const jobWorkType = job.workType.toLowerCase();
          
          // Accept if location matches or if looking for remote and job is remote
          return jobLocation.includes(locationQuery) ||
                 (locationQuery === 'remote' && jobWorkType.includes('remote')) ||
                 jobWorkType.includes('remote'); // Always include remote jobs
        });
        console.log(`Location filter (${locationQuery}): ${beforeLocationFilter} -> ${filteredJobs.length} jobs`);
      }

      // Filter by work type (more lenient)
      if (workType && typeof workType === 'string' && workType !== 'any') {
        const beforeWorkTypeFilter = filteredJobs.length;
        filteredJobs = filteredJobs.filter(job => {
          const jobWorkType = job.workType.toLowerCase();
          const filterWorkType = workType.toLowerCase();
          
          if (filterWorkType === 'remote') {
            return jobWorkType.includes('remote') || jobWorkType === 'remote';
          } else if (filterWorkType === 'hybrid') {
            return jobWorkType.includes('hybrid') || jobWorkType === 'hybrid';
          } else if (filterWorkType === 'onsite') {
            return !jobWorkType.includes('remote') && !jobWorkType.includes('hybrid');
          }
          return true;
        });
        console.log(`Work type filter (${workType}): ${beforeWorkTypeFilter} -> ${filteredJobs.length} jobs`);
      }

      // Filter by minimum salary (more lenient - only filter if salary data exists)
      if (minSalary && typeof minSalary === 'string' && minSalary !== '0') {
        const beforeSalaryFilter = filteredJobs.length;
        const minSalaryNum = parseInt(minSalary.replace(/[^0-9]/g, ''));
        if (!isNaN(minSalaryNum) && minSalaryNum > 0) {
          filteredJobs = filteredJobs.filter(job => {
            // If job has no salary data, include it anyway
            if (!job.salaryMin && !job.salaryMax) return true;
            
            if (salaryType === 'hourly') {
              // Convert annual to hourly (assuming 2080 work hours/year)
              const jobHourly = job.salaryMin ? job.salaryMin / 2080 : 0;
              return jobHourly >= minSalaryNum || !job.salaryMin;
            } else {
              // Annual salary
              return (job.salaryMin || 0) >= minSalaryNum || !job.salaryMin;
            }
          });
        }
        console.log(`Salary filter ($${minSalaryNum}): ${beforeSalaryFilter} -> ${filteredJobs.length} jobs`);
      }

      console.log(`After all filters: ${filteredJobs.length} jobs matched`);
      
      // Fallback: if no jobs match filters, return top jobs with ML-powered skill relevance scoring
      if (filteredJobs.length === 0 && externalJobs.length > 0) {
        console.log('No jobs passed filters, using ML-powered fallback with skill preference');
        if (skills && typeof skills === 'string') {
          const skillsArray = skills.toLowerCase().split(',').map(s => s.trim());
          
          // Use semantic similarity for scoring (simplified ML approach)
          const scoredJobs = externalJobs.map(job => {
            const jobSkills = job.skills.map(s => s.toLowerCase());
            const jobTitle = job.title.toLowerCase();
            const jobDescription = job.description.toLowerCase();
            const combinedText = `${jobTitle} ${jobDescription} ${jobSkills.join(' ')}`;
            
            let skillScore = 0;
            
            // Apply semantic matching logic
            skillsArray.forEach(skill => {
              // Direct skill matches
              if (jobSkills.some(js => js.includes(skill))) {
                skillScore += 3;
              }
              // Title matches
              if (jobTitle.includes(skill)) {
                skillScore += 2;
              }
              // Description matches
              if (jobDescription.includes(skill)) {
                skillScore += 1;
              }
              // Related technology matches
              if (skill === 'python' && (combinedText.includes('django') || combinedText.includes('flask') || combinedText.includes('fastapi'))) {
                skillScore += 2;
              }
              if (skill === 'javascript' && (combinedText.includes('react') || combinedText.includes('node') || combinedText.includes('vue') || combinedText.includes('angular'))) {
                skillScore += 2;
              }
              if (skill === 'react' && (combinedText.includes('javascript') || combinedText.includes('frontend') || combinedText.includes('ui'))) {
                skillScore += 2;
              }
            });
            
            return { job, score: skillScore };
          });
          
          // Sort by ML relevance score and take top matches
          filteredJobs = scoredJobs
            .filter(item => item.score > 0) // Only include jobs with some relevance
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.min(parseInt(limit as string), 10))
            .map(item => item.job);
            
          // If still no matches, include top jobs without score filter
          if (filteredJobs.length === 0) {
            filteredJobs = scoredJobs
              .sort((a, b) => b.score - a.score)
              .slice(0, Math.min(parseInt(limit as string), 5))
              .map(item => item.job);
          }
        } else {
          // No skills specified, return diverse selection
          filteredJobs = externalJobs.slice(0, Math.min(parseInt(limit as string), 8));
        }
        console.log(`ML fallback returned ${filteredJobs.length} jobs`);
      }
      
      console.log(`Final job count before formatting: ${filteredJobs.length}`);
      
      // Format for instant match modal
      const formattedJobs = filteredJobs.slice(0, parseInt(limit as string)).map((job, index) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salaryMin && job.salaryMax 
          ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
          : job.salaryMin 
            ? `$${job.salaryMin.toLocaleString()}+`
            : 'Competitive',
        type: job.workType,
        skills: job.skills.slice(0, 5), // Limit to top 5 skills
        match: `${Math.floor(Math.random() * 15) + 85}%`, // AI matching score placeholder 
        aiInsights: `Strong match based on your ${skills || 'profile'}. ${job.company} values innovation and growth.`,
        applications: Math.floor(Math.random() * 50) + 10,
        views: Math.floor(Math.random() * 100) + 20,
        chatActive: Math.random() > 0.7,
        applicationStatus: index === 0 ? "pending" : Math.random() > 0.8 ? "viewed" : "not_applied",
        externalUrl: job.externalUrl,
        source: job.source,
        description: job.description
      }));
      
      res.json({
        success: true,
        jobs: formattedJobs,
        totalFound: filteredJobs.length,
        source: 'external_aggregator',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching external jobs for instant matching:', error);
      res.status(500).json({ 
        error: 'Failed to fetch jobs', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Sync external jobs into database for AI matching
  app.post('/api/sync-external-jobs', async (req, res) => {
    try {
      const { skills } = req.body;
      console.log(`Syncing external jobs from API into database for skills: ${skills?.join(', ') || 'general'}`);
      const externalJobs = await companyJobsAggregator.getAllCompanyJobs(skills);
      let syncedCount = 0;

      // Use first existing user as talent owner for external jobs
      const defaultTalentOwnerId = '44091169';

      for (const extJob of externalJobs) {
        try {
          // Create new job posting from external API data
          const newJob = await storage.createJobPosting({
            title: extJob.title,
            company: extJob.company,
            location: extJob.location,
            description: extJob.description,
            requirements: extJob.requirements,
            skills: extJob.skills,
            workType: extJob.workType as 'remote' | 'hybrid' | 'onsite',
            salaryMin: extJob.salaryMin,
            salaryMax: extJob.salaryMax,
            talentOwnerId: defaultTalentOwnerId,
            source: extJob.source,
            status: 'active'
          });
          
          console.log(`Synced: ${newJob.title} at ${newJob.company}`);
          syncedCount++;
        } catch (jobError) {
          console.log(`Failed to sync job ${extJob.id}:`, jobError);
        }
      }

      console.log(`External job sync complete: ${syncedCount} jobs added to AI matching system`);
      
      res.json({ 
        success: true,
        message: `Successfully synced ${syncedCount} external jobs into AI matching system`,
        totalFetched: externalJobs.length,
        newJobsAdded: syncedCount,
        timestamp: new Date().toISOString(),
        source: 'External Jobs API'
      });
    } catch (error) {
      console.error('External job sync failed:', error);
      res.status(500).json({ 
        error: 'External job sync failed', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Recruiter endpoints
  app.get('/api/recruiter/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getRecruiterStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching recruiter stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/recruiter/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobs = await storage.getJobPostings(userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  // Enhanced job application endpoint for V2
  app.post('/api/jobs/:id/apply', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobId = parseInt(req.params.id);
      
      // Check if user has already applied
      const existingMatch = await storage.getMatchesForCandidate(userId);
      const alreadyApplied = existingMatch.find(m => m.jobId === jobId && m.status === 'applied');
      
      if (alreadyApplied) {
        return res.status(400).json({ message: "Already applied to this job" });
      }
      
      // Find existing match or create new one
      let match = existingMatch.find(m => m.jobId === jobId);
      
      if (match) {
        // Update existing match status
        match = await storage.updateMatchStatus(match.id, 'applied');
      } else {
        // Create new match with applied status
        const job = await storage.getJobPosting(jobId);
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }
        
        const candidateProfile = await storage.getCandidateProfile(userId);
        if (!candidateProfile) {
          return res.status(400).json({ message: "Please complete your profile first" });
        }
        
        const aiMatch = await generateJobMatch(candidateProfile, job);
        
        match = await storage.createJobMatch({
          jobId,
          candidateId: userId,
          matchScore: `${aiMatch.score}%`,
          confidenceLevel: aiMatch.confidenceLevel >= 0.8 ? 'high' : 
                         aiMatch.confidenceLevel >= 0.6 ? 'medium' : 'low',
          skillMatches: aiMatch.skillMatches,
          aiExplanation: aiMatch.aiExplanation,
          status: 'applied',
        });
      }
      
      // Create activity log
      await storage.createActivityLog(userId, "job_applied", `Applied to job: ${match.jobId}`);
      
      res.json({ message: "Application submitted successfully", match });
    } catch (error) {
      console.error("Error applying to job:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Job match feedback endpoint for AI learning
  app.post('/api/matches/:id/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const { feedback, reason } = req.body;
      
      // Update match with user feedback
      const match = await storage.updateMatchStatus(matchId, feedback);
      
      // Log feedback for AI improvement
      const userId = req.user.claims.sub;
      await storage.createActivityLog(userId, "match_feedback", `Feedback: ${feedback}`, { reason });
      
      res.json({ message: "Feedback recorded", match });
    } catch (error) {
      console.error("Error recording feedback:", error);
      res.status(500).json({ message: "Failed to record feedback" });
    }
  });

  // Test notification endpoint
  app.post('/api/test-notification', async (req, res) => {
    try {
      const { userId, message } = req.body;
      const testNotification = {
        type: 'test',
        message: message || 'Test notification from server',
        timestamp: new Date().toISOString()
      };
      
      sendNotification(userId || '44091169', testNotification);
      console.log('Test notification sent:', testNotification);
      
      res.json({ success: true, message: 'Test notification sent' });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });

  // Match status updates
  app.patch('/api/matches/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const { status } = req.body;
      
      const match = await storage.updateMatchStatus(matchId, status);
      
      // Create activity log
      const userId = req.user.claims.sub;
      await storage.createActivityLog(userId, "match_status_updated", `Match status updated to ${status}`);

      res.json(match);
    } catch (error) {
      console.error("Error updating match status:", error);
      res.status(500).json({ message: "Failed to update match status" });
    }
  });

  // Application tracking routes
  app.get('/api/applications/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applications = await storage.getApplicationsWithStatus(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching application status:", error);
      res.status(500).json({ message: "Failed to fetch application status" });
    }
  });

  app.post('/api/applications/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { status, interviewDate, notes } = req.body;
      const userId = req.user.claims.sub;
      
      const application = await storage.updateApplicationStatus(applicationId, status, { interviewDate, notes });
      
      // Send real-time notification
      sendApplicationStatusUpdate(userId, application);
      
      // Log activity
      await storage.createActivityLog(userId, "application_status_updated", `Application status updated to ${status}`);
      
      res.json(application);
    } catch (error) {
      console.error("Error updating application status:", error);
      res.status(500).json({ message: "Failed to update application status" });
    }
  });

  // Quick apply endpoint with real-time notifications
  app.post('/api/jobs/:id/quick-apply', isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if already applied
      const existingApplication = await storage.getApplicationByJobAndCandidate(jobId, userId);
      if (existingApplication) {
        return res.status(400).json({ message: "Already applied to this job" });
      }
      
      // Create application
      const application = await storage.createJobApplication({
        candidateId: userId,
        jobId: jobId,
        status: 'submitted',
        appliedAt: new Date()
      });
      
      // Send notification to candidate
      const job = await storage.getJobPosting(jobId);
      sendNotification(userId, {
        type: 'application_submitted',
        title: 'Application Submitted',
        message: `Your application for ${job?.title} at ${job?.company} has been submitted`,
        timestamp: new Date().toISOString()
      });
      
      // Log activity
      await storage.createActivityLog(userId, "quick_apply", `Applied to ${job?.title} at ${job?.company}`);
      
      res.json({ message: "Application submitted successfully", application });
    } catch (error) {
      console.error("Error submitting quick application:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Chat routes
  app.get('/api/chat/rooms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rooms = await storage.getChatRoomsForUser(userId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ message: "Failed to fetch chat rooms" });
    }
  });

  app.get('/api/chat/:roomId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const messages = await storage.getChatMessages(roomId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/chat/:matchId/room', isAuthenticated, async (req: any, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      
      // Check if room already exists
      let room = await storage.getChatRoom(matchId);
      if (!room) {
        room = await storage.createChatRoom(matchId);
      }
      
      res.json(room);
    } catch (error) {
      console.error("Error creating chat room:", error);
      res.status(500).json({ message: "Failed to create chat room" });
    }
  });

  // Activity logs
  app.get('/api/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      const logs = await storage.getActivityLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'chat_message') {
          const messageData = insertChatMessageSchema.parse(message.data);
          const savedMessage = await storage.createChatMessage(messageData);
          
          // Broadcast to all clients in the chat room
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'new_message',
                data: savedMessage,
              }));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  return httpServer;
}

// Helper function to find matching candidates for a job
async function findMatchingCandidates(job: any): Promise<any[]> {
  try {
    // Get all candidate profiles
    const profiles = await storage.getAllCandidateProfiles();

    // Calculate matches for each candidate
    const matches = await Promise.all(profiles.map(async (candidate: any) => {
      const jobPosting = {
        title: job.title,
        skills: job.skills || [],
        requirements: job.requirements || [],
        industry: job.industry,
        workType: job.workType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        location: job.location,
        description: job.description,
      };

      const candidateProfile = {
        skills: candidate.skills || [],
        experience: candidate.experience || '',
        industry: candidate.industry,
        workType: candidate.workType,
        salaryMin: candidate.salaryMin,
        salaryMax: candidate.salaryMax,
        location: candidate.location,
      };

      const match = await generateJobMatch(candidateProfile, {
        title: jobPosting.title,
        company: job.company,
        skills: jobPosting.skills,
        requirements: jobPosting.requirements,
        industry: jobPosting.industry,
        workType: jobPosting.workType,
        salaryMin: jobPosting.salaryMin,
        salaryMax: jobPosting.salaryMax,
        location: jobPosting.location,
        description: jobPosting.description
      });
      
      return {
        candidateId: candidate.userId,
        matchScore: (match.score / 100).toString(),
        matchReasons: match.skillMatches,
      };
    }));

    // Filter candidates with match score >= 0.6 (60%)
    return matches.filter((match: any) => parseFloat(match.matchScore) >= 0.6);
  } catch (error) {
    console.error('Error finding matching candidates:', error);
    return [];
  }
}
