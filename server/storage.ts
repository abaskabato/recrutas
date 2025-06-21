import {
  users,
  candidateProfiles,
  jobPostings,
  jobMatches,
  chatRooms,
  chatMessages,
  activityLogs,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, count } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Candidate operations
  getCandidateProfile(userId: string): Promise<CandidateProfile | undefined>;
  upsertCandidateProfile(profile: InsertCandidateProfile): Promise<CandidateProfile>;
  
  // Job operations
  createJobPosting(job: InsertJobPosting): Promise<JobPosting>;
  getJobPostings(recruiterId: string): Promise<JobPosting[]>;
  getJobPosting(id: number): Promise<JobPosting | undefined>;
  updateJobPosting(id: number, updates: Partial<InsertJobPosting>): Promise<JobPosting>;
  
  // Matching operations
  createJobMatch(match: InsertJobMatch): Promise<JobMatch>;
  getMatchesForCandidate(candidateId: string): Promise<(JobMatch & { job: JobPosting; recruiter: User })[]>;
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
          ...userData,
          updatedAt: new Date(),
        },
      })
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
    const [result] = await db
      .insert(candidateProfiles)
      .values(profile as any)
      .onConflictDoUpdate({
        target: candidateProfiles.userId,
        set: profile as any,
      })
      .returning();
    return result;
  }

  // Job operations
  async createJobPosting(job: InsertJobPosting): Promise<JobPosting> {
    const [result] = await db.insert(jobPostings).values(job as any).returning();
    return result;
  }

  async getJobPostings(recruiterId: string): Promise<JobPosting[]> {
    return await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.recruiterId, recruiterId))
      .orderBy(desc(jobPostings.createdAt));
  }

  async getJobPosting(id: number): Promise<JobPosting | undefined> {
    const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
    return job;
  }

  async updateJobPosting(id: number, updates: Partial<InsertJobPosting>): Promise<JobPosting> {
    const [result] = await db
      .update(jobPostings)
      .set({ ...updates as any, updatedAt: new Date() })
      .where(eq(jobPostings.id, id))
      .returning();
    return result;
  }

  // Matching operations
  async createJobMatch(match: InsertJobMatch): Promise<JobMatch> {
    const [result] = await db.insert(jobMatches).values(match as any).returning();
    return result;
  }

  async getMatchesForCandidate(candidateId: string): Promise<(JobMatch & { job: JobPosting; recruiter: User })[]> {
    return await db
      .select({
        id: jobMatches.id,
        jobId: jobMatches.jobId,
        candidateId: jobMatches.candidateId,
        matchScore: jobMatches.matchScore,
        matchReasons: jobMatches.matchReasons,
        status: jobMatches.status,
        createdAt: jobMatches.createdAt,
        updatedAt: jobMatches.updatedAt,
        job: jobPostings,
        recruiter: users,
      })
      .from(jobMatches)
      .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
      .innerJoin(users, eq(jobPostings.recruiterId, users.id))
      .where(eq(jobMatches.candidateId, candidateId))
      .orderBy(desc(jobMatches.createdAt));
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
      .where(or(eq(jobMatches.candidateId, userId), eq(jobPostings.recruiterId, userId)))
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

  async getRecruiterStats(recruiterId: string): Promise<{
    activeJobs: number;
    totalMatches: number;
    activeChats: number;
    hires: number;
  }> {
    const [jobsCount] = await db
      .select({ count: count() })
      .from(jobPostings)
      .where(and(eq(jobPostings.recruiterId, recruiterId), eq(jobPostings.status, "active")));

    const [matchesCount] = await db
      .select({ count: count() })
      .from(jobMatches)
      .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
      .where(eq(jobPostings.recruiterId, recruiterId));

    const [chatsCount] = await db
      .select({ count: count() })
      .from(chatRooms)
      .innerJoin(jobMatches, eq(chatRooms.matchId, jobMatches.id))
      .innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id))
      .where(and(eq(jobPostings.recruiterId, recruiterId), eq(chatRooms.status, "active")));

    const [hiresCount] = await db
      .select({ count: count() })
      .from(activityLogs)
      .where(and(eq(activityLogs.userId, recruiterId), eq(activityLogs.type, "hire_made")));

    return {
      activeJobs: jobsCount.count,
      totalMatches: matchesCount.count,
      activeChats: chatsCount.count,
      hires: hiresCount.count,
    };
  }
}

export const storage = new DatabaseStorage();
