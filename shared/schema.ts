/**
 * Database Schema for Recrutas Platform
 * 
 * This file defines the complete database schema for the AI-powered hiring platform.
 * The schema is organized into logical sections for better maintainability:
 * 
 * - Authentication & User Management
 * - Job Posting & Matching System
 * - Communication & Messaging
 * - Application Tracking
 * - Notification System
 * - Analytics & Feedback
 * - Real-time Features
 */

import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  numeric,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// =============================================================================
// AUTHENTICATION & USER MANAGEMENT
// =============================================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  first_name: text("first_name"),
  last_name: text("last_name"),
  phone_number: text("phone_number"),
  role: text("role"),
  profile_complete: boolean("profile_complete").default(false),
  profile_image_url: text("profile_image_url"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

/**
 * Candidate Profiles Table
 * Extended profile information for job seekers
 * Includes portfolio links, skills, preferences, and AI-parsed resume data
 */
export const candidateProfiles = pgTable("candidate_users", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id),
  
  // Basic Info
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  email: varchar("email"),
  
  // Portfolio & Social Links
  resumeUrl: text("resume_url"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  portfolioUrl: text("portfolio_url"),
  personalWebsite: text("personal_website"),
  behanceUrl: text("behance_url"),
  dribbbleUrl: text("dribbble_url"),
  stackOverflowUrl: text("stack_overflow_url"),
  mediumUrl: text("medium_url"),
  
  // Profile Data & Preferences
  skills: jsonb("skills").default([] as any),
  experience: text("experience"),
  location: varchar("location"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  workType: varchar("work_type", { enum: ["remote", "hybrid", "onsite"] }),
  industry: varchar("industry"),
  
  // AI-Enhanced Profile Data
  bio: text("bio"), // Summary/objective from resume
  summary: text("summary"), // Profile summary
  resumeText: text("resume_text"), // Raw parsed text for AI matching
  profileStrength: integer("profile_strength").default(0), // AI-calculated profile completeness score
  profileViews: integer("profile_views").default(0), // Track profile views
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// JOB POSTING & MATCHING SYSTEM
// =============================================================================

// Job postings - Enhanced for AI-curated feeds
export const jobPostings = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  talentOwnerId: uuid("talent_owner_id").notNull().references(() => users.id),
  hiringManagerId: uuid("hiring_manager_id").references(() => users.id),
  title: varchar("title").notNull(),
  company: varchar("company").notNull(),
  description: text("description").notNull(),
  requirements: jsonb("requirements").default([] as any),
  skills: jsonb("skills").default([] as any),
  location: varchar("location"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  workType: varchar("work_type", { enum: ["remote", "hybrid", "onsite"] }),
  industry: varchar("industry"),
  status: varchar("status", { enum: ["active", "paused", "closed"] }).default("active"),
  source: varchar("source").default("platform"), // "platform", "external_api", "scraped"
  externalId: varchar("external_id"), // For AI-curated jobs from external sources
  externalUrl: varchar("external_url"), // External career page URL
  careerPageUrl: varchar("career_page_url"), // Company career page
  companyLogoUrl: varchar("company_logo_url"),
  applicationUrl: varchar("application_url"), // Direct apply link
  urgency: varchar("urgency", { enum: ["low", "medium", "high"] }).default("medium"),
  viewCount: integer("view_count").default(0),
  applicationCount: integer("application_count").default(0),
  // Exam and chat settings for internal jobs
  hasExam: boolean("has_exam").default(true), // Internal jobs have exams by default
  examPassingScore: integer("exam_passing_score").default(70), // Minimum score to qualify for chat
  autoRankCandidates: boolean("auto_rank_candidates").default(true), // Auto-rank by exam scores
  maxChatCandidates: integer("max_chat_candidates").default(5), // Top N candidates get chat access
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Job exams - Auto-created for internal jobs
export const jobExams = pgTable("job_exams", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobPostings.id),
  title: varchar("title").notNull(),
  description: text("description"),
  timeLimit: integer("time_limit").default(30), // Minutes
  passingScore: integer("passing_score").default(70), // Percentage
  isActive: boolean("is_active").default(true),
  questions: jsonb("questions").default([] as any),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exam attempts - Track candidate performance
export const examAttempts = pgTable("exam_attempts", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => jobExams.id),
  candidateId: uuid("candidate_id").notNull().references(() => users.id),
  jobId: integer("job_id").notNull().references(() => jobPostings.id),
  score: integer("score"), // Percentage score
  totalQuestions: integer("total_questions"),
  correctAnswers: integer("correct_answers"),
  timeSpent: integer("time_spent"), // Minutes
  answers: jsonb("answers").default([] as any),
  status: varchar("status", { enum: ["in_progress", "completed", "abandoned"] }).default("in_progress"),
  passedExam: boolean("passed_exam").default(false),
  qualifiedForChat: boolean("qualified_for_chat").default(false), // Based on ranking
  ranking: integer("ranking"), // Position among all candidates
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Job matches - Enhanced with AI confidence and feedback
export const jobMatches = pgTable("job_matches", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobPostings.id),
  candidateId: uuid("candidate_id").notNull().references(() => users.id),
  matchScore: varchar("match_score").notNull(),
  confidenceLevel: varchar("confidence_level", { enum: ["low", "medium", "high"] }).default("medium"),
  matchReasons: jsonb("match_reasons").default([] as any),
  skillMatches: jsonb("skill_matches").default([] as any),
  aiExplanation: text("ai_explanation"), // Why this match was suggested
  status: varchar("status", { enum: ["pending", "viewed", "interested", "applied", "rejected"] }).default("pending"),
  userFeedback: integer("user_feedback"), // 1-5 rating for learning
  feedbackReason: text("feedback_reason"), // Why they rated it this way
  viewedAt: timestamp("viewed_at"),
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat rooms - Only accessible after exam qualification
export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobPostings.id),
  candidateId: uuid("candidate_id").notNull().references(() => users.id),
  hiringManagerId: uuid("hiring_manager_id").notNull().references(() => users.id),
  examAttemptId: integer("exam_attempt_id").references(() => examAttempts.id), // Required for access
  status: varchar("status", { enum: ["active", "closed"] }).default("active"),
  candidateRanking: integer("candidate_ranking"), // Their position among qualified candidates
  accessGrantedAt: timestamp("access_granted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").notNull().references(() => chatRooms.id),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Job applications - Track application status and updates
export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => users.id),
  jobId: integer("job_id").notNull().references(() => jobPostings.id),
  matchId: integer("match_id").references(() => jobMatches.id),
  status: varchar("status", { 
    enum: ["submitted", "viewed", "screening", "interview_scheduled", "interview_completed", "offer", "rejected", "withdrawn"] 
  }).default("submitted"),
  appliedAt: timestamp("applied_at").defaultNow(),
  viewedByEmployerAt: timestamp("viewed_by_employer_at"),
  lastStatusUpdate: timestamp("last_status_update").defaultNow(),
  interviewLink: varchar("interview_link"),
  notes: text("notes"),
  autoFilled: boolean("auto_filled").default(false), // Was application auto-filled by AI
  resumeUrl: varchar("resume_url"),
  coverLetter: text("cover_letter"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Application status updates - Real-time tracking
export const applicationUpdates = pgTable("application_updates", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => jobApplications.id),
  previousStatus: varchar("previous_status"),
  newStatus: varchar("new_status").notNull(),
  message: text("message"), // Update message for candidate
  updatedBy: uuid("updated_by"), // System or talent owner ID
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow(),
});

// Application Intelligence Events - Revolutionary transparency feature
export const applicationEvents = pgTable("application_events", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => jobApplications.id),
  eventType: varchar("event_type", { 
    enum: ["submitted", "viewed", "screened", "shortlisted", "rejected", "interview_scheduled", "interviewed", "decision_pending", "hired", "archived"] 
  }).notNull(),
  actorRole: varchar("actor_role", { enum: ["system", "recruiter", "hiring_manager", "team_member"] }).notNull(),
  actorName: varchar("actor_name"),
  actorTitle: varchar("actor_title"),
  // Intelligence details
  viewDuration: integer("view_duration"), // seconds spent viewing profile
  candidateScore: integer("candidate_score"), // 0-100 scoring
  candidateRanking: integer("candidate_ranking"), // position among applicants
  totalApplicants: integer("total_applicants"),
  feedback: text("feedback"), // why rejected/advanced
  nextSteps: text("next_steps"), // what happens next
  competitorProfile: text("competitor_profile"), // anonymized top candidate skills
  visible: boolean("visible").default(true), // whether candidate can see this
  createdAt: timestamp("created_at").defaultNow(),
});

