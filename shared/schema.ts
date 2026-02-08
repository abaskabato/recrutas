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
import { unique } from "drizzle-orm/pg-core/unique-constraint";
import { uuid } from "drizzle-orm/pg-core/columns/uuid";
import { primaryKey } from "drizzle-orm/pg-core/primary-keys";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  first_name: text("first_name"),
  last_name: text("last_name"),
  phone_number: text("phone_number"),
  profile_image_url: text("profile_image_url"),
  role: text("role"),
  profile_complete: boolean("profile_complete").default(false),
});

export const talentOwnerProfiles = pgTable("talent_owner_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  jobTitle: text("job_title"),
  companyName: text("company_name"),
  companyWebsite: text("company_website"),
  companySize: text("company_size"),

  industry: text("industry"),
  companyLocation: text("company_location"),
  companyDescription: text("company_description"),
  hiringFor: jsonb("hiring_for"),
  currentHiringRoles: text("current_hiring_roles"),
  hiringTimeline: text("hiring_timeline"),
  hiringBudget: text("hiring_budget"),
  profileComplete: boolean("profile_complete").default(false),
  transparencySettings: jsonb("transparency_settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// The 'companies' table has been temporarily removed to resolve a migration conflict.

export const candidateProfiles = pgTable("candidate_users", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  email: varchar("email"),
  resumeUrl: text("resume_url"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  portfolioUrl: text("portfolio_url"),
  personalWebsite: text("personal_website"),
  behanceUrl: text("behance_url"),
  dribbbleUrl: text("dribbble_url"),
  stackOverflowUrl: text("stack_overflow_url"),
  mediumUrl: text("medium_url"),
  skills: jsonb("skills").default([] as any),
  experience: text("experience"),
  location: varchar("location"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  workType: varchar("work_type", { enum: ["remote", "hybrid", "onsite"] }),
  industry: varchar("industry"),
  bio: text("bio"),
  summary: text("summary"),
  resumeText: text("resume_text"),
  resumeParsingData: jsonb("resume_parsing_data").default({} as any),
  experienceLevel: varchar("experience_level", { enum: ["entry", "mid", "senior", "lead", "executive"] }),
  parsedAt: timestamp("parsed_at"),
  profileStrength: integer("profile_strength").default(0),
  profileViews: integer("profile_views").default(0),
  resumeProcessingStatus: varchar("resume_processing_status", { enum: ["idle", "processing", "completed", "failed"] }).default("idle"),
  jobPreferences: jsonb("job_preferences").default({} as any),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  source: varchar("source").default("platform"),
  externalId: varchar("external_id"),
  externalUrl: varchar("external_url"),
  careerPageUrl: varchar("career_page_url"),
  companyLogoUrl: varchar("company_logo_url"),
  applicationUrl: varchar("application_url"),
  urgency: varchar("urgency", { enum: ["low", "medium", "high"] }).default("medium"),
  viewCount: integer("view_count").default(0),
  applicationCount: integer("application_count").default(0),
  hasExam: boolean("has_exam").default(true),
  examPassingScore: integer("exam_passing_score").default(70),
  autoRankCandidates: boolean("auto_rank_candidates").default(true),
  maxChatCandidates: integer("max_chat_candidates").default(5),
  expiresAt: timestamp("expires_at"), // Job expiration to prevent applying to old jobs
  // Liveness and trust scoring fields for job quality ranking
  lastLivenessCheck: timestamp("last_liveness_check"),
  livenessStatus: varchar("liveness_status", { enum: ["active", "stale", "unknown"] }).default("unknown"),
  trustScore: integer("trust_score").default(50), // 0-100, internal/platform jobs get 100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint for external job deduplication
  jobExternalUnique: unique("job_external_unique").on(table.externalId, table.source),
  // Indices for common queries
  idxJobLiveness: index("idx_job_liveness").on(table.livenessStatus, table.expiresAt),
  idxJobTrustScore: index("idx_job_trust_score").on(table.trustScore),
  idxJobTalentOwner: index("idx_job_talent_owner").on(table.talentOwnerId),
}));

export const jobExams = pgTable("job_exams", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobPostings.id),
  title: varchar("title").notNull(),
  description: text("description"),
  timeLimit: integer("time_limit").default(30),
  passingScore: integer("passing_score").default(70),
  isActive: boolean("is_active").default(true),
  questions: jsonb("questions").default([] as any),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const examAttempts = pgTable("exam_attempts", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => jobExams.id),
  candidateId: uuid("candidate_id").notNull().references(() => users.id),
  jobId: integer("job_id").notNull().references(() => jobPostings.id),
  score: integer("score"),
  totalQuestions: integer("total_questions"),
  correctAnswers: integer("correct_answers"),
  timeSpent: integer("time_spent"),
  answers: jsonb("answers").default([] as any),
  status: varchar("status", { enum: ["in_progress", "completed", "abandoned"] }).default("in_progress"),
  passedExam: boolean("passed_exam").default(false),
  qualifiedForChat: boolean("qualified_for_chat").default(false),
  ranking: integer("ranking"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobMatches = pgTable("job_matches", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobPostings.id),
  candidateId: uuid("candidate_id").notNull().references(() => users.id),
  matchScore: integer("match_score").notNull().default(0),
  confidenceLevel: varchar("confidence_level", { enum: ["low", "medium", "high"] }).default("medium"),
  matchReasons: jsonb("match_reasons").default([] as any),
  skillMatches: jsonb("skill_matches").default([] as any),
  aiExplanation: text("ai_explanation"),
  status: varchar("status", { enum: ["pending", "viewed", "interested", "applied", "rejected"] }).default("pending"),
  userFeedback: integer("user_feedback"),
  feedbackReason: text("feedback_reason"),
  viewedAt: timestamp("viewed_at"),
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobPostings.id, { onDelete: 'cascade' }),
  candidateId: uuid("candidate_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  hiringManagerId: uuid("hiring_manager_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  examAttemptId: integer("exam_attempt_id").references(() => examAttempts.id, { onDelete: 'cascade' }),
  status: varchar("status", { enum: ["active", "closed"] }).default("active"),
  candidateRanking: integer("candidate_ranking"),
  accessGrantedAt: timestamp("access_granted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate chat rooms
  chatRoomUnique: unique('chat_room_unique').on(table.jobId, table.candidateId),
  idxChatRoomCandidate: index("idx_chat_room_candidate").on(table.candidateId),
}));

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").notNull().references(() => chatRooms.id, { onDelete: 'cascade' }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  autoFilled: boolean("auto_filled").default(false),
  resumeUrl: varchar("resume_url"),
  coverLetter: text("cover_letter"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate applications
  jobCandidateUnique: unique('job_candidate_unique').on(table.jobId, table.candidateId),
  idxApplicationCandidate: index("idx_application_candidate").on(table.candidateId),
  idxApplicationStatus: index("idx_application_status").on(table.status),
}));

