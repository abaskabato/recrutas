import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { jobAggregator } from "./job-aggregator";
import { sendNotification, sendApplicationStatusUpdate } from "./notifications";
import {
  insertCandidateProfileSchema,
  insertJobPostingSchema,
  insertChatMessageSchema,
} from "@shared/schema";
import { generateJobMatch, generateJobInsights } from "./ai-service";
import { db } from "./db";
import { eq } from "drizzle-orm";
import multer from "multer";
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
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
        const { resumeParser } = await import('./resume-parser');
        parsedData = await resumeParser.parseFile(filePath);
        console.log('Resume parsed successfully:', {
          skillsFound: parsedData.skills.length,
          experience: parsedData.experience,
          workHistoryEntries: parsedData.workHistory.length
        });
      } catch (parseError) {
        console.error('Resume parsing failed:', parseError);
        // Continue with upload even if parsing fails
      }
      
      // Prepare profile data with parsed information
      const profileData: any = {
        userId,
        resumeUrl,
      };

      // Add parsed data if available
      if (parsedData) {
        if (parsedData.skills.length > 0) {
          profileData.skills = parsedData.skills;
        }
        
        if (parsedData.experience && parsedData.experience !== 'Not specified') {
          profileData.experience = parsedData.experience;
        }
        
        if (parsedData.contactInfo.location) {
          profileData.location = parsedData.contactInfo.location;
        }
        
        if (parsedData.summary) {
          profileData.bio = parsedData.summary;
        }

        // Store parsed text for future reference
        profileData.resumeText = parsedData.text;
      }
      
      // Update candidate profile with resume URL and parsed data
      const profile = await storage.upsertCandidateProfile(profileData);

      // Create activity log
      const activityMessage = parsedData 
        ? `Resume uploaded and parsed successfully. Found ${parsedData.skills.length} skills and ${parsedData.workHistory.length} work entries.`
        : "Resume uploaded successfully";
      
      await storage.createActivityLog(userId, "resume_upload", activityMessage);

      res.json({ 
        resumeUrl,
        parsed: !!parsedData,
        extractedInfo: parsedData ? {
          skillsCount: parsedData.skills.length,
          experience: parsedData.experience,
          workHistoryCount: parsedData.workHistory.length,
          hasContactInfo: Object.keys(parsedData.contactInfo).length > 0
        } : null
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

  // AI-powered job matching for candidates
  app.get('/api/ai-matches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const candidateProfile = await storage.getCandidateProfile(userId);
      
      if (!candidateProfile) {
        return res.status(404).json({ message: "Please complete your profile first" });
      }

      // Get existing matches for this candidate
      const existingMatches = await storage.getMatchesForCandidate(userId);
      
      if (existingMatches.length > 0) {
        // Return existing matches with AI enhancements
        const enhancedMatches = existingMatches.map(match => ({
          id: match.id,
          job: {
            ...match.job,
            aiCurated: true,
            confidenceScore: match.confidenceLevel ? 
              (match.confidenceLevel === 'high' ? 85 : match.confidenceLevel === 'medium' ? 65 : 45) : 70,
            externalSource: match.job.source,
          },
          matchScore: match.matchScore,
          confidenceLevel: match.confidenceLevel || 'medium',
          skillMatches: match.skillMatches || [],
          aiExplanation: match.aiExplanation || 'This job matches your profile based on skills and experience.',
          status: match.status || 'pending',
          createdAt: match.createdAt?.toISOString() || new Date().toISOString(),
        }));
        
        return res.json(enhancedMatches);
      }

      // No existing matches, generate new ones
      const internalJobs = await storage.getJobPostings('');
      console.log(`Found ${internalJobs.length} internal jobs`);
      
      const externalJobs = await jobAggregator.getAllJobs();
      console.log(`Found ${externalJobs.length} external jobs from hiring.cafe`);
      
      // Combine internal and external jobs
      const allJobs = [
        ...internalJobs.slice(0, 3), // First 3 internal jobs
        ...externalJobs.slice(0, 7)  // First 7 external jobs from hiring.cafe
      ];
      
      console.log(`Total jobs to process: ${allJobs.length} (${internalJobs.slice(0, 3).length} internal + ${externalJobs.slice(0, 7).length} external)`);
      
      const matches = [];

      for (const job of allJobs) {
        try {
          // Normalize job data for AI matching
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

          // Generate AI match using the service
          const aiMatch = await generateJobMatch(candidateProfile, normalizedJob);
          
          if (aiMatch.score >= 30) {
            // For external jobs, we don't store them in job_matches table yet
            // Instead, we return them directly in the response
            const isExternal = typeof job.id === 'string' && job.id.startsWith('hc_');
            
            if (isExternal) {
              // External job - return directly without storing in database
              matches.push({
                id: `match_${job.id}`,
                job: {
                  id: job.id,
                  title: job.title,
                  company: job.company,
                  location: job.location,
                  workType: job.workType,
                  salaryMin: job.salaryMin,
                  salaryMax: job.salaryMax,
                  description: job.description,
                  requirements: job.requirements,
                  skills: job.skills,
                  aiCurated: true,
                  confidenceScore: aiMatch.score,
                  externalSource: job.source,
                  externalUrl: (job as any).externalUrl,
                  status: 'active',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                matchScore: `${aiMatch.score}%`,
                confidenceLevel: aiMatch.confidenceLevel >= 0.8 ? 'high' : 
                               aiMatch.confidenceLevel >= 0.6 ? 'medium' : 'low',
                skillMatches: aiMatch.skillMatches,
                aiExplanation: aiMatch.aiExplanation,
                status: 'pending',
                createdAt: new Date().toISOString(),
              });
            } else {
              // Internal job - store in database
              const newMatch = await storage.createJobMatch({
                jobId: job.id,
                candidateId: userId,
                matchScore: `${aiMatch.score}%`,
                confidenceLevel: aiMatch.confidenceLevel >= 0.8 ? 'high' : 
                               aiMatch.confidenceLevel >= 0.6 ? 'medium' : 'low',
                skillMatches: aiMatch.skillMatches,
                aiExplanation: aiMatch.aiExplanation,
                status: 'pending',
              });

              matches.push({
                id: newMatch.id,
                job: {
                  ...job,
                  aiCurated: true,
                  confidenceScore: aiMatch.score,
                  externalSource: job.source,
                },
                matchScore: `${aiMatch.score}%`,
                confidenceLevel: aiMatch.confidenceLevel >= 0.8 ? 'high' : 
                               aiMatch.confidenceLevel >= 0.6 ? 'medium' : 'low',
                skillMatches: aiMatch.skillMatches,
                aiExplanation: aiMatch.aiExplanation,
                status: 'pending',
                createdAt: new Date().toISOString(),
              });
            }
          }
        } catch (matchError) {
          console.error('Error generating match for job:', job.id, matchError);
        }
      }

      // Sort by match score
      matches.sort((a, b) => parseInt(b.matchScore) - parseInt(a.matchScore));
      res.json(matches);
    } catch (error) {
      console.error('Error generating AI matches:', error);
      res.status(500).json({ message: "Failed to generate matches" });
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
    const matches = profiles.map((candidate: any) => {
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

      const match = calculateJobMatch(candidateProfile, jobPosting);
      
      return {
        candidateId: candidate.userId,
        matchScore: match.score.toString(),
        matchReasons: match.reasons,
      };
    });

    // Filter candidates with match score >= 0.6 (60%)
    return matches.filter((match: any) => parseFloat(match.matchScore) >= 0.6);
  } catch (error) {
    console.error('Error finding matching candidates:', error);
    return [];
  }
}
