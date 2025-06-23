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
  jobApplications,
  chatRooms,
  chatMessages,
  activityLogs,
  notificationPreferences,
  jobExams,
  examAttempts,
  notifications,
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
  type InsertNotificationPreferences,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, count } from "drizzle-orm";

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
    newMatches: number;
    profileViews: number;
    activeChats: number;
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
  
  // Enhanced candidate operations
  getCandidateStats(candidateId: string): Promise<{
    totalApplications: number;
    activeMatches: number;
    profileViews: number;
    profileStrength: number;
    responseRate: number;
    avgMatchScore: number;
  }>;
  getMatchesForCandidate(candidateId: string): Promise<any[]>;
  getApplicationsForCandidate(candidateId: string): Promise<any[]>;
  getActivityForCandidate(candidateId: string): Promise<any[]>;
  createOrUpdateCandidateProfile(userId: string, profileData: any): Promise<any>;
  updateUserInfo(userId: string, userInfo: any): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: 'candidate' | 'talent_owner'): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserProfile(userId: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        ...userData, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Candidate operations
  async getCandidateProfile(userId: string): Promise<CandidateProfile | undefined> {
    const [profile] = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, userId));
    return profile;
  }

  async upsertCandidateProfile(profile: InsertCandidateProfile): Promise<CandidateProfile> {
    // Check if profile exists first
    const existing = await this.getCandidateProfile(profile.userId);
    
    if (existing) {
      // Update existing profile
      const [result] = await db
        .update(candidateProfiles)
        .set({
          ...profile,
          updatedAt: new Date(),
        } as any)
        .where(eq(candidateProfiles.userId, profile.userId))
        .returning();
      return result;
    } else {
      // Create new profile
      const [result] = await db
        .insert(candidateProfiles)
        .values(profile as any)
        .returning();
      return result;
    }
  }

  async getAllCandidateProfiles(): Promise<CandidateProfile[]> {
    return await db
      .select()
      .from(candidateProfiles);
  }

  // Job operations
  async createJobPosting(job: InsertJobPosting): Promise<JobPosting> {
    const [result] = await db.insert(jobPostings).values(job as any).returning();
    return result;
  }

  async getJobPostings(talentOwnerId: string): Promise<JobPosting[]> {
    if (!talentOwnerId) {
      // Return all job postings if no specific owner requested
      return await db
        .select()
        .from(jobPostings)
        .orderBy(desc(jobPostings.createdAt))
        .limit(10);
    }
    
    return await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.talentOwnerId, talentOwnerId))
      .orderBy(desc(jobPostings.createdAt));
  }

  async getJobPosting(id: number): Promise<JobPosting | undefined> {
    const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
    return job;
  }

  async updateJobPosting(id: number, talentOwnerId: string, updates: Partial<InsertJobPosting>): Promise<JobPosting> {
    const [result] = await db
      .update(jobPostings)
      .set({ ...updates as any, updatedAt: new Date() })
      .where(and(eq(jobPostings.id, id), eq(jobPostings.talentOwnerId, talentOwnerId)))
      .returning();
    
    if (!result) {
      throw new Error('Job posting not found or unauthorized');
    }
    
    return result;
  }

  async deleteJobPosting(id: number, talentOwnerId: string): Promise<void> {
    const result = await db
      .delete(jobPostings)
      .where(and(eq(jobPostings.id, id), eq(jobPostings.talentOwnerId, talentOwnerId)))
      .returning();
    
    if (!result.length) {
      throw new Error('Job posting not found or unauthorized');
    }
  }

  // Matching operations
  async createJobMatch(match: InsertJobMatch): Promise<JobMatch> {
    const [result] = await db.insert(jobMatches).values(match as any).returning();
    return result;
  }

  async getMatchesForCandidate(candidateId: string): Promise<(JobMatch & { job: JobPosting; talentOwner: User })[]> {
    try {
      // Get existing database matches
      const matches = await db
        .select()
        .from(jobMatches)
        .where(eq(jobMatches.candidateId, candidateId))
        .orderBy(desc(jobMatches.createdAt));
      
      const enrichedMatches = [];
      
      // Process existing database matches
      for (const match of matches) {
        if (!match || !match.jobId) continue;
        
        try {
          const job = await db
            .select()
            .from(jobPostings)
            .where(eq(jobPostings.id, match.jobId))
            .limit(1);
            
          if (!job || job.length === 0) continue;
          
          const talentOwner = await db
            .select()
            .from(users)
            .where(eq(users.id, job[0].talentOwnerId))
            .limit(1);
            
          if (job[0] && talentOwner[0]) {
            enrichedMatches.push({
              ...match,
              job: job[0],
              talentOwner: talentOwner[0],
            });
          }
        } catch (error) {
          console.error(`Error enriching match ${match.id}:`, error);
          continue;
        }
      }
      
      return enrichedMatches as any;
    } catch (error) {
      console.error("Error in getMatchesForCandidate:", error);
      return [];
    }
  }

  async getMatchesForJob(jobId: number): Promise<(JobMatch & { candidate: User; candidateProfile?: CandidateProfile })[]> {
    return await db
      .select()
      .from(jobMatches)
      .innerJoin(users, eq(jobMatches.candidateId, users.id))
      .leftJoin(candidateProfiles, eq(users.id, candidateProfiles.userId))
      .where(eq(jobMatches.jobId, jobId))
      .orderBy(desc(jobMatches.matchScore)) as any;
  }

  async updateMatchStatus(matchId: number, status: string): Promise<JobMatch> {
    const [result] = await db
      .update(jobMatches)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(jobMatches.id, matchId))
      .returning();
    return result;
  }

  // Legacy chat operations (keeping for compatibility)
  async createChatRoomLegacy(matchId: number): Promise<ChatRoom> {
    // This is a legacy method - use createChatRoom instead
    throw new Error("Use createChatRoom with proper data structure");
  }

  async getChatRoomLegacy(matchId: number): Promise<ChatRoom | undefined> {
    // This is a legacy method - use getChatRoom instead
    throw new Error("Use getChatRoom with jobId and candidateId");
  }

  async getChatMessages(chatRoomId: number): Promise<(ChatMessage & { sender: User })[]> {
    return await db
      .select({
        id: chatMessages.id,
        chatRoomId: chatMessages.chatRoomId,
        senderId: chatMessages.senderId,
        message: chatMessages.message,
        createdAt: chatMessages.createdAt,
        sender: users,
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.senderId, users.id))
      .where(eq(chatMessages.chatRoomId, chatRoomId))
      .orderBy(chatMessages.createdAt);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [result] = await db.insert(chatMessages).values(message).returning();
    return result;
  }

  async getChatRoomsForUser(userId: string): Promise<(ChatRoom & { match: JobMatch & { job: JobPosting; candidate: User; recruiter: User } })[]> {
    return await db
      .select()
      .from(chatRooms)
      .innerJoin(jobMatches, eq(chatRooms.matchId, jobMatches.id))
      .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
      .innerJoin(users, eq(jobMatches.candidateId, users.id))
      .where(or(eq(jobMatches.candidateId, userId), eq(jobPostings.talentOwnerId, userId)))
      .orderBy(desc(chatRooms.updatedAt)) as any;
  }

  // Activity operations
  async createActivityLog(userId: string, type: string, description: string, metadata?: any): Promise<ActivityLog> {
    const [result] = await db
      .insert(activityLogs)
      .values({ userId, type, description, metadata })
      .returning();
    return result;
  }

  async getActivityLogs(userId: string, limit = 10): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  // Statistics (first implementation - keeping this one)
  async getCandidateStatsBasic(candidateId: string): Promise<{
    newMatches: number;
    profileViews: number;
    activeChats: number;
  }> {
    const [matchesCount] = await db
      .select({ count: count() })
      .from(jobMatches)
      .where(and(eq(jobMatches.candidateId, candidateId), eq(jobMatches.status, "pending")));

    const [viewsCount] = await db
      .select({ count: count() })
      .from(activityLogs)
      .where(and(eq(activityLogs.userId, candidateId), eq(activityLogs.type, "profile_view")));

    const [chatsCount] = await db
      .select({ count: count() })
      .from(chatRooms)
      .innerJoin(jobMatches, eq(chatRooms.matchId, jobMatches.id))
      .where(and(eq(jobMatches.candidateId, candidateId), eq(chatRooms.status, "active")));

    return {
      newMatches: matchesCount.count,
      profileViews: viewsCount.count,
      activeChats: chatsCount.count,
    };
  }

  async getRecruiterStats(talentOwnerId: string): Promise<{
    activeJobs: number;
    totalMatches: number;
    activeChats: number;
    hires: number;
  }> {
    const [jobsCount] = await db
      .select({ count: count() })
      .from(jobPostings)
      .where(and(eq(jobPostings.talentOwnerId, talentOwnerId), eq(jobPostings.status, "active")));

    const [matchesCount] = await db
      .select({ count: count() })
      .from(jobMatches)
      .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
      .where(eq(jobPostings.talentOwnerId, talentOwnerId));

    const [chatsCount] = await db
      .select({ count: count() })
      .from(chatRooms)
      .innerJoin(jobMatches, eq(chatRooms.matchId, jobMatches.id))
      .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
      .where(and(eq(jobPostings.talentOwnerId, talentOwnerId), eq(chatRooms.status, "active")));

    const [hiresCount] = await db
      .select({ count: count() })
      .from(activityLogs)
      .where(and(eq(activityLogs.userId, talentOwnerId), eq(activityLogs.type, "hire_made")));

    return {
      activeJobs: jobsCount.count,
      totalMatches: matchesCount.count,
      activeChats: chatsCount.count,
      hires: hiresCount.count,
    };
  }

  async getCandidatesForRecruiter(talentOwnerId: string): Promise<any[]> {
    const candidates = await db
      .select({
        id: candidateProfiles.userId,
        firstName: candidateProfiles.firstName,
        lastName: candidateProfiles.lastName,
        email: candidateProfiles.email,
        skills: candidateProfiles.skills,
        experience: candidateProfiles.experience,
        location: candidateProfiles.location,
        resumeUrl: candidateProfiles.resumeUrl,
        matchScore: jobMatches.matchScore,
        status: jobMatches.status,
        appliedAt: jobMatches.createdAt,
        jobTitle: jobPostings.title,
        jobId: jobPostings.id,
      })
      .from(jobMatches)
      .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
      .innerJoin(candidateProfiles, eq(jobMatches.candidateId, candidateProfiles.userId))
      .where(eq(jobPostings.talentOwnerId, talentOwnerId))
      .orderBy(desc(jobMatches.createdAt));

    return candidates;
  }

  // Application tracking methods
  async getApplicationsWithStatus(candidateId: string): Promise<any[]> {
    try {
      const applications = await db
        .select({
          id: jobApplications.id,
          status: jobApplications.status,
          appliedAt: jobApplications.appliedAt,
          jobId: jobPostings.id,
          jobTitle: jobPostings.title,
          jobCompany: jobPostings.company,
          jobLocation: jobPostings.location,
        })
        .from(jobApplications)
        .innerJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
        .where(eq(jobApplications.candidateId, candidateId))
        .orderBy(desc(jobApplications.appliedAt));

      // Transform the results into expected structure
      return applications.map(app => ({
        id: app.id,
        status: app.status,
        appliedAt: app.appliedAt,
        job: {
          id: app.jobId,
          title: app.jobTitle,
          company: app.jobCompany,
          location: app.jobLocation,
        }
      }));
    } catch (error) {
      console.error('Error fetching applications with status:', error);
      return [];
    }
  }

  async updateApplicationStatus(applicationId: number, status: string, data?: any): Promise<any> {
    const updateData: any = {
      status,
      lastStatusUpdate: new Date(),
    };

    if (data?.interviewDate) {
      updateData.interviewDate = new Date(data.interviewDate);
    }

    if (status === 'viewed' && !data?.viewedByEmployerAt) {
      updateData.viewedByEmployerAt = new Date();
    }

    const [application] = await db
      .update(jobApplications)
      .set(updateData)
      .where(eq(jobApplications.id, applicationId))
      .returning();

    return application;
  }

  async getApplicationByJobAndCandidate(jobId: number, candidateId: string): Promise<any> {
    const [application] = await db
      .select()
      .from(jobApplications)
      .where(and(
        eq(jobApplications.jobId, jobId),
        eq(jobApplications.candidateId, candidateId)
      ));

    return application;
  }

  async createJobApplication(application: any): Promise<any> {
    const [newApplication] = await db
      .insert(jobApplications)
      .values(application)
      .returning();

    return newApplication;
  }

  // Notification preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    
    return preferences;
  }

  async updateNotificationPreferences(userId: string, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences> {
    const [updated] = await db
      .insert(notificationPreferences)
      .values({ userId, ...preferences })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          ...preferences,
          updatedAt: new Date(),
        }
      })
      .returning();

    return updated;
  }

  // Notification operations
  async getNotifications(userId: string): Promise<any[]> {
    try {
      const notifications = [];

      // Get recent job matches as notifications
      const recentMatches = await db
        .select({
          matchId: jobMatches.id,
          jobId: jobMatches.jobId,
          matchScore: jobMatches.matchScore,
          createdAt: jobMatches.createdAt,
          jobTitle: jobPostings.title,
          company: jobPostings.company,
          status: jobMatches.status
        })
        .from(jobMatches)
        .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
        .where(eq(jobMatches.candidateId, userId))
        .orderBy(desc(jobMatches.createdAt))
        .limit(5);

      // Convert matches to notifications
      recentMatches.forEach((match, index) => {
        if (match.status === 'pending') {
          notifications.push({
            id: `match_${match.matchId}`,
            type: 'match',
            title: 'New Job Match',
            message: `You have a new ${match.matchScore} match for ${match.jobTitle} at ${match.company}`,
            isRead: false,
            createdAt: match.createdAt?.toISOString() || new Date().toISOString(),
            metadata: {
              jobId: match.jobId,
              matchId: match.matchId,
              jobTitle: match.jobTitle,
              company: match.company,
              matchScore: parseInt(match.matchScore || '0')
            }
          });
        }
      });

      // Get recent applications as notifications
      const recentApplications = await db
        .select({
          appId: jobApplications.id,
          jobId: jobApplications.jobId,
          status: jobApplications.status,
          appliedAt: jobApplications.appliedAt,
          jobTitle: jobPostings.title,
          company: jobPostings.company
        })
        .from(jobApplications)
        .innerJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
        .where(eq(jobApplications.candidateId, userId))
        .orderBy(desc(jobApplications.appliedAt))
        .limit(3);

      // Convert applications to notifications
      recentApplications.forEach((app) => {
        let message = '';
        switch (app.status) {
          case 'viewed':
            message = `Your application for ${app.jobTitle} at ${app.company} has been viewed`;
            break;
          case 'interviewed':
            message = `Interview scheduled for ${app.jobTitle} at ${app.company}`;
            break;
          case 'rejected':
            message = `Update on your application for ${app.jobTitle} at ${app.company}`;
            break;
          default:
            message = `Application submitted for ${app.jobTitle} at ${app.company}`;
        }

        notifications.push({
          id: `app_${app.appId}`,
          type: 'application',
          title: 'Application Update',
          message,
          isRead: app.status === 'applied',
          createdAt: app.appliedAt?.toISOString() || new Date().toISOString(),
          metadata: {
            jobId: app.jobId,
            applicationId: app.appId,
            jobTitle: app.jobTitle,
            company: app.company,
            status: app.status
          }
        });
      });

      // Sort all notifications by creation date
      return notifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    } catch (error) {
      console.error('Error fetching real notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: number, userId: string): Promise<void> {
    // In a real implementation, this would update the notification's read status
    console.log(`Marking notification ${notificationId} as read for user ${userId}`);
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    // In a real implementation, this would mark all notifications as read for the user
    console.log(`Marking all notifications as read for user ${userId}`);
  }

  // Enhanced candidate stats
  async getCandidateStats(candidateId: string): Promise<{
    newMatches: number;
    profileViews: number;
    activeChats: number;
  }> {
    try {
      // Get application count
      const applicationCount = await db
        .select({ count: count() })
        .from(jobApplications)
        .where(eq(jobApplications.candidateId, candidateId));

      // Get active matches count
      const matchCount = await db
        .select({ count: count() })
        .from(jobMatches)
        .where(and(
          eq(jobMatches.candidateId, candidateId),
          or(
            eq(jobMatches.status, 'pending'),
            eq(jobMatches.status, 'viewed'),
            eq(jobMatches.status, 'interested')
          )
        ));

      // Get candidate profile for strength calculation
      const profile = await this.getCandidateProfile(candidateId);
      
      // Calculate profile strength based on completed fields
      let profileStrength = 0;
      if (profile) {
        let filledFields = 0;
        const totalFields = 8; // Adjust based on your profile fields
        
        if (profile.skills && profile.skills.length > 0) filledFields++;
        if (profile.experience) filledFields++;
        if (profile.location) filledFields++;
        if (profile.resumeUrl) filledFields++;
        if (profile.linkedinUrl) filledFields++;
        if (profile.githubUrl) filledFields++;
        if (profile.portfolioUrl) filledFields++;
        if (profile.summary) filledFields++;
        
        profileStrength = Math.round((filledFields / totalFields) * 100);
      }

      // Calculate average match score
      const matches = await db
        .select()
        .from(jobMatches)
        .where(eq(jobMatches.candidateId, candidateId));

      let avgMatchScore = 0;
      if (matches.length > 0) {
        const totalScore = matches.reduce((sum, match) => {
          return sum + parseFloat(match.matchScore || '0');
        }, 0);
        avgMatchScore = Math.round(totalScore / matches.length);
      }

      // Get active chat rooms count
      const chatCount = await db
        .select({ count: count() })
        .from(chatRooms)
        .where(eq(chatRooms.candidateId, candidateId));

      return {
        newMatches: matchCount[0]?.count || 0,
        profileViews: profile?.profileViews || 0,
        activeChats: chatCount[0]?.count || 0,
      };
    } catch (error) {
      console.error('Error fetching candidate stats:', error);
      return {
        newMatches: 0,
        profileViews: 0,
        activeChats: 0,
      };
    }
  }

  // Missing exam and chat implementations
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
      const [exam] = await db.select().from(jobExams).where(eq(jobExams.jobId, jobId));
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
        .set(data)
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
      return await db.select().from(examAttempts).where(eq(examAttempts.jobId, jobId));
    } catch (error) {
      console.error('Error fetching exam attempts:', error);
      return [];
    }
  }

  async rankCandidatesByExamScore(jobId: number): Promise<void> {
    // Implementation for ranking candidates by exam performance
    console.log(`Ranking candidates for job ${jobId} by exam score`);
  }

  async createNotification(notification: any): Promise<any> {
    try {
      const [result] = await db.insert(notifications).values(notification).returning();
      return result;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Missing method implementations for routes
  async getApplicationsForCandidate(candidateId: string): Promise<any[]> {
    return this.getApplicationsWithStatus(candidateId);
  }

  async getActivityForCandidate(candidateId: string): Promise<any[]> {
    return this.getActivityLogs(candidateId, 50);
  }

  async createOrUpdateCandidateProfile(profileData: any): Promise<CandidateProfile> {
    return this.upsertCandidateProfile(profileData);
  }

  async updateUserInfo(userId: string, userData: any): Promise<User> {
    return this.updateUserProfile(userId, userData);
  }

  // Missing method implementations required by interface
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
          ranking: data.ranking,
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
        isRead: false,
        createdAt: new Date()
      }).returning();
      return result;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage(); {
      const activities = await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.userId, candidateId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(50);

      return activities;
    } catch (error) {
      console.error('Error fetching activity for candidate:', error);
      return [];
    }
  }

  async createOrUpdateCandidateProfile(userId: string, profileData: any): Promise<any> {
    try {
      // Check if profile exists
      const [existingProfile] = await db
        .select()
        .from(candidateProfiles)
        .where(eq(candidateProfiles.userId, userId));

      if (existingProfile) {
        // Update existing profile
        const [updatedProfile] = await db
          .update(candidateProfiles)
          .set({
            title: profileData.title,
            experience: profileData.experience,
            skills: profileData.skills,
            location: profileData.location,
            workType: profileData.workType,
            salaryMin: profileData.salaryMin,
            salaryMax: profileData.salaryMax,
            bio: profileData.bio,
            resumeUrl: profileData.resumeUrl,
            updatedAt: new Date(),
          })
          .where(eq(candidateProfiles.userId, userId))
          .returning();
        
        return updatedProfile;
      } else {
        // Create new profile
        const [newProfile] = await db
          .insert(candidateProfiles)
          .values({
            userId: userId,
            title: profileData.title,
            experience: profileData.experience,
            skills: profileData.skills,
            location: profileData.location,
            workType: profileData.workType,
            salaryMin: profileData.salaryMin,
            salaryMax: profileData.salaryMax,
            bio: profileData.bio,
            resumeUrl: profileData.resumeUrl,
          })
          .returning();
        
        return newProfile;
      }
    } catch (error) {
      console.error('Error creating/updating candidate profile:', error);
      throw error;
    }
  }

  async updateUserInfo(userId: string, userInfo: any): Promise<any> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          email: userInfo.email,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user info:', error);
      throw error;
    }
  }

  // Exam operations for automatic assessment creation
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
      const [exam] = await db.select().from(jobExams).where(eq(jobExams.jobId, jobId));
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
      const attempts = await db
        .select()
        .from(examAttempts)
        .where(eq(examAttempts.jobId, jobId))
        .orderBy(desc(examAttempts.score));
      return attempts;
    } catch (error) {
      console.error('Error fetching exam attempts:', error);
      throw error;
    }
  }

  // Rank candidates by exam score and grant chat access to top performers
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
          
          // Send notification about chat access
          await this.createNotification({
            userId: attempts[i].candidateId,
            type: 'chat_access_granted',
            title: 'Chat Access Granted',
            message: `You've qualified for hiring manager chat! Ranked #${ranking} for ${job.title}`,
            jobId: jobId
          });
        }
      }
    } catch (error) {
      console.error('Error ranking candidates by exam score:', error);
      throw error;
    }
  }

  // Controlled chat operations based on exam performance
  async createChatRoom(data: any): Promise<ChatRoom> {
    try {
      const [result] = await db.insert(chatRooms).values(data).returning();
      return result;
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

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

      // Check if chat room already exists
      const existingRoom = await this.getChatRoom(jobId, candidateId);
      if (existingRoom) {
        return existingRoom;
      }

      // Create new chat room
      const chatRoomData = {
        jobId,
        candidateId,
        hiringManagerId: job.hiringManagerId,
        examAttemptId,
        candidateRanking: ranking,
        status: 'active' as const,
        accessGrantedAt: new Date()
      };

      return await this.createChatRoom(chatRoomData);
    } catch (error) {
      console.error('Error granting chat access:', error);
      throw error;
    }
  }

  // Notification creation for exam and chat status updates
  async createNotification(notification: any): Promise<any> {
    try {
      const [result] = await db.insert(notifications).values({
        ...notification,
        isRead: false,
        createdAt: new Date()
      }).returning();
      return result;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