export const applicationUpdates = pgTable("application_updates", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => jobApplications.id),
  previousStatus: varchar("previous_status"),
  newStatus: varchar("new_status").notNull(),
  message: text("message"),
  updatedBy: text("updated_by"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applicationEvents = pgTable("application_events", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => jobApplications.id),
  eventType: varchar("event_type", {
    enum: ["submitted", "viewed", "screened", "shortlisted", "rejected", "interview_scheduled", "interviewed", "decision_pending", "hired", "archived"]
  }).notNull(),
  actorRole: varchar("actor_role", { enum: ["system", "recruiter", "hiring_manager", "team_member"] }).notNull(),
  actorName: varchar("actor_name"),
  actorTitle: varchar("actor_title"),
  viewDuration: integer("view_duration"),
  candidateScore: integer("candidate_score"),
  candidateRanking: integer("candidate_ranking"),
  totalApplicants: integer("total_applicants"),
  feedback: text("feedback"),
  nextSteps: text("next_steps"),
  competitorProfile: text("competitor_profile"),
  visible: boolean("visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applicationInsights = pgTable("application_insights", {
  id: serial("id").primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => users.id),
  applicationId: integer("application_id").notNull().references(() => jobApplications.id),
  strengthsIdentified: jsonb("strengths_identified").default([] as any),
  improvementAreas: jsonb("improvement_areas").default([] as any),
  benchmarkViewTime: integer("benchmark_view_time"),
  actualViewTime: integer("actual_view_time"),
  benchmarkScore: integer("benchmark_score"),
  actualScore: integer("actual_score"),
  similarSuccessfulProfiles: jsonb("similar_successful_users").default([] as any),
  recommendedActions: jsonb("recommended_actions").default([] as any),
  successProbability: integer("success_probability"),
  supportiveMessage: text("supportive_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const matchFeedback = pgTable("match_feedback", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  matchId: integer("match_id").notNull().references(() => jobMatches.id),
  rating: integer("rating").notNull(),
  feedbackType: varchar("feedback_type", { enum: ["match_quality", "job_relevance", "timing", "requirements"] }),
  comment: text("comment"),
  improvementSuggestions: jsonb("improvement_suggestions").default([] as any),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
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
      "new_match",
      "new_application"
    ]
  }).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  read: boolean("read").default(false),
  priority: varchar("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
  relatedJobId: integer("related_job_id").references(() => jobPostings.id, { onDelete: 'cascade' }),
  relatedApplicationId: integer("related_application_id").references(() => jobApplications.id, { onDelete: 'cascade' }),
  relatedMatchId: integer("related_match_id").references(() => jobMatches.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

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
  quietHours: jsonb("quiet_hours"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => users.id),
  interviewerId: uuid("interviewer_id").notNull().references(() => users.id),
  jobId: integer("job_id").notNull().references(() => jobPostings.id),
  applicationId: integer("application_id").notNull().references(() => jobApplications.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull(),
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
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const savedJobs = pgTable("saved_jobs", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: integer("job_id").notNull().references(() => jobPostings.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.jobId] }),
  }
});

