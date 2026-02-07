/**
 * Storage Layer for Recrutas Platform
 * 
 * This module provides a comprehensive data access layer implementing the Repository pattern.
 * It handles all database interactions while maintaining clean separation between
 * business logic and data persistence.
 * 
 * Key Features:
 * - Type-safe database operations using Drizzle ORM
 * - Comprehensive CRUD operations for all entities
 * - Advanced querying with filtering and pagination
 * - Transaction support for complex operations
 * - Error handling and data validation
 * 
 * Architecture:
 * - IStorage interface defines the contract
 * - DatabaseStorage implements the interface
 * - All methods are async and return Promise-based results
 * - Uses dependency injection pattern for testability
 */

import {
  users,
  candidateProfiles,
  jobPostings,
  jobMatches,
  chatRooms,
  chatMessages,
  activityLogs,
  notifications,
  examAttempts,
  jobExams,
  notificationPreferences,
  jobApplications,
  savedJobs,
  hiddenJobs,
  talentOwnerProfiles,
  interviews,
  screeningQuestions,
  screeningAnswers,
  type User,
  type UpsertUser,
  type CandidateProfile,
  type InsertCandidateProfile,
  type TalentOwnerProfile,
  type InsertTalentOwnerProfile,
  type JobPosting,
  type InsertJobPosting,
  type JobMatch,
  type InsertJobMatch,
  type ChatRoom,
  type ChatMessage,
  type InsertChatMessage,
  type ActivityLog,
  type NotificationPreferences,
  type InsertNotificationPreferences
} from "../shared/schema.js";
import { db } from "./db";
import { eq, desc, and, or } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import { inArray } from "drizzle-orm/sql/expressions";
import { supabaseAdmin } from "./lib/supabase-admin";

