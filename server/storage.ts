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
  
  // Chat operations
  createChatRoom(matchId: number): Promise<ChatRoom>;
  getChatRoom(matchId: number): Promise<ChatRoom | undefined>;
  getChatMessages(chatRoomId: number): Promise<(ChatMessage & { sender: User })[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatRoomsForUser(userId: string): Promise<(ChatRoom & { match: JobMatch & { job: JobPosting; candidate: User; recruiter: User } })[]>;
  
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
      const matches = await db
        .select()
        .from(jobMatches)
        .where(eq(jobMatches.candidateId, candidateId))
        .orderBy(desc(jobMatches.createdAt));
      
      if (!matches || matches.length === 0) {
        return [];
      }
      
      const enrichedMatches = [];
      
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

  // Chat operations
  async createChatRoom(matchId: number): Promise<ChatRoom> {
    const [result] = await db.insert(chatRooms).values({ matchId }).returning();
    return result;
  }

  async getChatRoom(matchId: number): Promise<ChatRoom | undefined> {
    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.matchId, matchId));
    return room;
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

  // Statistics
  async getCandidateStats(candidateId: string): Promise<{
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
    // Return mock notifications for now - in a real implementation, this would query a notifications table
    return [
      {
        id: 1,
        type: 'match',
        title: 'New Job Match',
        message: 'You have a new 95% match for Software Engineer at TechCorp',
        isRead: false,
        createdAt: new Date().toISOString(),
        metadata: {
          jobId: 1,
          jobTitle: 'Software Engineer',
          company: 'TechCorp',
          matchScore: 95
        }
      },
      {
        id: 2,
        type: 'message',
        title: 'New Message',
        message: 'Sarah from Google sent you a message about the Frontend Developer position',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        metadata: {
          jobId: 2,
          company: 'Google'
        }
      }
    ];
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
    totalApplications: number;
    activeMatches: number;
    profileViews: number;
    profileStrength: number;
    responseRate: number;
    avgMatchScore: number;
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

      return {
        totalApplications: applicationCount[0]?.count || 0,
        activeMatches: matchCount[0]?.count || 0,
        profileViews: profile?.profileViews || 0,
        profileStrength,
        responseRate: 85, // Mock value - would be calculated from actual response data
        avgMatchScore,
      };
    } catch (error) {
      console.error('Error fetching candidate stats:', error);
      return {
        totalApplications: 0,
        activeMatches: 0,
        profileViews: 0,
        profileStrength: 0,
        responseRate: 0,
        avgMatchScore: 0,
      };
    }
  }
}

export const storage = new DatabaseStorage();