export const hiddenJobs = pgTable("hidden_jobs", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: integer("job_id").notNull().references(() => jobPostings.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.jobId] }),
  }
});

export const usersRelations = relations(users, ({ one, many }) => ({
  candidateProfile: one(candidateProfiles, {
    fields: [users.id],
    references: [candidateProfiles.userId],
  }),
  jobPostings: many(jobPostings),
  matches: many(jobMatches),
  chatMessages: many(chatMessages),
  activityLogs: many(activityLogs),
  savedJobs: many(savedJobs),
  hiddenJobs: many(hiddenJobs),
  talentOwnerProfile: one(talentOwnerProfiles, {
    fields: [users.id],
    references: [talentOwnerProfiles.userId],
  }),
}));

export const talentOwnerProfilesRelations = relations(talentOwnerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [talentOwnerProfiles.userId],
    references: [users.id],
  }),
}));


// The 'companiesRelations' has been temporarily removed.

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
  savedBy: many(savedJobs),
  hiddenBy: many(hiddenJobs),
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

// Screening questions for job applications
export const screeningQuestions = pgTable("screening_questions", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobPostings.id, { onDelete: 'cascade' }),
  question: text("question").notNull(),
  questionType: varchar("question_type", { enum: ["text", "multiple_choice", "yes_no"] }).default("text"),
  options: jsonb("options").default([] as any), // For multiple choice options
  isRequired: boolean("is_required").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const screeningAnswers = pgTable("screening_answers", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => jobApplications.id, { onDelete: 'cascade' }),
  questionId: integer("question_id").notNull().references(() => screeningQuestions.id, { onDelete: 'cascade' }),
  answer: text("answer"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate answers
  answerUnique: unique('answer_unique').on(table.applicationId, table.questionId),
}));

export const screeningQuestionsRelations = relations(screeningQuestions, ({ one, many }) => ({
  job: one(jobPostings, {
    fields: [screeningQuestions.jobId],
    references: [jobPostings.id],
  }),
  answers: many(screeningAnswers),
}));

export const screeningAnswersRelations = relations(screeningAnswers, ({ one }) => ({
  application: one(jobApplications, {
    fields: [screeningAnswers.applicationId],
    references: [jobApplications.id],
  }),
  question: one(screeningQuestions, {
    fields: [screeningAnswers.questionId],
    references: [screeningQuestions.id],
  }),
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  user: one(users, {
    fields: [savedJobs.userId],
    references: [users.id],
  }),
  job: one(jobPostings, {
    fields: [savedJobs.jobId],
    references: [jobPostings.id],
  }),
}));

export const hiddenJobsRelations = relations(hiddenJobs, ({ one }) => ({
  user: one(users, {
    fields: [hiddenJobs.userId],
    references: [users.id],
  }),
  job: one(jobPostings, {
    fields: [hiddenJobs.jobId],
    references: [jobPostings.id],
  }),
}));

// ==========================================
// SUBSCRIPTION & PAYMENT TABLES (Stripe)
// ==========================================

