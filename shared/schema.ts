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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["candidate", "talent_owner"] }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candidate profiles
export const candidateProfiles = pgTable("candidate_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  resumeUrl: text("resume_url"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  portfolioUrl: text("portfolio_url"),
  personalWebsite: text("personal_website"),
  behanceUrl: text("behance_url"),
  dribbbleUrl: text("dribbble_url"),
  stackOverflowUrl: text("stack_overflow_url"),
  mediumUrl: text("medium_url"),
  skills: jsonb("skills").$type<string[]>().default([]),
  experience: text("experience"),
  location: varchar("location"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  workType: varchar("work_type", { enum: ["remote", "hybrid", "onsite"] }),
  industry: varchar("industry"),
  bio: text("bio"), // Summary/objective from resume
  resumeText: text("resume_text"), // Raw parsed text for search
  profileStrength: integer("profile_strength").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Job postings - Enhanced for AI-curated feeds
export const jobPostings = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  talentOwnerId: varchar("talent_owner_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  company: varchar("company").notNull(),
  description: text("description").notNull(),
  requirements: jsonb("requirements").$type<string[]>().default([]),
  skills: jsonb("skills").$type<string[]>().default([]),
  location: varchar("location"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  workType: varchar("work_type", { enum: ["remote", "hybrid", "onsite"] }),
  industry: varchar("industry"),
  status: varchar("status", { enum: ["active", "paused", "closed"] }).default("active"),
  source: varchar("source").default("platform"), // "platform", "external_api", "scraped"
  externalId: varchar("external_id"), // For AI-curated jobs from external sources
  companyLogoUrl: varchar("company_logo_url"),
  applicationUrl: varchar("application_url"), // Direct apply link
  urgency: varchar("urgency", { enum: ["low", "medium", "high"] }).default("medium"),
  viewCount: integer("view_count").default(0),
  applicationCount: integer("application_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Job matches - Enhanced with AI confidence and feedback
export const jobMatches = pgTable("job_matches", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobPostings.id),
  candidateId: varchar("candidate_id").notNull().references(() => users.id),
  matchScore: numeric("match_score").notNull(),
  confidenceLevel: varchar("confidence_level", { enum: ["low", "medium", "high"] }).default("medium"),
  matchReasons: jsonb("match_reasons").$type<string[]>().default([]),
  skillMatches: jsonb("skill_matches").$type<{skill: string, matched: boolean}[]>().default([]),
  aiExplanation: text("ai_explanation"), // Why this match was suggested
  status: varchar("status", { enum: ["pending", "viewed", "interested", "applied", "rejected"] }).default("pending"),
  userFeedback: integer("user_feedback"), // 1-5 rating for learning
  feedbackReason: text("feedback_reason"), // Why they rated it this way
  viewedAt: timestamp("viewed_at"),
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat rooms
export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => jobMatches.id),
  status: varchar("status", { enum: ["active", "closed"] }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").notNull().references(() => chatRooms.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Job applications - Track application status and updates
export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  candidateId: varchar("candidate_id").notNull().references(() => users.id),
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
  updatedBy: varchar("updated_by"), // System or talent owner ID
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow(),
});

// User feedback for match learning
export const matchFeedback = pgTable("match_feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  matchId: integer("match_id").notNull().references(() => jobMatches.id),
  rating: integer("rating").notNull(), // 1-5 stars
  feedbackType: varchar("feedback_type", { enum: ["match_quality", "job_relevance", "timing", "requirements"] }),
  comment: text("comment"),
  improvementSuggestions: jsonb("improvement_suggestions").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
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
  match: one(jobMatches, {
    fields: [chatRooms.matchId],
    references: [jobMatches.id],
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCandidateProfileSchema = createInsertSchema(candidateProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobMatchSchema = createInsertSchema(jobMatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

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