/**
 * Storage Interface Definition
 * 
 * Defines the contract for all data access operations across the platform.
 * This interface ensures consistency and enables easy testing through mocking.
 */
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserInfo(userId: string, userInfo: any): Promise<any>;
  updateUserRole(userId: string, role: 'candidate' | 'talent_owner'): Promise<User>;




  // Candidate operations
  getCandidateUser(userId: string): Promise<CandidateProfile | undefined>;
  upsertCandidateUser(profile: InsertCandidateProfile): Promise<CandidateProfile>;
  getAllCandidateUsers(): Promise<CandidateProfile[]>;

  // Talent Owner operations
  getTalentOwnerProfile(userId: string): Promise<TalentOwnerProfile | undefined>;
  upsertTalentOwnerProfile(profile: InsertTalentOwnerProfile): Promise<TalentOwnerProfile>;


  // Job operations
  createJobPosting(job: InsertJobPosting): Promise<JobPosting>;
  getJobPostings(recruiterId: string): Promise<JobPosting[]>;
  getJobPosting(id: number): Promise<JobPosting | undefined>;
  getJobRecommendations(candidateId: string): Promise<JobPosting[]>;
  updateJobPosting(id: number, talentOwnerId: string, updates: Partial<InsertJobPosting>): Promise<JobPosting>;
  deleteJobPosting(id: number, talentOwnerId: string): Promise<void>;


  // Matching operations
  createJobMatch(match: InsertJobMatch): Promise<JobMatch>;
  getMatchesForCandidate(candidateId: string): Promise<(JobMatch & { job: JobPosting; talentOwner: User })[]>;
  getMatchesForJob(jobId: number): Promise<(JobMatch & { candidate: User; candidateProfile?: CandidateProfile })[]>;
  updateMatchStatus(matchId: number, status: string): Promise<JobMatch>;
  clearJobMatches(jobId: number): Promise<void>;
  updateJobMatchStatus(candidateId: string, jobId: number, status: string): Promise<void>;

  // Exam operations
  createJobExam(exam: any): Promise<any>;
  getJobExam(jobId: number): Promise<any>;
  createExamAttempt(attempt: any): Promise<any>;
  updateExamAttempt(attemptId: number, data: any): Promise<any>;
  getExamAttempts(jobId: number): Promise<any[]>;
  rankCandidatesByExamScore(jobId: number): Promise<void>;

  // Chat operations (controlled by exam performance)
  createChatRoom(data: any): Promise<ChatRoom>;
  getChatRoom(jobId: number, candidateId: string): Promise<ChatRoom | undefined>;
  getChatMessages(chatRoomId: number): Promise<(ChatMessage & { sender: User })[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatRoomsForUser(userId: string): Promise<(ChatRoom & { job: JobPosting; hiringManager: User })[]>;
  grantChatAccess(jobId: number, candidateId: string, examAttemptId: number, ranking: number): Promise<ChatRoom>;

  // Activity operations
  createActivityLog(userId: string, type: string, description: string, metadata?: any): Promise<ActivityLog>;
  getActivityLogs(userId: string, limit?: number): Promise<ActivityLog[]>;

  // Application tracking operations
  getApplicationsWithStatus(candidateId: string): Promise<any[]>;
  getApplicantsForJob(jobId: number, talentOwnerId: string): Promise<any[]>;
  updateApplicationStatus(applicationId: number, status: string, talentOwnerId: string): Promise<any>;
  getApplicationByJobAndCandidate(jobId: number, candidateId: string): Promise<any>;
  createJobApplication(application: any): Promise<any>;
  getApplicationById(applicationId: number): Promise<any>;
  createApplicationEvent(event: any): Promise<any>;
  getApplicationEvents(applicationId: number): Promise<any[]>;
  getApplicationInsights(applicationId: number): Promise<any>;
  createApplicationInsights(insights: any): Promise<any>;
  updateApplicationIntelligence(applicationId: number, updates: any): Promise<any>;
  getApplicationsForTalent(talentId: string): Promise<any[]>;
  updateTalentTransparencySettings(talentId: string, settings: any): Promise<any>;
  storeExamResult(result: any): Promise<any>;
  getAvailableNotificationUsers(): Promise<string[]>;


  // Statistics
  getJobStatistics(): Promise<any>;
  getCandidateStats(candidateId: string): Promise<{
    totalApplications: number;
    activeMatches: number;
    profileViews: number;
    profileStrength: number;
    responseRate: number;
    avgMatchScore: number;
  }>;
  getRecruiterStats(recruiterId: string): Promise<{
    activeJobs: number;
    totalMatches: number;
    activeChats: number;
    hires: number;
  }>;
  getCandidatesForRecruiter(talentOwnerId: string): Promise<any[]>;

  // Notification preferences
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  updateNotificationPreferences(userId: string, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences>;

  // Notification operations
  getNotifications(userId: string): Promise<any[]>;
  markNotificationAsRead(notificationId: number, userId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  createNotification(notification: any): Promise<any>;

  // Enhanced candidate operations
  getApplicationsForCandidate(candidateId: string): Promise<any[]>;
  getActivityForCandidate(candidateId: string): Promise<any[]>;
  saveJob(userId: string, jobId: number): Promise<void>;
  unsaveJob(userId: string, jobId: number): Promise<void>;
  hideJob(userId: string, jobId: number): Promise<void>;
  getSavedJobIds(userId: string): Promise<number[]>;
  getHiddenJobIds(userId: string): Promise<number[]>;
  // Discover operations
  findMatchingCandidates(jobId: number): Promise<any[]>;

  // Interview operations
  createInterview(interview: any): Promise<any>;

  // File operations
  uploadResume(fileBuffer: Buffer, mimetype: string): Promise<string>;
  getResumeSignedUrl(resumePath: string): Promise<string>;

  // Screening questions operations
  getScreeningQuestions(jobId: number): Promise<any[]>;
  saveScreeningQuestions(jobId: number, questions: any[]): Promise<any[]>;
  saveScreeningAnswers(applicationId: number, answers: any[]): Promise<any[]>;
}

/**
 * Database Storage Implementation
 * 
 * Implements the IStorage interface using Drizzle ORM for PostgreSQL.
 * Provides production-ready data access with proper error handling,
 * transaction support, and optimized queries.
 */
export class DatabaseStorage implements IStorage {

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    try {
      console.log(`[storage] Getting user with id: ${id}`);
      const [user] = await db.select().from(users).where(eq(users.id, id));
      console.log(`[storage] Found user:`, user);
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }

  async updateUserRole(userId: string, role: 'candidate' | 'talent_owner'): Promise<User> {
    try {
      // First, update the user's metadata in Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { app_metadata: { role } }
      );

      if (authError) {
        console.error('Error updating Supabase auth user:', authError);
        throw new Error(authError.message);
      }

      // Then, update the local database for consistency
      const [user] = await db
        .update(users)
        .set({ role: role as any, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      if (!user) {
        throw new Error("User not found in local database after role update.");
      }

      return user;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async uploadResume(fileBuffer: Buffer, fileType: string): Promise<string> {
    try {
      const bucket = 'resumes';
      const fileName = `resume-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(fileName, fileBuffer, {
          contentType: fileType,
          upsert: true,
        });

      if (error) {
        console.error('Error uploading to Supabase Storage:', error);
        throw new Error('Failed to upload resume to storage.');
      }

      // Return the file path instead of public URL - we'll generate signed URLs on demand
      return fileName;
    } catch (error) {
      console.error('Error in uploadResume:', error);
      throw error;
    }
  }

  // Generate a signed URL for accessing resumes (expires in 1 hour)
  async getResumeSignedUrl(resumePath: string): Promise<string> {
    try {
      // If the path is already a full URL (legacy), return it as-is
      if (resumePath.startsWith('http://') || resumePath.startsWith('https://')) {
        return resumePath;
      }

      const { data, error } = await supabaseAdmin.storage
        .from('resumes')
        .createSignedUrl(resumePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        throw new Error('Failed to generate resume URL.');
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error in getResumeSignedUrl:', error);
      throw error;
    }
  }

  async updateUserInfo(userId: string, userData: Partial<UpsertUser>): Promise<any> {
    try {
      const [user] = await db
        .update(users)
        .set({ ...userData, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Candidate operations
  async getCandidateUser(userId: string): Promise<CandidateProfile | undefined> {
    try {
      console.log(`[storage] Getting candidate profile for user id: ${userId}`);
      const [profile] = await db
        .select()
        .from(candidateProfiles)
        .where(eq(candidateProfiles.userId, userId));
      console.log(`[storage] Found candidate profile:`, profile);
      return profile;
    } catch (error) {
      console.error('Error fetching candidate profile:', error);
      throw error;
    }
  }

  async upsertCandidateUser(profile: InsertCandidateProfile): Promise<CandidateProfile> {
    try {
      const [result] = await db
        .insert(candidateProfiles)
        .values({
          ...profile,
          skills: profile.skills || [],
          updatedAt: new Date()
        } as any)
        .onConflictDoUpdate({
          target: candidateProfiles.userId,
          set: {
            ...profile,
            skills: profile.skills || [],
            updatedAt: new Date(),
          },
        })
        .returning();
      return result;
    } catch (error) {
      console.error('Error upserting candidate profile:', error);
      throw error;
    }
  }

  async getAllCandidateUsers(): Promise<CandidateProfile[]> {
    try {
      return await db.select().from(candidateProfiles);
    } catch (error) {
      console.error('Error fetching all candidate profiles:', error);
      throw error;
    }
  }

  // Talent Owner operations
  async getTalentOwnerProfile(userId: string): Promise<TalentOwnerProfile | undefined> {
    try {
      const [profile] = await db
        .select()
        .from(talentOwnerProfiles)
        .where(eq(talentOwnerProfiles.userId, userId));
      return profile;
    } catch (error) {
      console.error('Error fetching talent owner profile:', error);
      throw error;
    }
  }

  async upsertTalentOwnerProfile(profile: InsertTalentOwnerProfile): Promise<TalentOwnerProfile> {
    try {
      const [result] = await db
        .insert(talentOwnerProfiles)
        .values({
          ...profile,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: talentOwnerProfiles.userId,
          set: {
            ...profile,
            updatedAt: new Date(),
          },
        })
        .returning();
      return result;
    } catch (error) {
      console.error('Error upserting talent owner profile:', error);
      throw error;
    }
  }


  async saveJob(userId: string, jobId: number): Promise<void> {
    try {
      await db.insert(savedJobs).values({ userId, jobId }).onConflictDoNothing();
    } catch (error) {
      console.error('Error saving job:', error);
      throw error;
    }
  }

  async unsaveJob(userId: string, jobId: number): Promise<void> {
    try {
      await db.delete(savedJobs).where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
    } catch (error) {
      console.error('Error unsaving job:', error);
      throw error;
    }
  }

  async hideJob(userId: string, jobId: number): Promise<void> {
    try {
      await db.insert(hiddenJobs).values({ userId, jobId }).onConflictDoNothing();
    } catch (error) {
      console.error('Error hiding job:', error);
      throw error;
    }
  }

  async getSavedJobIds(userId: string): Promise<number[]> {
    try {
      const results = await db.select({ jobId: savedJobs.jobId }).from(savedJobs).where(eq(savedJobs.userId, userId));
      return results.map(r => r.jobId);
    } catch (error) {
      console.error('Error getting saved job ids:', error);
      throw error;
    }
  }

  async getHiddenJobIds(userId: string): Promise<number[]> {
    try {
      const results = await db.select({ jobId: hiddenJobs.jobId }).from(hiddenJobs).where(eq(hiddenJobs.userId, userId));
      return results.map(r => r.jobId);
    } catch (error) {
      console.error('Error getting hidden job ids:', error);
      throw error;
    }
  }



  // Job operations
  async createJobPosting(job: InsertJobPosting): Promise<JobPosting> {
    try {
      const [result] = await db.insert(jobPostings).values({
        ...job,
        skills: job.skills || [],
        requirements: job.requirements || [],
        hiringManagerId: job.hiringManagerId || job.talentOwnerId, // Default to talent owner if no hiring manager specified
      }).returning();
      return result;
    } catch (error) {
      console.error('Error creating job posting:', error);
      throw error;
    }
  }

  async getJobPostings(talentOwnerId: string): Promise<JobPosting[]> {
    try {
      if (!talentOwnerId) {
        // This case should ideally not be reached if endpoints are secure
        console.warn('[storage] getJobPostings called without a talentOwnerId.');
        return [];
      }

      return await db
        .select()
        .from(jobPostings)
        .where(eq(jobPostings.talentOwnerId, talentOwnerId))
        .orderBy(desc(jobPostings.createdAt));
    } catch (error) {
      console.error('Error fetching job postings:', error);
      throw error;
    }
  }

  async getJobPosting(id: number): Promise<JobPosting | undefined> {
    try {
      const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
      return job;
    } catch (error) {
      console.error('Error fetching job posting:', error);
      throw error;
    }
  }

  async getExternalJobs(skills: string[] = []): Promise<JobPosting[]> {
    try {
      console.log('[storage] Fetching external jobs', skills.length > 0 ? `with skills: ${skills.join(', ')}` : '');

      // Query external jobs (source = 'external' or externalUrl is set)
      const query = db
        .select()
        .from(jobPostings)
        .where(and(
          eq(jobPostings.status, 'active'),
          or(
            sql`${jobPostings.source} = 'external'`,
            sql`${jobPostings.externalUrl} IS NOT NULL`
          ),
          or(
            sql`${jobPostings.expiresAt} IS NULL`,
            sql`${jobPostings.expiresAt} > NOW()`
          )
        ))
        .orderBy(sql`${jobPostings.createdAt} DESC`)
        .limit(100);

      const jobs = await query;

      // Filter by skills if provided
      if (skills.length > 0) {
        return jobs.filter(job => {
          const jobSkills = Array.isArray(job.skills) ? job.skills : [];
          return skills.some(skill => jobSkills.includes(skill));
        });
      }

      return jobs;
    } catch (error) {
      console.error('Error fetching external jobs:', error);
      throw error;
    }
  }

  async getJobStatistics(): Promise<any> {
    try {
      const { sql } = await import('drizzle-orm/sql');
      const { count } = await import('drizzle-orm/sql/functions');

      // Total jobs
      const totalJobs = await db
        .select({ count: sql`COUNT(*)::int` })
        .from(jobPostings);

      // Jobs by source
      const jobsBySource = await db
        .select({
          source: jobPostings.source,
          count: sql`COUNT(*)::int`
        })
        .from(jobPostings)
        .groupBy(jobPostings.source);

      // Jobs by status
      const jobsByStatus = await db
        .select({
          status: jobPostings.status,
          count: sql`COUNT(*)::int`
        })
        .from(jobPostings)
        .groupBy(jobPostings.status);

      // External jobs specifically
      const externalJobs = await db
        .select({ count: sql`COUNT(*)::int` })
        .from(jobPostings)
        .where(sql`${jobPostings.externalUrl} IS NOT NULL OR ${jobPostings.source} != 'platform'`);

      return {
        totalJobs: (totalJobs[0] as any)?.count || 0,
        externalJobs: (externalJobs[0] as any)?.count || 0,
        jobsBySource: jobsBySource.map((j: any) => ({
          source: j.source || 'unknown',
          count: j.count
        })),
        jobsByStatus: jobsByStatus.map((j: any) => ({
          status: j.status,
          count: j.count
        })),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting job statistics:', error);
      throw error;
    }
  }

  /**
   * Compute match tier label from a percentage score.
   */
  private getMatchTier(score: number): 'great' | 'good' | 'worth-a-look' {
    if (score >= 75) return 'great';
    if (score >= 50) return 'good';
    return 'worth-a-look';
  }

  /**
   * Compute freshness label from a job's creation date.
   */
  private getFreshnessLabel(createdAt: Date | null): { freshness: 'just-posted' | 'this-week' | 'recent'; daysOld: number } {
    if (!createdAt) return { freshness: 'recent', daysOld: 15 };
    const daysOld = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOld <= 3) return { freshness: 'just-posted', daysOld };
    if (daysOld <= 7) return { freshness: 'this-week', daysOld };
    return { freshness: 'recent', daysOld };
  }

  /**
   * Fetch and score jobs for a candidate. Shared logic for both flat and sectioned responses.
   */
  private async fetchScoredJobs(candidateId: string): Promise<any[] | null> {
    const candidate = await this.getCandidateUser(candidateId);

    if (!candidate || !candidate.skills || candidate.skills.length === 0) {
      console.log(`Candidate ${candidateId} has no skills - returning empty (upload resume first)`);
      return null;
    }

    const jobPreferences = (candidate as any)?.jobPreferences || {};
    console.log(`Candidate skills: ${candidate.skills.join(', ')}`);

    const allJobs = await db
      .select()
      .from(jobPostings)
      .where(and(
        eq(jobPostings.status, 'active'),
        or(...candidate.skills.map(skill =>
          sql`${jobPostings.skills} @> jsonb_build_array(${skill}::text)`
        )),
        or(
          sql`${jobPostings.expiresAt} IS NULL`,
          sql`${jobPostings.expiresAt} > NOW()`
        ),
        or(
          eq(jobPostings.livenessStatus, 'active'),
          eq(jobPostings.livenessStatus, 'unknown')
        )
      ))
      .orderBy(
        sql`${jobPostings.trustScore} DESC NULLS LAST`,
        sql`${jobPostings.createdAt} DESC`
      )
      .limit(100);

    const jobsWithSource = allJobs.map((job: any) => ({
      ...job,
      requirements: Array.isArray(job.requirements) ? job.requirements : [],
      skills: Array.isArray(job.skills) ? job.skills : []
    }));

    console.log(`Found ${jobsWithSource.length} matching jobs (internal + external)`);

    const recommendations = jobsWithSource
      .map(job => {
        const matchingSkills = candidate.skills.filter(skill =>
          job.skills && job.skills.includes(skill)
        );
        const skillMatchPercentage = matchingSkills.length > 0
          ? Math.round((matchingSkills.length / Math.max(candidate.skills.length, 1)) * 100)
          : 0;

        const { freshness, daysOld } = this.getFreshnessLabel(job.createdAt);

        return {
          ...job,
          matchScore: skillMatchPercentage,
          matchTier: this.getMatchTier(skillMatchPercentage),
          skillMatches: matchingSkills,
          aiExplanation: `${matchingSkills.length} skill matches: ${matchingSkills.join(', ')}`,
          isVerifiedActive: job.livenessStatus === 'active' && job.trustScore >= 90,
          isDirectFromCompany: job.trustScore >= 85,
          freshness,
          daysOld,
        };
      })
      .filter(job => job.matchScore >= 40) // 40% minimum threshold
      .filter(job => {
        if (jobPreferences.salaryMin || jobPreferences.salaryMax) {
          const jobSalaryMin = job.salaryMin || 0;
          const jobSalaryMax = job.salaryMax || 999999;
          if (jobPreferences.salaryMin && jobSalaryMax < jobPreferences.salaryMin) return false;
          if (jobPreferences.salaryMax && jobSalaryMin > jobPreferences.salaryMax) return false;
        }
        if (jobPreferences.companySizes && jobPreferences.companySizes.length > 0) {
          const jobWorkType = job.workType?.toLowerCase();
          const preferredWorkTypes = jobPreferences.companySizes.map((t: string) => t.toLowerCase());
          if (jobWorkType && !preferredWorkTypes.includes(jobWorkType)) return false;
        }
        if (jobPreferences.industries && jobPreferences.industries.length > 0) {
          const jobIndustry = job.industry?.toLowerCase();
          const preferredIndustries = jobPreferences.industries.map((i: string) => i.toLowerCase());
          if (jobIndustry && !preferredIndustries.some(ind => jobIndustry.includes(ind))) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
        return (b.trustScore || 0) - (a.trustScore || 0);
      });

    console.log(`After filtering (40%+ match): ${recommendations.length} recommendations`);
    return recommendations;
  }

  /**
   * Get job recommendations as a flat array (backward-compatible for /api/ai-matches).
   */
  async getJobRecommendations(candidateId: string): Promise<any[]> {
    try {
      const recommendations = await this.fetchScoredJobs(candidateId);
      if (!recommendations) return [];
      console.log(`Returning ${Math.min(recommendations.length, 20)} job recommendations`);
      return recommendations.slice(0, 20);
    } catch (error) {
      console.error('Error fetching job recommendations:', error);
      throw error;
    }
  }

  /**
   * Get job recommendations split into two sections:
   *   - applyAndKnowToday: Internal (platform) jobs with exam/chat metadata
   *   - matchedForYou: External jobs with freshness/source metadata
   *
   * Used by the two-section discovery endpoint.
   */
  async getJobRecommendationsSectioned(candidateId: string): Promise<{
    applyAndKnowToday: any[];
    matchedForYou: any[];
  }> {
    try {
      const recommendations = await this.fetchScoredJobs(candidateId);
      if (!recommendations) return { applyAndKnowToday: [], matchedForYou: [] };

      const applyAndKnowToday = recommendations
        .filter(job => job.source === 'platform' || !job.externalUrl);

      const matchedForYou = recommendations
        .filter(job => job.source !== 'platform' && job.externalUrl)
        .slice(0, 20);

      console.log(`Sectioned: ${applyAndKnowToday.length} internal, ${matchedForYou.length} external`);
      return { applyAndKnowToday, matchedForYou };
    } catch (error) {
      console.error('Error fetching sectioned job recommendations:', error);
      throw error;
    }
  }

  async findMatchingCandidates(jobId: number): Promise<any[]> {
    try {
      const job = await this.getJobPosting(jobId);
      if (!job || !job.skills || job.skills.length === 0) {
        return [];
      }

      // 1. Fetch candidates with overlapping skills
      const candidates = await db
        .select()
        .from(candidateProfiles)
        .innerJoin(users, eq(candidateProfiles.userId, users.id))
        .where(
          or(...job.skills.map(skill => sql`${candidateProfiles.skills} @> ARRAY[${skill}]::text[]`))
        )
        .limit(50);

      // 2. Score them using AI engine
      const { generateJobMatch } = await import("./ai-service");
      const matches = [];

      for (const { candidate_profiles: profile, users: user } of candidates as any) {
        const match = await generateJobMatch(profile, job);
        if (match.score > 0.4) {
          matches.push({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
            skills: profile.skills,
            experience: profile.experience,
            matchScore: Math.round(match.score * 100),
            aiExplanation: match.aiExplanation,
            skillMatches: match.skillMatches
          });
        }
      }

      // 3. Sort by score
      matches.sort((a, b) => b.matchScore - a.matchScore);
      return matches.slice(0, 20);
    } catch (error) {
      console.error('Error finding matching candidates:', error);
      throw error;
    }
  }

  async updateJobPosting(id: number, talentOwnerId: string, updates: Partial<InsertJobPosting>): Promise<JobPosting> {
    try {
      const updateData = { ...updates, updatedAt: new Date() };
      const [job] = await db
        .update(jobPostings)
        .set(updateData as any)
        .where(and(eq(jobPostings.id, id), eq(jobPostings.talentOwnerId, talentOwnerId)))
        .returning();
      return job;
    } catch (error) {
      console.error('Error updating job posting:', error);
      throw error;
    }
  }

  async deleteJobPosting(id: number, talentOwnerId: string): Promise<void> {
    try {
      await db
        .delete(jobPostings)
        .where(and(eq(jobPostings.id, id), eq(jobPostings.talentOwnerId, talentOwnerId)));
    } catch (error) {
      console.error('Error deleting job posting:', error);
      throw error;
    }
  }



  // Matching operations
  async createJobMatch(match: InsertJobMatch): Promise<JobMatch> {
    try {
      const [result] = await db.insert(jobMatches).values({
        ...match,
        matchReasons: match.matchReasons || [],
        skillMatches: match.skillMatches || []
      }).returning();
      return result;
    } catch (error) {
      console.error('Error creating job match:', error);
      throw error;
    }
  }

  async getMatchesForCandidate(candidateId: string): Promise<(JobMatch & { job: JobPosting; talentOwner: User })[]> {
    try {
      const results = await db
        .select({
          // Job match fields
          id: jobMatches.id,
          jobId: jobMatches.jobId,
          candidateId: jobMatches.candidateId,
          matchScore: jobMatches.matchScore,
          matchReasons: jobMatches.matchReasons,
          status: jobMatches.status,
          createdAt: jobMatches.createdAt,
          updatedAt: jobMatches.updatedAt,
          confidenceLevel: jobMatches.confidenceLevel,
          skillMatches: jobMatches.skillMatches,
          aiExplanation: jobMatches.aiExplanation,
          userFeedback: jobMatches.userFeedback,
          feedbackReason: jobMatches.feedbackReason,
          viewedAt: jobMatches.viewedAt,
          appliedAt: jobMatches.appliedAt,
          // Job fields
          job: {
            id: jobPostings.id,
            title: jobPostings.title,
            company: jobPostings.company,
            description: jobPostings.description,
            location: jobPostings.location,
            workType: jobPostings.workType,
            salaryMin: jobPostings.salaryMin,
            salaryMax: jobPostings.salaryMax,
            requirements: jobPostings.requirements,
            skills: jobPostings.skills,
            hasExam: jobPostings.hasExam,
            source: jobPostings.source,
            examPassingScore: jobPostings.examPassingScore,
            talentOwnerId: jobPostings.talentOwnerId
          },
          // Talent owner fields
          talentOwner: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(jobMatches)
        .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
        .innerJoin(users, eq(jobPostings.talentOwnerId, users.id))
        .where(eq(jobMatches.candidateId, candidateId))
        .orderBy(desc(jobMatches.createdAt));

      return results as any;
    } catch (error) {
      console.error('Error fetching matches for candidate:', error);
      throw error;
    }
  }

  async getMatchesForJob(jobId: number): Promise<(JobMatch & { candidate: User; candidateProfile?: CandidateProfile })[]> {
    try {
      const matches = await db
        .select()
        .from(jobMatches)
        .innerJoin(users, eq(jobMatches.candidateId, users.id))
        .leftJoin(candidateProfiles, eq(jobMatches.candidateId, candidateProfiles.userId))
        .where(eq(jobMatches.jobId, jobId));

      return matches.map((m: any) => ({
        ...m.job_matches,
        candidate: m.users,
        candidateProfile: m.candidate_profiles
      }));
    } catch (error) {
      console.error('Error fetching matches for job:', error);
      throw error;
    }
  }

  async updateMatchStatus(matchId: number, status: string): Promise<JobMatch> {
    try {
      const [match] = await db
        .update(jobMatches)
        .set({ status: status as any, updatedAt: new Date() })
        .where(eq(jobMatches.id, matchId))
        .returning();
      return match;
    } catch (error) {
      console.error('Error updating match status:', error);
      throw error;
    }
  }

  async clearJobMatches(jobId: number): Promise<void> {
    try {
      await db
        .delete(jobMatches)
        .where(eq(jobMatches.jobId, jobId));
    } catch (error) {
      console.error('Error clearing job matches:', error);
      throw error;
    }
  }

  async updateJobMatchStatus(candidateId: string, jobId: number, status: string): Promise<void> {
    try {
      await db
        .update(jobMatches)
        .set({ status: status as any, updatedAt: new Date() })
        .where(and(eq(jobMatches.candidateId, candidateId), eq(jobMatches.jobId, jobId)));
    } catch (error) {
      console.error('Error updating job match status:', error);
      throw error;
    }
  }

  async getJobExam(jobId: number): Promise<any> {
    try {
      const [exam] = await db
        .select()
        .from(jobExams)
        .where(eq(jobExams.jobId, jobId));
      return exam;
    } catch (error) {
      console.error('Error fetching job exam:', error);
      throw error;
    }
  }

  async storeExamResult(result: any): Promise<void> {
    try {
      // First get the exam ID for this job
      const [exam] = await db.select().from(jobExams).where(eq(jobExams.jobId, result.jobId));
      if (!exam) {
        throw new Error('No exam found for this job');
      }

      await db.insert(examAttempts).values({
        examId: exam.id,
        candidateId: result.candidateId,
        jobId: result.jobId,
        score: result.score,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        timeSpent: result.timeSpent,
        answers: result.answers,
        status: 'completed',
        passedExam: result.score >= (exam.passingScore || 70),
        qualifiedForChat: false, // Will be set during ranking
        completedAt: new Date(),
      });
    } catch (error) {
      console.error('Error storing exam result:', error);
      throw error;
    }
  }

  // Chat operations
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    try {
      const [result] = await db.insert(chatMessages).values(message).returning();
      return result;
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw error;
    }
  }

  async getChatMessages(chatRoomId: number): Promise<(ChatMessage & { sender: User })[]> {
    try {
      return await db
        .select()
        .from(chatMessages)
        .innerJoin(users, eq(chatMessages.senderId, users.id))
        .where(eq(chatMessages.chatRoomId, chatRoomId))
        .orderBy(chatMessages.createdAt) as any;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw error;
    }
  }

  // Activity operations
  async createActivityLog(userId: string, type: string, description: string, metadata?: any): Promise<ActivityLog> {
    try {
      const [result] = await db
        .insert(activityLogs)
        .values({ userId, type, description, metadata })
        .returning();
      return result;
    } catch (error) {
      console.error('Error creating activity log:', error);
      throw error;
    }
  }

  async getActivityLogs(userId: string, limit = 10): Promise<ActivityLog[]> {
    try {
      return await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.userId, userId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      throw error;
    }
  }

  // Statistics and analytics
  async getCandidateStats(candidateId: string): Promise<any> {
    try {
      // Run all queries in parallel to avoid sequential DB round-trips (fixes Vercel 504 timeouts)
      const [applications, matches, profile, activeChats] = await Promise.all([
        db.select().from(jobApplications).where(eq(jobApplications.candidateId, candidateId)),
        db.select().from(jobMatches).where(eq(jobMatches.candidateId, candidateId)),
        this.getCandidateUser(candidateId),
        db.select().from(chatRooms).where(eq(chatRooms.candidateId, candidateId)),
      ]);

      return {
        newMatches: matches.filter(m => m.status === 'pending').length,
        profileViews: profile?.profileViews || 0,
        activeChats: activeChats.length,
        applicationsPending: applications.filter(a => a.status === 'submitted' || a.status === 'viewed').length,
        applicationsRejected: applications.filter(a => a.status === 'rejected').length,
        applicationsAccepted: applications.filter(a => a.status === 'offer').length,
      };
    } catch (error) {
      console.error('Error fetching candidate stats:', error);
      throw error;
    }
  }

  async getRecruiterStats(talentOwnerId: string): Promise<any> {
    try {
      const jobs = await db
        .select()
        .from(jobPostings)
        .where(eq(jobPostings.talentOwnerId, talentOwnerId));

      const jobIds = jobs.map(j => j.id);

      // Run dependent queries in parallel (fixes Vercel 504 timeouts)
      const [applications, matches, activeChats] = jobIds.length > 0
        ? await Promise.all([
            db.select().from(jobApplications).where(inArray(jobApplications.jobId, jobIds)),
            db.select().from(jobMatches).where(inArray(jobMatches.jobId, jobIds)),
            db.select().from(chatRooms).where(inArray(chatRooms.jobId, jobIds)),
          ])
        : [[], [], []];

      return {
        activeJobs: jobs.filter(j => j.status === 'active').length,
        totalMatches: matches.length,
        activeChats: activeChats.length,
        hires: applications.filter(a => a.status === 'offer').length,
        pendingApplications: applications.filter(a => a.status === 'submitted').length,
        viewedApplications: applications.filter(a => a.status === 'viewed').length,
      };
    } catch (error) {
      console.error('Error fetching recruiter stats:', error);
      throw error;
    }
  }

  async getCandidatesForRecruiter(talentOwnerId: string): Promise<any[]> {
    try {
      const jobs = await this.getJobPostings(talentOwnerId);
      const jobIds = jobs.map(j => j.id);

      if (jobIds.length === 0) {
        return [];
      }

      return await db
        .select({
          application: jobApplications,
          candidate: users,
          profile: candidateProfiles,
          job: jobPostings
        })
        .from(jobApplications)
        .innerJoin(users, eq(jobApplications.candidateId, users.id))
        .leftJoin(candidateProfiles, eq(jobApplications.candidateId, candidateProfiles.userId))
        .innerJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
        .where(inArray(jobApplications.jobId, jobIds))
        .orderBy(desc(jobApplications.createdAt));
    } catch (error) {
      console.error('Error fetching candidates for recruiter:', error);
      throw error;
    }
  }

  // Application operations
  async getApplicationsWithStatus(candidateId: string): Promise<any[]> {
    try {
      return await db
        .select({
          id: jobApplications.id,
          jobId: jobApplications.jobId,
          status: jobApplications.status,
          appliedAt: jobApplications.appliedAt,
          createdAt: jobApplications.createdAt,
          job: {
            id: jobPostings.id,
            title: jobPostings.title,
            company: jobPostings.company,
            location: jobPostings.location,
            workType: jobPostings.workType,
          }
        })
        .from(jobApplications)
        .innerJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
        .where(eq(jobApplications.candidateId, candidateId))
        .orderBy(desc(jobApplications.createdAt));
    } catch (error) {
      console.error('Error fetching applications with status:', error);
      throw error;
    }
  }

  async getApplicantsForJob(jobId: number, talentOwnerId: string): Promise<any[]> {
    try {
      // First, verify ownership of the job posting
      const [job] = await db
        .select()
        .from(jobPostings)
        .where(and(eq(jobPostings.id, jobId), eq(jobPostings.talentOwnerId, talentOwnerId)));

      if (!job) {
        console.warn(`[storage] Unauthorized attempt to access applicants for job ${jobId} by user ${talentOwnerId}`);
        return []; // Return empty array if user does not own the job
      }

      // If ownership is confirmed, fetch applicants
      return await db
        .select({
          applicationId: jobApplications.id,
          status: jobApplications.status,
          appliedAt: jobApplications.appliedAt,
          candidate: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
          profile: {
            skills: candidateProfiles.skills,
            experience: candidateProfiles.experience,
            resumeUrl: candidateProfiles.resumeUrl,
          },
          match: {
            matchScore: jobMatches.matchScore,
            aiExplanation: jobMatches.aiExplanation,
          }
        })
        .from(jobApplications)
        .innerJoin(users, eq(jobApplications.candidateId, users.id))
        .leftJoin(candidateProfiles, eq(jobApplications.candidateId, candidateProfiles.userId))
        .leftJoin(jobMatches, and(
          eq(jobMatches.candidateId, jobApplications.candidateId),
          eq(jobMatches.jobId, jobApplications.jobId)
        ))
        .where(eq(jobApplications.jobId, jobId))
        .orderBy(desc(jobApplications.appliedAt));
    } catch (error) {
      console.error(`Error fetching applicants for job ${jobId}:`, error);
      throw error;
    }
  }

  async updateApplicationStatus(applicationId: number, status: string, talentOwnerId: string): Promise<any> {
    try {
      // Verify that the talent owner has permission to update this application
      const [application] = await db
        .select({
          jobOwnerId: jobPostings.talentOwnerId
        })
        .from(jobApplications)
        .innerJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
        .where(eq(jobApplications.id, applicationId));

      if (!application || application.jobOwnerId !== talentOwnerId) {
        throw new Error("Unauthorized: You do not have permission to update this application.");
      }

      const [updatedApplication] = await db
        .update(jobApplications)
        .set({
          status: status as any,
          updatedAt: new Date(),
        })
        .where(eq(jobApplications.id, applicationId))
        .returning();
      return updatedApplication;
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  }

  async getApplicationByJobAndCandidate(jobId: number, candidateId: string): Promise<any> {
    try {
      const [application] = await db
        .select()
        .from(jobApplications)
        .where(and(
          eq(jobApplications.jobId, jobId),
          eq(jobApplications.candidateId, candidateId)
        ));
      return application;
    } catch (error) {
      console.error('Error fetching application by job and candidate:', error);
      throw error;
    }
  }

  async createJobApplication(application: any): Promise<any> {
    try {
      const [result] = await db
        .insert(jobApplications)
        .values(application)
        .returning();
      return result;
    } catch (error) {
      console.error('Error creating job application:', error);
      throw error;
    }
  }

  // Notification operations
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    try {
      const [prefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId));
      return prefs;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  async updateNotificationPreferences(userId: string, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences> {
    try {
      const [result] = await db
        .insert(notificationPreferences)
        .values({ userId, ...preferences })
        .onConflictDoUpdate({
          target: notificationPreferences.userId,
          set: { ...preferences, updatedAt: new Date() },
        })
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  async getNotifications(userId: string): Promise<any[]> {
    try {
      return await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: number, userId: string): Promise<void> {
    try {
      const result = await db
        .update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ));
      console.log(`Mark notification ${notificationId} as read for user ${userId}, result:`, result);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const result = await db
        .update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        ));
      console.log('Mark all notifications as read result:', result);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Exam operations
  async createJobExam(exam: any): Promise<any> {
    try {
      const [result] = await db.insert(jobExams).values(exam).returning();
      return result;
    } catch (error) {
      console.error('Error creating job exam:', error);
      throw error;
    }
  }

  async createExamAttempt(attempt: any): Promise<any> {
    try {
      const [result] = await db.insert(examAttempts).values(attempt).returning();
      return result;
    } catch (error) {
      console.error('Error creating exam attempt:', error);
      throw error;
    }
  }

  async updateExamAttempt(attemptId: number, data: any): Promise<any> {
    try {
      const [result] = await db
        .update(examAttempts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(examAttempts.id, attemptId))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating exam attempt:', error);
      throw error;
    }
  }

  async getExamAttempts(jobId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(examAttempts)
        .where(eq(examAttempts.jobId, jobId))
        .orderBy(desc(examAttempts.createdAt));
    } catch (error) {
      console.error('Error fetching exam attempts:', error);
      throw error;
    }
  }

  async rankCandidatesByExamScore(jobId: number): Promise<void> {
    try {
      const job = await this.getJobPosting(jobId);
      if (!job || !job.maxChatCandidates) return;

      const attempts = await db
        .select()
        .from(examAttempts)
        .where(and(
          eq(examAttempts.jobId, jobId),
          eq(examAttempts.status, 'completed'),
          eq(examAttempts.passedExam, true)
        ))
        .orderBy(desc(examAttempts.score));

      // Update rankings and grant chat access to top candidates
      for (let i = 0; i < attempts.length; i++) {
        const ranking = i + 1;
        const qualifiedForChat = ranking <= job.maxChatCandidates;

        await db
          .update(examAttempts)
          .set({
            ranking,
            qualifiedForChat,
            updatedAt: new Date()
          })
          .where(eq(examAttempts.id, attempts[i].id));

        // Grant chat access to top candidates
        if (qualifiedForChat && job.hiringManagerId) {
          await this.grantChatAccess(jobId, attempts[i].candidateId, attempts[i].id, ranking);
        }
      }
    } catch (error) {
      console.error('Error ranking candidates by exam score:', error);
      throw error;
    }
  }

  // Chat room operations
  async getChatRoom(jobId: number, candidateId: string): Promise<ChatRoom | undefined> {
    try {
      const [room] = await db
        .select()
        .from(chatRooms)
        .where(and(
          eq(chatRooms.jobId, jobId),
          eq(chatRooms.candidateId, candidateId)
        ));
      return room;
    } catch (error) {
      console.error('Error fetching chat room:', error);
      throw error;
    }
  }

  async createChatRoom(data: any): Promise<ChatRoom> {
    try {
      const [room] = await db
        .insert(chatRooms)
        .values({
          jobId: data.jobId,
          candidateId: data.candidateId,
          hiringManagerId: data.hiringManagerId,
          examAttemptId: data.examAttemptId,
          candidateRanking: data.ranking,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return room;
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  async getChatRoomsForUser(userId: string): Promise<(ChatRoom & { job: JobPosting; hiringManager: User })[]> {
    try {
      const rooms = await db
        .select()
        .from(chatRooms)
        .where(or(
          eq(chatRooms.candidateId, userId),
          eq(chatRooms.hiringManagerId, userId)
        ))
        .orderBy(desc(chatRooms.createdAt));

      const enrichedRooms = [];
      for (const room of rooms) {
        const job = await this.getJobPosting(room.jobId);
        const hiringManager = await this.getUser(room.hiringManagerId);

        if (job && hiringManager) {
          enrichedRooms.push({
            ...room,
            job,
            hiringManager
          });
        }
      }

      return enrichedRooms;
    } catch (error) {
      console.error('Error fetching chat rooms for user:', error);
      throw error;
    }
  }

  async grantChatAccess(jobId: number, candidateId: string, examAttemptId: number, ranking: number): Promise<ChatRoom> {
    try {
      const job = await this.getJobPosting(jobId);
      if (!job || !job.hiringManagerId) {
        throw new Error('Job or hiring manager not found');
      }

      const room = await this.createChatRoom({
        jobId,
        candidateId,
        hiringManagerId: job.hiringManagerId,
        examAttemptId,
        ranking
      });

      // Create notification for chat access
      await this.createNotification({
        userId: candidateId,
        type: 'chat_access_granted',
        message: `You now have chat access for ${job.title}`,
        metadata: { jobId, ranking }
      });

      return room;
    } catch (error) {
      console.error('Error granting chat access:', error);
      throw error;
    }
  }

  async createNotification(notification: any): Promise<any> {
    try {
      const [result] = await db.insert(notifications).values({
        ...notification,
        read: false,
        createdAt: new Date()
      }).returning();
      return result;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Enhanced candidate operations
  async getApplicationsForCandidate(candidateId: string): Promise<any[]> {
    try {
      return await db
        .select()
        .from(jobApplications)
        .where(eq(jobApplications.candidateId, candidateId))
        .orderBy(desc(jobApplications.createdAt));
    } catch (error) {
      console.error('Error fetching applications for candidate:', error);
      return [];
    }
  }

  async getActivityForCandidate(candidateId: string): Promise<any[]> {
    try {
      return await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.userId, candidateId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(50);
    } catch (error) {
      console.error('Error fetching activity for candidate:', error);
      return [];
    }
  }





  async getAvailableNotificationUsers(): Promise<string[]> {
    const result = await db.selectDistinct({ userId: notifications.userId }).from(notifications);
    return result.map(r => r.userId);
  }

  // Application Intelligence operations (Revolutionary feedback system)
  async getApplicationById(applicationId: number): Promise<any> {
    try {
      const [application] = await db
        .select()
        .from(jobApplications)
        .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
        .where(eq(jobApplications.id, applicationId));

      return application ? {
        ...(application as any).job_applications,
        job: (application as any).job_postings
      } : undefined;
    } catch (error) {
      console.error('Error fetching application by ID:', error);
      throw error;
    }
  }

  async createApplicationEvent(event: any): Promise<any> {
    try {
      // Import the applicationEvents table from schema
      const { applicationEvents } = await import("@shared/schema");

      const [result] = await db.insert(applicationEvents).values({
        applicationId: event.applicationId,
        eventType: event.eventType,
        actorRole: event.actorRole,
        actorName: event.actorName,
        actorTitle: event.actorTitle,
        viewDuration: event.viewDuration,
        candidateScore: event.candidateScore,
        candidateRanking: event.candidateRanking,
        totalApplicants: event.totalApplicants,
        feedback: event.feedback,
        nextSteps: event.nextSteps,
        competitorUser: event.competitorUser,
        visible: event.visible ?? true
      }).returning();

      return result;
    } catch (error) {
      console.error('Error creating application event:', error);
      throw error;
    }
  }

  async getApplicationEvents(applicationId: number): Promise<any[]> {
    try {
      const { applicationEvents } = await import("@shared/schema");

      return await db
        .select()
        .from(applicationEvents)
        .where(eq(applicationEvents.applicationId, applicationId))
        .orderBy(desc(applicationEvents.createdAt));
    } catch (error) {
      console.error('Error fetching application events:', error);
      return [];
    }
  }

  async getApplicationInsights(applicationId: number): Promise<any> {
    try {
      const { applicationInsights } = await import("@shared/schema");

      const [insights] = await db
        .select()
        .from(applicationInsights)
        .where(eq(applicationInsights.applicationId, applicationId))
        .orderBy(desc(applicationInsights.createdAt))
        .limit(1);

      return insights;
    } catch (error) {
      console.error('Error fetching application insights:', error);
      return null;
    }
  }

  async createApplicationInsights(insights: any): Promise<any> {
    try {
      const { applicationInsights } = await import("@shared/schema");

      const [result] = await db.insert(applicationInsights).values({
        candidateId: insights.candidateId,
        applicationId: insights.applicationId,
        strengthsIdentified: insights.strengthsIdentified,
        improvementAreas: insights.improvementAreas,
        benchmarkViewTime: insights.benchmarkViewTime,
        actualViewTime: insights.actualViewTime,
        benchmarkScore: insights.benchmarkScore,
        actualScore: insights.actualScore,
        similarSuccessfulUsers: insights.similarSuccessfulUsers,
        recommendedActions: insights.recommendedActions,
        successProbability: insights.successProbability,
        supportiveMessage: insights.supportiveMessage
      }).returning();

      return result;
    } catch (error) {
      console.error('Error creating application insights:', error);
      throw error;
    }
  }

  async getApplicationsForTalent(talentId: string): Promise<any[]> {
    try {
      // Get all applications for jobs owned by this talent
      const results = await db
        .select({
          application: jobApplications,
          candidate: candidateProfiles,
          job: jobPostings,
          user: users
        })
        .from(jobApplications)
        .leftJoin(candidateProfiles, eq(jobApplications.candidateId, candidateProfiles.userId))
        .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
        .leftJoin(users, eq(candidateProfiles.userId, users.id))
        .where(eq(jobPostings.talentOwnerId, talentId));

      return results.map(({ application, candidate, job, user }) => ({
        id: application.id.toString(),
        candidateId: user?.id,
        jobId: job?.id,
        candidateName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email?.split('@')[0] || 'Unknown',
        candidateEmail: user?.email,
        jobTitle: job?.title,
        appliedAt: application.appliedAt?.toISOString(),
        status: application.status,
        matchScore: candidate?.matchScore || 0,
        skills: candidate?.skills || [],
        experience: candidate?.experience || '',
        location: candidate?.location || '',
        resumeUrl: candidate?.resumeUrl,
        // Intelligence data stored in application
        viewedAt: application.viewedAt?.toISOString(),
        viewDuration: application.viewDuration,
        ranking: application.ranking,
        totalApplicants: application.totalApplicants,
        feedback: application.feedback,
        rating: application.rating,
        nextSteps: application.nextSteps,
        transparencyLevel: application.transparencyLevel || 'partial'
      }));
    } catch (error) {
      console.error('Error getting applications for talent:', error);
      throw error;
    }
  }

  async updateTalentTransparencySettings(talentId: string, settings: any): Promise<any> {
    try {
      // Store talent transparency preferences in user profile
      const [result] = await db
        .update(users)
        .set({
          transparencySettings: JSON.stringify(settings),
          updatedAt: new Date()
        })
        .where(eq(users.id, talentId))
        .returning();

      return result;
    } catch (error) {
      console.error('Error updating transparency settings:', error);
      throw error;
    }
  }

  async updateApplicationIntelligence(applicationId: number, updates: any): Promise<any> {
    try {
      const [result] = await db
        .update(jobApplications)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(jobApplications.id, applicationId))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating application intelligence:', error);
      throw error;
    }
  }

  // Interview operations
  async createInterview(interview: any): Promise<any> {
    try {
      const [result] = await db.insert(interviews).values({
        candidateId: interview.candidateId,
        interviewerId: interview.interviewerId,
        jobId: interview.jobId,
        applicationId: interview.applicationId,
        scheduledAt: new Date(interview.scheduledAt),
        duration: interview.duration || 60,
        platform: interview.platform || 'video',
        meetingLink: interview.meetingLink,
        notes: interview.notes,
        status: 'scheduled',
      }).returning();

      // Update application status to interview_scheduled
      await db
        .update(jobApplications)
        .set({
          status: 'interview_scheduled',
          interviewLink: interview.meetingLink,
          updatedAt: new Date()
        })
        .where(eq(jobApplications.id, interview.applicationId));

      return result;
    } catch (error) {
      console.error('Error creating interview:', error);
      throw error;
    }
  }

  // Screening questions operations
  async getScreeningQuestions(jobId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(screeningQuestions)
        .where(eq(screeningQuestions.jobId, jobId))
        .orderBy(screeningQuestions.sortOrder);
    } catch (error) {
      console.error('Error fetching screening questions:', error);
      throw error;
    }
  }

  async saveScreeningQuestions(jobId: number, questions: any[]): Promise<any[]> {
    try {
      // Delete existing questions for this job
      await db.delete(screeningQuestions).where(eq(screeningQuestions.jobId, jobId));

      // Insert new questions
      if (questions.length === 0) return [];

      const toInsert = questions.map((q, index) => ({
        jobId,
        question: q.question,
        questionType: q.questionType || 'text',
        options: q.options || [],
        isRequired: q.isRequired ?? true,
        sortOrder: index,
      }));

      const result = await db
        .insert(screeningQuestions)
        .values(toInsert)
        .returning();

      return result;
    } catch (error) {
      console.error('Error saving screening questions:', error);
      throw error;
    }
  }

  async saveScreeningAnswers(applicationId: number, answers: any[]): Promise<any[]> {
    try {
      const results = [];
      for (const answer of answers) {
        const [result] = await db
          .insert(screeningAnswers)
          .values({
            applicationId,
            questionId: answer.questionId,
            answer: answer.answer,
          })
          .onConflictDoUpdate({
            target: [screeningAnswers.applicationId, screeningAnswers.questionId],
            set: { answer: answer.answer },
          })
          .returning();
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('Error saving screening answers:', error);
      throw error;
    }
  }

}

export const storage = new DatabaseStorage();