export const subscriptionTiers = pgTable("subscription_tiers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  type: varchar("type", { enum: ["candidate", "talent_owner"] }).notNull(),
  priceMonthly: integer("price_monthly").notNull(), // In cents
  priceYearly: integer("price_yearly"),
  features: jsonb("features").default([]),
  limits: jsonb("limits").default({}), // e.g., { "aiMatches": 10, "activeJobs": 3 }
  stripePriceIdMonthly: varchar("stripe_price_id_monthly"),
  stripePriceIdYearly: varchar("stripe_price_id_yearly"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tierId: integer("tier_id").references(() => subscriptionTiers.id),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  status: varchar("status", {
    enum: ["active", "canceled", "past_due", "trialing", "incomplete", "free"]
  }).default("free"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usageTracking = pgTable("usage_tracking", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  featureType: varchar("feature_type", {
    enum: ["ai_match", "job_post", "resume_enhancement", "candidate_ranking", "analytics"]
  }).notNull(),
  usageCount: integer("usage_count").default(0),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptionTiersRelations = relations(subscriptionTiers, ({ many }) => ({
  subscriptions: many(userSubscriptions),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
  tier: one(subscriptionTiers, {
    fields: [userSubscriptions.tierId],
    references: [subscriptionTiers.id],
  }),
}));

export const usageTrackingRelations = relations(usageTracking, ({ one }) => ({
  user: one(users, {
    fields: [usageTracking.userId],
    references: [users.id],
  }),
}));

// ==========================================
// INSERT SCHEMAS
// ==========================================

export const insertUserSchema = createInsertSchema(users);
export const insertCandidateProfileSchema = createInsertSchema(candidateProfiles);
export const insertTalentOwnerProfileSchema = createInsertSchema(talentOwnerProfiles);
export const insertJobPostingSchema = createInsertSchema(jobPostings);

// Update schema for job postings - all updatable fields are optional
export const updateJobPostingSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional().nullable(),
  salaryMin: z.number().optional().nullable(),
  salaryMax: z.number().optional().nullable(),
  workType: z.enum(["remote", "hybrid", "onsite"]).optional().nullable(),
  industry: z.string().optional().nullable(),
  status: z.enum(["active", "paused", "closed"]).optional(),
  hiringManagerId: z.string().uuid().optional().nullable(),
  externalUrl: z.string().optional().nullable(),
  careerPageUrl: z.string().optional().nullable(),
  companyLogoUrl: z.string().optional().nullable(),
  applicationUrl: z.string().optional().nullable(),
  urgency: z.enum(["low", "medium", "high"]).optional(),
  hasExam: z.boolean().optional(),
  examPassingScore: z.number().optional(),
  autoRankCandidates: z.boolean().optional(),
  maxChatCandidates: z.number().optional(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const insertJobMatchSchema = createInsertSchema(jobMatches);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences);
export const insertInterviewSchema = createInsertSchema(interviews);
export const insertConnectionStatusSchema = createInsertSchema(connectionStatus);
export const insertSubscriptionTierSchema = createInsertSchema(subscriptionTiers);
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions);
export const insertUsageTrackingSchema = createInsertSchema(usageTracking);

// Validation schema for interview scheduling
export const scheduleInterviewSchema = z.object({
  candidateId: z.string().uuid(),
  jobId: z.number().int().positive(),
  applicationId: z.number().int().positive(),
  scheduledAt: z.coerce.date().refine(d => d > new Date(), { message: "Interview must be scheduled in the future" }),
  duration: z.number().int().min(15).max(480).optional(),
  platform: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

// Validation schema for talent owner profile completion
export const completeTalentOwnerProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  jobTitle: z.string().min(1, "Job title is required"),
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  companyLocation: z.string().min(1, "Company location is required"),
  companyWebsite: z.string().url().optional().or(z.literal("")),
  companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"]).optional(),
  companyDescription: z.string().max(2000).optional(),
});

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
export type TalentOwnerProfile = typeof talentOwnerProfiles.$inferSelect;
export type InsertTalentOwnerProfile = z.infer<typeof insertTalentOwnerProfileSchema>;
export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type InsertSubscriptionTier = z.infer<typeof insertSubscriptionTierSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;

export const discoveredCompanies = pgTable("discovered_companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  normalizedName: varchar("normalizedName", { length: 255 }).notNull().unique(),
  careerPageUrl: varchar("careerPageUrl", { length: 500 }),
  discoverySource: varchar("discoverySource", { length: 100 }).notNull(),
  detectedAts: varchar("detectedAts", { length: 50 }),
  atsId: varchar("atsId", { length: 255 }),
  jobCount: integer("jobCount").default(0),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => {
  return {
    idx_discovered_status: index("idx_discovered_status").on(table.status),
    idx_discovered_ats: index("idx_discovered_ats").on(table.detectedAts),
  }
});