// Application Intelligence Insights - Learning from applications
export const applicationInsights = pgTable("application_insights", {
  id: serial("id").primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => users.id),
  applicationId: integer("application_id").notNull().references(() => jobApplications.id),
  strengthsIdentified: jsonb("strengths_identified").default([] as any),
  improvementAreas: jsonb("improvement_areas").default([] as any),
  benchmarkViewTime: integer("benchmark_view_time"), // average for this role
  actualViewTime: integer("actual_view_time"),
  benchmarkScore: integer("benchmark_score"), // average score for this role  
  actualScore: integer("actual_score"),
  similarSuccessfulProfiles: jsonb("similar_successful_users").default([] as any),
  recommendedActions: jsonb("recommended_actions").default([] as any),
  successProbability: integer("success_probability"), // 0-100
  supportiveMessage: text("supportive_message"), // mental health support
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User feedback for match learning
export const matchFeedback = pgTable("match_feedback", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  matchId: integer("match_id").notNull().references(() => jobMatches.id),
  rating: integer("rating").notNull(), // 1-5 stars
  feedbackType: varchar("feedback_type", { enum: ["match_quality", "job_relevance", "timing", "requirements"] }),
  comment: text("comment"),
  improvementSuggestions: jsonb("improvement_suggestions").default([] as any),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Real-time notifications system
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: varchar("type", { 
    enum: [
      "application_viewed", 
      "application_ranked", 
      "application_accepted", 
      "application_rejected",
      "exam_completed",
      "candidate_message",
      "interview_scheduled",
      "high_score_alert",
      "direct_connection",
      "status_update",
      "new_match"
    ] 
  }).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // Additional context data
  read: boolean("read").default(false),
  priority: varchar("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
  relatedJobId: integer("related_job_id").references(() => jobPostings.id),
  relatedApplicationId: integer("related_application_id").references(() => jobApplications.id),
  relatedMatchId: integer("related_match_id").references(() => jobMatches.id),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

// Notification preferences for users
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id),
  inAppNotifications: boolean("in_app_notifications").default(true),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(false),
  applicationUpdates: boolean("application_updates").default(true),
  examAlerts: boolean("exam_alerts").default(true),
  messageNotifications: boolean("message_notifications").default(true),
  highPriorityOnly: boolean("high_priority_only").default(false),
  quietHours: jsonb("quiet_hours"), // { start: "22:00", end: "08:00" }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Real-time connection tracking
export const connectionStatus = pgTable("connection_status", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  socketId: varchar("socket_id"),
  deviceInfo: jsonb("device_info"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video interviews
export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => users.id),
  interviewerId: uuid("interviewer_id").notNull().references(() => users.id),
  jobId: integer("job_id").notNull().references(() => jobPostings.id),
  applicationId: integer("application_id").notNull().references(() => jobApplications.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull(), // minutes
  platform: varchar("platform", { 
    enum: ["zoom", "meet", "teams", "phone"] 
  }).notNull().default("zoom"),
  meetingUrl: text("meeting_url"),
  meetingId: varchar("meeting_id"),
  password: varchar("password"),
  notes: text("notes"),
  status: varchar("status", {
    enum: ["scheduled", "confirmed", "completed", "cancelled", "no_show"]
  }).notNull().default("scheduled"),
  feedback: text("feedback"),
  rating: integer("rating"), // 1-5 scale
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  candidateProfile: one(candidateProfiles, {
    fields: [users.id],
    references: [candidateProfiles.userId],
  }),
  jobPostings: many(jobPostings),
  matches: many(jobMatches),
  chatMessages: many(chatMessages),
  activityLogs: many(activityLogs),
}));

export const candidateProfilesRelations = relations(candidateProfiles, ({ one }) => ({
  user: one(users, {
    fields: [candidateProfiles.userId],
    references: [users.id],
  }),
}));

export const jobPostingsRelations = relations(jobPostings, ({ one, many }) => ({
  talentOwner: one(users, {
    fields: [jobPostings.talentOwnerId],
    references: [users.id],
  }),
  matches: many(jobMatches),
  applications: many(jobApplications),
}));

export const jobMatchesRelations = relations(jobMatches, ({ one, many }) => ({
  job: one(jobPostings, {
    fields: [jobMatches.jobId],
    references: [jobPostings.id],
  }),
  candidate: one(users, {
    fields: [jobMatches.candidateId],
    references: [users.id],
  }),
  chatRoom: one(chatRooms),
}));

export const chatRoomsRelations = relations(chatRooms, ({ one, many }) => ({
  job: one(jobPostings, {
    fields: [chatRooms.jobId],
    references: [jobPostings.id],
  }),
  candidate: one(users, {
    fields: [chatRooms.candidateId],
    references: [users.id],
  }),
  hiringManager: one(users, {
    fields: [chatRooms.hiringManagerId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  chatRoom: one(chatRooms, {
    fields: [chatMessages.chatRoomId],
    references: [chatRooms.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  relatedJob: one(jobPostings, {
    fields: [notifications.relatedJobId],
    references: [jobPostings.id],
  }),
  relatedApplication: one(jobApplications, {
    fields: [notifications.relatedApplicationId],
    references: [jobApplications.id],
  }),
  relatedMatch: one(jobMatches, {
    fields: [notifications.relatedMatchId],
    references: [jobMatches.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const connectionStatusRelations = relations(connectionStatus, ({ one }) => ({
  user: one(users, {
    fields: [connectionStatus.userId],
    references: [users.id],
  }),
}));

export const interviewsRelations = relations(interviews, ({ one }) => ({
  candidate: one(users, {
    fields: [interviews.candidateId],
    references: [users.id],
  }),
  interviewer: one(users, {
    fields: [interviews.interviewerId],
    references: [users.id],
  }),
  job: one(jobPostings, {
    fields: [interviews.jobId],
    references: [jobPostings.id],
  }),
  application: one(jobApplications, {
    fields: [interviews.applicationId],
    references: [jobApplications.id],
  }),
}));

// Insert schemas - using direct createInsertSchema to avoid TypeScript errors
export const insertUserSchema = createInsertSchema(users);

export const insertCandidateProfileSchema = createInsertSchema(candidateProfiles);

export const insertJobPostingSchema = createInsertSchema(jobPostings);

export const insertJobMatchSchema = createInsertSchema(jobMatches);

export const insertChatMessageSchema = createInsertSchema(chatMessages);

export const insertNotificationSchema = createInsertSchema(notifications);

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences);

export const insertInterviewSchema = createInsertSchema(interviews);

export const insertConnectionStatusSchema = createInsertSchema(connectionStatus);

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type InsertCandidateProfile = z.infer<typeof insertCandidateProfileSchema>;
export type JobPosting = typeof jobPostings.$inferSelect;
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type JobMatch = typeof jobMatches.$inferSelect;
export type InsertJobMatch = z.infer<typeof insertJobMatchSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type JobApplication = typeof jobApplications.$inferSelect;
export type ApplicationUpdate = typeof applicationUpdates.$inferSelect;
export type MatchFeedback = typeof matchFeedback.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type ConnectionStatus = typeof connectionStatus.$inferSelect;
export type InsertConnectionStatus = z.infer<typeof insertConnectionStatusSchema>;
