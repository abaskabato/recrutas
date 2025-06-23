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
  type User,
  type UpsertUser,
  type CandidateProfile,
  type InsertCandidateProfile,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, gte, lte, inArray, sql, isNull, isNotNull } from "drizzle-orm";

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
  updateUserProfile(userId: string, userData: Partial<UpsertUser>): Promise<User>;
  updateUserRole(userId: string, role: 'candidate' | 'talent_owner'): Promise<User>;
  
  // Candidate operations
  getCandidateProfile(userId: string): Promise<CandidateProfile | undefined>;
  upsertCandidateProfile(profile: InsertCandidateProfile): Promise<CandidateProfile>;
  getAllCandidateProfiles(): Promise<CandidateProfile[]>;
  
  // Job operations
  createJobPosting(job: InsertJobPosting): Promise<JobPosting>;
  getJobPostings(recruiterId: string): Promise<JobPosting[]>;
  getJobPosting(id: number): Promise<JobPosting | undefined>;
  updateJobPosting(id: number, talentOwnerId: string, updates: Partial<InsertJobPosting>): Promise<JobPosting>;
  deleteJobPosting(id: number, talentOwnerId: string): Promise<void>;
  
  // Matching operations
  createJobMatch(match: InsertJobMatch): Promise<JobMatch>;
  getMatchesForCandidate(candidateId: string): Promise<(JobMatch & { job: JobPosting; talentOwner: User })[]>;
  getMatchesForJob(jobId: number): Promise<(JobMatch & { candidate: User; candidateProfile?: CandidateProfile })[]>;
  updateMatchStatus(matchId: number, status: string): Promise<JobMatch>;
  clearJobMatches(jobId: number): Promise<void>;
  
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
  updateApplicationStatus(applicationId: number, status: string, data?: any): Promise<any>;
  getApplicationByJobAndCandidate(jobId: number, candidateId: string): Promise<any>;
  createJobApplication(application: any): Promise<any>;
  
  // Statistics
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
  createOrUpdateCandidateProfile(userId: string, profileData: any): Promise<any>;
  updateUserInfo(userId: string, userInfo: any): Promise<any>;
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
      const [user] = await db.select().from(users).where(eq(users.id, id));
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
      const [user] = await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, userData: Partial<UpsertUser>): Promise<User> {
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
  async getCandidateProfile(userId: string): Promise<CandidateProfile | undefined> {
    try {
      const [profile] = await db
        .select()
        .from(candidateProfiles)
        .where(eq(candidateProfiles.userId, userId));
      return profile;
    } catch (error) {
      console.error('Error fetching candidate profile:', error);
      throw error;
    }
  }

  async upsertCandidateProfile(profile: InsertCandidateProfile): Promise<CandidateProfile> {
    try {
      const [result] = await db
        .insert(candidateProfiles)
        .values({
          ...profile,
          skills: profile.skills || [],
          updatedAt: new Date()
        })
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

  async getAllCandidateProfiles(): Promise<CandidateProfile[]> {
    try {
      return await db.select().from(candidateProfiles);
    } catch (error) {
      console.error('Error fetching all candidate profiles:', error);
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

  async updateJobPosting(id: number, talentOwnerId: string, updates: Partial<InsertJobPosting>): Promise<JobPosting> {
    try {
      const updateData = { ...updates, updatedAt: new Date() };
      if (updateData.skills) {
        updateData.skills = updateData.skills;
      }
      const [job] = await db
        .update(jobPostings)
        .set(updateData)
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
      // Use raw SQL to handle cascading deletions properly
      await db.execute(sql`
        DO $$
        DECLARE
            match_record RECORD;
            room_record RECORD;
        BEGIN
            -- Delete chat messages for chat rooms related to job matches
            FOR match_record IN SELECT id FROM job_matches WHERE job_id = ${id}
            LOOP
                FOR room_record IN SELECT id FROM chat_rooms WHERE match_id = match_record.id
                LOOP
                    DELETE FROM chat_messages WHERE chat_room_id = room_record.id;
                END LOOP;
                DELETE FROM chat_rooms WHERE match_id = match_record.id;
            END LOOP;
            
            -- Delete job applications
            DELETE FROM job_applications WHERE job_id = ${id};
            
            -- Delete job matches
            DELETE FROM job_matches WHERE job_id = ${id};
            
            -- Delete exam attempts
            DELETE FROM exam_attempts WHERE job_id = ${id};
            
            -- Delete job exams
            DELETE FROM job_exams WHERE job_id = ${id};
            
            -- Finally delete the job posting
            DELETE FROM job_postings WHERE id = ${id} AND talent_owner_id = ${talentOwnerId};
        END $$;
      `);
    } catch (error) {
      console.error('Error deleting job posting:', error);
      throw error;
    }
  }

  // Matching operations
  async createJobMatch(match: InsertJobMatch): Promise<JobMatch> {
    try {
      const insertData = {
        jobId: match.jobId,
        candidateId: match.candidateId,
        matchScore: match.matchScore,
        confidenceLevel: match.confidenceLevel,
        aiExplanation: match.aiExplanation,
        status: match.status || 'pending',
        appliedAt: match.status === 'applied' ? new Date() : null
      };
      
      const [result] = await db.insert(jobMatches).values(insertData).returning();
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
      return await db
        .select()
        .from(jobMatches)
        .innerJoin(users, eq(jobMatches.candidateId, users.id))
        .leftJoin(candidateProfiles, eq(jobMatches.candidateId, candidateProfiles.userId))
        .where(eq(jobMatches.jobId, jobId))
        .orderBy(desc(jobMatches.createdAt)) as any;
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
  async getCandidateStats(candidateId: string): Promise<{
    totalApplications: number;
    activeMatches: number;
    profileViews: number;
    profileStrength: number;
    responseRate: number;
    avgMatchScore: number;
  }> {
    try {
      const applications = await db
        .select()
        .from(jobApplications)
        .where(eq(jobApplications.candidateId, candidateId));

      const matches = await db
        .select()
        .from(jobMatches)
        .where(eq(jobMatches.candidateId, candidateId));

      return {
        totalApplications: applications.length,
        activeMatches: matches.filter(m => m.status === 'pending' || m.status === 'viewed').length,
        profileViews: 0, // Would need to implement view tracking
        profileStrength: 75, // Would calculate based on profile completeness
        responseRate: 0.8, // Would calculate from actual data
        avgMatchScore: matches.reduce((acc, m) => acc + parseFloat(m.matchScore || '0'), 0) / matches.length || 0
      };
    } catch (error) {
      console.error('Error fetching candidate stats:', error);
      throw error;
    }
  }

  async getRecruiterStats(talentOwnerId: string): Promise<{
    activeJobs: number;
    totalMatches: number;
    activeChats: number;
    hires: number;
  }> {
    try {
      const jobs = await db
        .select()
        .from(jobPostings)
        .where(eq(jobPostings.talentOwnerId, talentOwnerId));

      const matches = await db
        .select()
        .from(jobMatches)
        .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
        .where(eq(jobPostings.talentOwnerId, talentOwnerId));

      return {
        activeJobs: jobs.filter(j => j.status === 'active').length,
        totalMatches: matches.length,
        activeChats: 0, // Would count active chat rooms
        hires: 0 // Would count hired candidates
      };
    } catch (error) {
      console.error('Error fetching recruiter stats:', error);
      throw error;
    }
  }

  async getCandidatesForRecruiter(talentOwnerId: string): Promise<any[]> {
    try {
      return await db
        .select({
          candidate: users,
          profile: candidateProfiles,
          match: jobMatches,
          job: jobPostings
        })
        .from(jobMatches)
        .innerJoin(users, eq(jobMatches.candidateId, users.id))
        .leftJoin(candidateProfiles, eq(users.id, candidateProfiles.userId))
        .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
        .where(eq(jobPostings.talentOwnerId, talentOwnerId))
        .orderBy(desc(jobMatches.createdAt));
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

  async updateApplicationStatus(applicationId: number, status: string, data?: any): Promise<any> {
    try {
      const [application] = await db
        .update(jobApplications)
        .set({ 
          status: status as any, 
          updatedAt: new Date(),
          ...(data || {})
        })
        .where(eq(jobApplications.id, applicationId))
        .returning();
      return application;
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

  async createOrUpdateCandidateProfile(userId: string, profileData: any): Promise<CandidateProfile> {
    try {
      return await this.upsertCandidateProfile({ userId, ...profileData });
    } catch (error) {
      console.error('Error creating/updating candidate profile:', error);
      throw error;
    }
  }

  async updateUserInfo(userId: string, userData: any): Promise<User> {
    try {
      return await this.updateUserProfile(userId, userData);
    } catch (error) {
      console.error('Error updating user info:', error);
      throw error;
    }
  }

  async getAvailableNotificationUsers(): Promise<string[]> {
    const result = await db.selectDistinct({ userId: notifications.userId }).from(notifications);
    return result.map(r => r.userId);
  }

  async getActiveCandidates(): Promise<any[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const activeCandidates = await db
        .select({ userId: users.id })
        .from(users)
        .innerJoin(activityLogs, eq(users.id, activityLogs.userId))
        .where(gte(activityLogs.createdAt, sevenDaysAgo))
        .groupBy(users.id)
        .limit(50);

      return activeCandidates;
    } catch (error) {
      console.error('Error fetching active candidates:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();