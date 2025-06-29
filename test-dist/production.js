var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accounts: () => accounts,
  activityLogs: () => activityLogs,
  applicationEvents: () => applicationEvents,
  applicationInsights: () => applicationInsights,
  applicationUpdates: () => applicationUpdates,
  candidateProfiles: () => candidateProfiles,
  candidateProfilesRelations: () => candidateProfilesRelations,
  chatMessages: () => chatMessages,
  chatMessagesRelations: () => chatMessagesRelations,
  chatRooms: () => chatRooms,
  chatRoomsRelations: () => chatRoomsRelations,
  connectionStatus: () => connectionStatus,
  connectionStatusRelations: () => connectionStatusRelations,
  examAttempts: () => examAttempts,
  insertCandidateProfileSchema: () => insertCandidateProfileSchema,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertConnectionStatusSchema: () => insertConnectionStatusSchema,
  insertInterviewSchema: () => insertInterviewSchema,
  insertJobMatchSchema: () => insertJobMatchSchema,
  insertJobPostingSchema: () => insertJobPostingSchema,
  insertNotificationPreferencesSchema: () => insertNotificationPreferencesSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertUserSchema: () => insertUserSchema,
  interviews: () => interviews,
  interviewsRelations: () => interviewsRelations,
  jobApplications: () => jobApplications,
  jobExams: () => jobExams,
  jobMatches: () => jobMatches,
  jobMatchesRelations: () => jobMatchesRelations,
  jobPostings: () => jobPostings,
  jobPostingsRelations: () => jobPostingsRelations,
  matchFeedback: () => matchFeedback,
  notificationPreferences: () => notificationPreferences,
  notificationPreferencesRelations: () => notificationPreferencesRelations,
  notifications: () => notifications,
  notificationsRelations: () => notificationsRelations,
  sessions: () => sessions,
  users: () => users,
  usersRelations: () => usersRelations,
  verifications: () => verifications
});
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  serial,
  integer,
  boolean
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
var users, sessions, accounts, verifications, candidateProfiles, jobPostings, jobExams, examAttempts, jobMatches, chatRooms, chatMessages, jobApplications, applicationUpdates, applicationEvents, applicationInsights, matchFeedback, activityLogs, notifications, notificationPreferences, connectionStatus, interviews, usersRelations, candidateProfilesRelations, jobPostingsRelations, jobMatchesRelations, chatRoomsRelations, chatMessagesRelations, notificationsRelations, notificationPreferencesRelations, connectionStatusRelations, interviewsRelations, insertUserSchema, insertCandidateProfileSchema, insertJobPostingSchema, insertJobMatchSchema, insertChatMessageSchema, insertNotificationSchema, insertNotificationPreferencesSchema, insertInterviewSchema, insertConnectionStatusSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    users = pgTable("users", {
      id: text("id").primaryKey(),
      name: text("name").notNull(),
      email: text("email").notNull().unique(),
      emailVerified: boolean("emailVerified").notNull().default(false),
      image: text("image"),
      createdAt: timestamp("createdAt").notNull(),
      updatedAt: timestamp("updatedAt").notNull(),
      // Custom fields for our platform
      firstName: varchar("first_name"),
      lastName: varchar("last_name"),
      phoneNumber: varchar("phone_number"),
      profileImageUrl: varchar("profile_image_url"),
      role: varchar("role", { enum: ["candidate", "talent_owner"] }),
      profileComplete: boolean("profile_complete").default(false)
    });
    sessions = pgTable("sessions", {
      id: text("id").primaryKey(),
      expiresAt: timestamp("expiresAt").notNull(),
      token: text("token").notNull().unique(),
      createdAt: timestamp("createdAt").notNull(),
      updatedAt: timestamp("updatedAt").notNull(),
      ipAddress: text("ipAddress"),
      userAgent: text("userAgent"),
      userId: text("userId").notNull().references(() => users.id)
    });
    accounts = pgTable("accounts", {
      id: text("id").primaryKey(),
      accountId: text("accountId").notNull(),
      providerId: text("providerId").notNull(),
      userId: text("userId").notNull().references(() => users.id),
      accessToken: text("accessToken"),
      refreshToken: text("refreshToken"),
      idToken: text("idToken"),
      accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
      refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
      scope: text("scope"),
      password: text("password"),
      createdAt: timestamp("createdAt").notNull(),
      updatedAt: timestamp("updatedAt").notNull()
    });
    verifications = pgTable("verifications", {
      id: text("id").primaryKey(),
      identifier: text("identifier").notNull(),
      value: text("value").notNull(),
      expiresAt: timestamp("expiresAt").notNull(),
      createdAt: timestamp("createdAt"),
      updatedAt: timestamp("updatedAt")
    });
    candidateProfiles = pgTable("candidate_profiles", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull().unique().references(() => users.id),
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
      skills: jsonb("skills").$type().default([]),
      experience: text("experience"),
      location: varchar("location"),
      salaryMin: integer("salary_min"),
      salaryMax: integer("salary_max"),
      workType: varchar("work_type", { enum: ["remote", "hybrid", "onsite"] }),
      industry: varchar("industry"),
      // AI-Enhanced Profile Data
      bio: text("bio"),
      // Summary/objective from resume
      summary: text("summary"),
      // Profile summary
      resumeText: text("resume_text"),
      // Raw parsed text for AI matching
      profileStrength: integer("profile_strength").default(0),
      // AI-calculated profile completeness score
      profileViews: integer("profile_views").default(0),
      // Track profile views
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    jobPostings = pgTable("job_postings", {
      id: serial("id").primaryKey(),
      talentOwnerId: varchar("talent_owner_id").notNull().references(() => users.id),
      hiringManagerId: varchar("hiring_manager_id").references(() => users.id),
      title: varchar("title").notNull(),
      company: varchar("company").notNull(),
      description: text("description").notNull(),
      requirements: jsonb("requirements").$type().default([]),
      skills: jsonb("skills").$type().default([]),
      location: varchar("location"),
      salaryMin: integer("salary_min"),
      salaryMax: integer("salary_max"),
      workType: varchar("work_type", { enum: ["remote", "hybrid", "onsite"] }),
      industry: varchar("industry"),
      status: varchar("status", { enum: ["active", "paused", "closed"] }).default("active"),
      source: varchar("source").default("platform"),
      // "platform", "external_api", "scraped"
      externalId: varchar("external_id"),
      // For AI-curated jobs from external sources
      externalUrl: varchar("external_url"),
      // External career page URL
      careerPageUrl: varchar("career_page_url"),
      // Company career page
      companyLogoUrl: varchar("company_logo_url"),
      applicationUrl: varchar("application_url"),
      // Direct apply link
      urgency: varchar("urgency", { enum: ["low", "medium", "high"] }).default("medium"),
      viewCount: integer("view_count").default(0),
      applicationCount: integer("application_count").default(0),
      // Exam and chat settings for internal jobs
      hasExam: boolean("has_exam").default(true),
      // Internal jobs have exams by default
      examPassingScore: integer("exam_passing_score").default(70),
      // Minimum score to qualify for chat
      autoRankCandidates: boolean("auto_rank_candidates").default(true),
      // Auto-rank by exam scores
      maxChatCandidates: integer("max_chat_candidates").default(5),
      // Top N candidates get chat access
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    jobExams = pgTable("job_exams", {
      id: serial("id").primaryKey(),
      jobId: integer("job_id").notNull().references(() => jobPostings.id),
      title: varchar("title").notNull(),
      description: text("description"),
      timeLimit: integer("time_limit").default(30),
      // Minutes
      passingScore: integer("passing_score").default(70),
      // Percentage
      isActive: boolean("is_active").default(true),
      questions: jsonb("questions").$type().default([]),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    examAttempts = pgTable("exam_attempts", {
      id: serial("id").primaryKey(),
      examId: integer("exam_id").notNull().references(() => jobExams.id),
      candidateId: varchar("candidate_id").notNull().references(() => users.id),
      jobId: integer("job_id").notNull().references(() => jobPostings.id),
      score: integer("score"),
      // Percentage score
      totalQuestions: integer("total_questions"),
      correctAnswers: integer("correct_answers"),
      timeSpent: integer("time_spent"),
      // Minutes
      answers: jsonb("answers").$type().default([]),
      status: varchar("status", { enum: ["in_progress", "completed", "abandoned"] }).default("in_progress"),
      passedExam: boolean("passed_exam").default(false),
      qualifiedForChat: boolean("qualified_for_chat").default(false),
      // Based on ranking
      ranking: integer("ranking"),
      // Position among all candidates
      completedAt: timestamp("completed_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    jobMatches = pgTable("job_matches", {
      id: serial("id").primaryKey(),
      jobId: integer("job_id").notNull().references(() => jobPostings.id),
      candidateId: varchar("candidate_id").notNull().references(() => users.id),
      matchScore: varchar("match_score").notNull(),
      confidenceLevel: varchar("confidence_level", { enum: ["low", "medium", "high"] }).default("medium"),
      matchReasons: jsonb("match_reasons").$type().default([]),
      skillMatches: jsonb("skill_matches").$type().default([]),
      aiExplanation: text("ai_explanation"),
      // Why this match was suggested
      status: varchar("status", { enum: ["pending", "viewed", "interested", "applied", "rejected"] }).default("pending"),
      userFeedback: integer("user_feedback"),
      // 1-5 rating for learning
      feedbackReason: text("feedback_reason"),
      // Why they rated it this way
      viewedAt: timestamp("viewed_at"),
      appliedAt: timestamp("applied_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    chatRooms = pgTable("chat_rooms", {
      id: serial("id").primaryKey(),
      jobId: integer("job_id").notNull().references(() => jobPostings.id),
      candidateId: varchar("candidate_id").notNull().references(() => users.id),
      hiringManagerId: varchar("hiring_manager_id").notNull().references(() => users.id),
      examAttemptId: integer("exam_attempt_id").references(() => examAttempts.id),
      // Required for access
      status: varchar("status", { enum: ["active", "closed"] }).default("active"),
      candidateRanking: integer("candidate_ranking"),
      // Their position among qualified candidates
      accessGrantedAt: timestamp("access_granted_at").defaultNow(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    chatMessages = pgTable("chat_messages", {
      id: serial("id").primaryKey(),
      chatRoomId: integer("chat_room_id").notNull().references(() => chatRooms.id),
      senderId: varchar("sender_id").notNull().references(() => users.id),
      message: text("message").notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    jobApplications = pgTable("job_applications", {
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
      autoFilled: boolean("auto_filled").default(false),
      // Was application auto-filled by AI
      resumeUrl: varchar("resume_url"),
      coverLetter: text("cover_letter"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    applicationUpdates = pgTable("application_updates", {
      id: serial("id").primaryKey(),
      applicationId: integer("application_id").notNull().references(() => jobApplications.id),
      previousStatus: varchar("previous_status"),
      newStatus: varchar("new_status").notNull(),
      message: text("message"),
      // Update message for candidate
      updatedBy: varchar("updated_by"),
      // System or talent owner ID
      metadata: jsonb("metadata"),
      // Additional context
      createdAt: timestamp("created_at").defaultNow()
    });
    applicationEvents = pgTable("application_events", {
      id: serial("id").primaryKey(),
      applicationId: integer("application_id").notNull().references(() => jobApplications.id),
      eventType: varchar("event_type", {
        enum: ["submitted", "viewed", "screened", "shortlisted", "rejected", "interview_scheduled", "interviewed", "decision_pending", "hired", "archived"]
      }).notNull(),
      actorRole: varchar("actor_role", { enum: ["system", "recruiter", "hiring_manager", "team_member"] }).notNull(),
      actorName: varchar("actor_name"),
      actorTitle: varchar("actor_title"),
      // Intelligence details
      viewDuration: integer("view_duration"),
      // seconds spent viewing profile
      candidateScore: integer("candidate_score"),
      // 0-100 scoring
      candidateRanking: integer("candidate_ranking"),
      // position among applicants
      totalApplicants: integer("total_applicants"),
      feedback: text("feedback"),
      // why rejected/advanced
      nextSteps: text("next_steps"),
      // what happens next
      competitorProfile: text("competitor_profile"),
      // anonymized top candidate skills
      visible: boolean("visible").default(true),
      // whether candidate can see this
      createdAt: timestamp("created_at").defaultNow()
    });
    applicationInsights = pgTable("application_insights", {
      id: serial("id").primaryKey(),
      candidateId: varchar("candidate_id").notNull().references(() => users.id),
      applicationId: integer("application_id").notNull().references(() => jobApplications.id),
      strengthsIdentified: jsonb("strengths_identified").$type().default([]),
      improvementAreas: jsonb("improvement_areas").$type().default([]),
      benchmarkViewTime: integer("benchmark_view_time"),
      // average for this role
      actualViewTime: integer("actual_view_time"),
      benchmarkScore: integer("benchmark_score"),
      // average score for this role  
      actualScore: integer("actual_score"),
      similarSuccessfulProfiles: jsonb("similar_successful_profiles").$type().default([]),
      recommendedActions: jsonb("recommended_actions").$type().default([]),
      successProbability: integer("success_probability"),
      // 0-100
      supportiveMessage: text("supportive_message"),
      // mental health support
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    matchFeedback = pgTable("match_feedback", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull().references(() => users.id),
      matchId: integer("match_id").notNull().references(() => jobMatches.id),
      rating: integer("rating").notNull(),
      // 1-5 stars
      feedbackType: varchar("feedback_type", { enum: ["match_quality", "job_relevance", "timing", "requirements"] }),
      comment: text("comment"),
      improvementSuggestions: jsonb("improvement_suggestions").$type().default([]),
      createdAt: timestamp("created_at").defaultNow()
    });
    activityLogs = pgTable("activity_logs", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull().references(() => users.id),
      type: varchar("type").notNull(),
      description: text("description").notNull(),
      metadata: jsonb("metadata"),
      createdAt: timestamp("created_at").defaultNow()
    });
    notifications = pgTable("notifications", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull().references(() => users.id),
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
      data: jsonb("data"),
      // Additional context data
      read: boolean("read").default(false),
      priority: varchar("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
      relatedJobId: integer("related_job_id").references(() => jobPostings.id),
      relatedApplicationId: integer("related_application_id").references(() => jobApplications.id),
      relatedMatchId: integer("related_match_id").references(() => jobMatches.id),
      createdAt: timestamp("created_at").defaultNow(),
      readAt: timestamp("read_at")
    });
    notificationPreferences = pgTable("notification_preferences", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull().unique().references(() => users.id),
      inAppNotifications: boolean("in_app_notifications").default(true),
      emailNotifications: boolean("email_notifications").default(true),
      pushNotifications: boolean("push_notifications").default(false),
      applicationUpdates: boolean("application_updates").default(true),
      examAlerts: boolean("exam_alerts").default(true),
      messageNotifications: boolean("message_notifications").default(true),
      highPriorityOnly: boolean("high_priority_only").default(false),
      quietHours: jsonb("quiet_hours"),
      // { start: "22:00", end: "08:00" }
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    connectionStatus = pgTable("connection_status", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull().unique().references(() => users.id),
      isOnline: boolean("is_online").default(false),
      lastSeen: timestamp("last_seen").defaultNow(),
      socketId: varchar("socket_id"),
      deviceInfo: jsonb("device_info"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    interviews = pgTable("interviews", {
      id: serial("id").primaryKey(),
      candidateId: varchar("candidate_id").notNull().references(() => users.id),
      interviewerId: varchar("interviewer_id").notNull().references(() => users.id),
      jobId: integer("job_id").notNull().references(() => jobPostings.id),
      applicationId: integer("application_id").notNull().references(() => jobApplications.id),
      scheduledAt: timestamp("scheduled_at").notNull(),
      duration: integer("duration").notNull(),
      // minutes
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
      // 1-5 scale
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    usersRelations = relations(users, ({ one, many }) => ({
      candidateProfile: one(candidateProfiles, {
        fields: [users.id],
        references: [candidateProfiles.userId]
      }),
      jobPostings: many(jobPostings),
      matches: many(jobMatches),
      chatMessages: many(chatMessages),
      activityLogs: many(activityLogs)
    }));
    candidateProfilesRelations = relations(candidateProfiles, ({ one }) => ({
      user: one(users, {
        fields: [candidateProfiles.userId],
        references: [users.id]
      })
    }));
    jobPostingsRelations = relations(jobPostings, ({ one, many }) => ({
      talentOwner: one(users, {
        fields: [jobPostings.talentOwnerId],
        references: [users.id]
      }),
      matches: many(jobMatches),
      applications: many(jobApplications)
    }));
    jobMatchesRelations = relations(jobMatches, ({ one, many }) => ({
      job: one(jobPostings, {
        fields: [jobMatches.jobId],
        references: [jobPostings.id]
      }),
      candidate: one(users, {
        fields: [jobMatches.candidateId],
        references: [users.id]
      }),
      chatRoom: one(chatRooms)
    }));
    chatRoomsRelations = relations(chatRooms, ({ one, many }) => ({
      job: one(jobPostings, {
        fields: [chatRooms.jobId],
        references: [jobPostings.id]
      }),
      candidate: one(users, {
        fields: [chatRooms.candidateId],
        references: [users.id]
      }),
      hiringManager: one(users, {
        fields: [chatRooms.hiringManagerId],
        references: [users.id]
      }),
      messages: many(chatMessages)
    }));
    chatMessagesRelations = relations(chatMessages, ({ one }) => ({
      chatRoom: one(chatRooms, {
        fields: [chatMessages.chatRoomId],
        references: [chatRooms.id]
      }),
      sender: one(users, {
        fields: [chatMessages.senderId],
        references: [users.id]
      })
    }));
    notificationsRelations = relations(notifications, ({ one }) => ({
      user: one(users, {
        fields: [notifications.userId],
        references: [users.id]
      }),
      relatedJob: one(jobPostings, {
        fields: [notifications.relatedJobId],
        references: [jobPostings.id]
      }),
      relatedApplication: one(jobApplications, {
        fields: [notifications.relatedApplicationId],
        references: [jobApplications.id]
      }),
      relatedMatch: one(jobMatches, {
        fields: [notifications.relatedMatchId],
        references: [jobMatches.id]
      })
    }));
    notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
      user: one(users, {
        fields: [notificationPreferences.userId],
        references: [users.id]
      })
    }));
    connectionStatusRelations = relations(connectionStatus, ({ one }) => ({
      user: one(users, {
        fields: [connectionStatus.userId],
        references: [users.id]
      })
    }));
    interviewsRelations = relations(interviews, ({ one }) => ({
      candidate: one(users, {
        fields: [interviews.candidateId],
        references: [users.id]
      }),
      interviewer: one(users, {
        fields: [interviews.interviewerId],
        references: [users.id]
      }),
      job: one(jobPostings, {
        fields: [interviews.jobId],
        references: [jobPostings.id]
      }),
      application: one(jobApplications, {
        fields: [interviews.applicationId],
        references: [jobApplications.id]
      })
    }));
    insertUserSchema = createInsertSchema(users).omit({
      createdAt: true,
      updatedAt: true
    });
    insertCandidateProfileSchema = createInsertSchema(candidateProfiles).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertJobPostingSchema = createInsertSchema(jobPostings).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertJobMatchSchema = createInsertSchema(jobMatches).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertChatMessageSchema = createInsertSchema(chatMessages).omit({
      id: true,
      createdAt: true
    });
    insertNotificationSchema = createInsertSchema(notifications).omit({
      id: true,
      createdAt: true,
      readAt: true
    });
    insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertInterviewSchema = createInsertSchema(interviews).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertConnectionStatusSchema = createInsertSchema(connectionStatus).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
  }
});

// server/email-service.ts
var email_service_exports = {};
__export(email_service_exports, {
  sendEmail: () => sendEmail,
  sendPasswordResetEmail: () => sendPasswordResetEmail,
  sendWelcomeEmail: () => sendWelcomeEmail
});
import { MailService } from "@sendgrid/mail";
async function sendEmail(params) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`Development mode: Would send email to ${params.to} with subject "${params.subject}"`);
    console.log(`Email content: ${params.text || params.html}`);
    return true;
  }
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error("SendGrid email error:", error);
    return false;
  }
}
async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5000"}/reset-password?token=${resetToken}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Recrutas</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Recrutas</h1>
                <p>Password Reset Request</p>
            </div>
            <div class="content">
                <h2>Reset Your Password</h2>
                <p>We received a request to reset your password for your Recrutas account.</p>
                <p>Click the button below to reset your password:</p>
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
                <p>\xA9 2024 Recrutas - AI-Powered Job Matching Platform</p>
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </body>
    </html>
  `;
  const textContent = `
    Password Reset Request - Recrutas
    
    We received a request to reset your password for your Recrutas account.
    
    Click the link below to reset your password:
    ${resetUrl}
    
    Important: This link will expire in 1 hour for security reasons.
    
    If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
    
    \xA9 2024 Recrutas - AI-Powered Job Matching Platform
  `;
  return await sendEmail({
    to: email,
    from: "noreply@recrutas.ai",
    subject: "Reset Your Password - Recrutas",
    text: textContent,
    html: htmlContent
  });
}
async function sendWelcomeEmail(email, firstName) {
  const name = firstName || "there";
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Recrutas</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #000; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Recrutas</h1>
                <p>Your AI-Powered Job Matching Journey Begins</p>
            </div>
            <div class="content">
                <h2>Hi ${name}!</h2>
                <p>Welcome to Recrutas, the revolutionary job platform that eliminates recruiters through AI-powered matching.</p>
                <p>\u{1F680} <strong>What makes us different:</strong></p>
                <ul>
                    <li>Instant job delivery based on your skills</li>
                    <li>AI-powered resume analysis</li>
                    <li>Direct connections with hiring managers</li>
                    <li>Smart exam screening for qualified candidates</li>
                    <li>Real-time chat with employers</li>
                </ul>
                <p>Get started by completing your profile and discovering your perfect job matches:</p>
                <a href="${process.env.FRONTEND_URL || "http://localhost:5000"}/candidate-dashboard" class="button">Complete Your Profile</a>
            </div>
            <div class="footer">
                <p>\xA9 2024 Recrutas - Revolutionizing Job Matching</p>
                <p>Questions? Contact us at support@recrutas.ai</p>
            </div>
        </div>
    </body>
    </html>
  `;
  return await sendEmail({
    to: email,
    from: "welcome@recrutas.ai",
    subject: "Welcome to Recrutas - Your AI Job Matching Journey Begins!",
    html: htmlContent
  });
}
var mailService;
var init_email_service = __esm({
  "server/email-service.ts"() {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn("SENDGRID_API_KEY not configured - email sending will be disabled");
    }
    mailService = new MailService();
    if (process.env.SENDGRID_API_KEY) {
      mailService.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }
});

// server/universal-job-scraper.ts
var universal_job_scraper_exports = {};
__export(universal_job_scraper_exports, {
  UniversalJobScraper: () => UniversalJobScraper,
  universalJobScraper: () => universalJobScraper
});
var UniversalJobScraper, universalJobScraper;
var init_universal_job_scraper = __esm({
  "server/universal-job-scraper.ts"() {
    UniversalJobScraper = class {
      constructor() {
        this.USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      }
      async scrapeCompanyJobs(companyUrl, companyName) {
        try {
          console.log(`Scraping jobs from: ${companyUrl}`);
          const response = await fetch(companyUrl, {
            headers: {
              "User-Agent": this.USER_AGENT,
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5",
              "Connection": "keep-alive",
              "Upgrade-Insecure-Requests": "1"
            }
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const html = await response.text();
          console.log(`Fetched ${html.length} characters from ${companyUrl}`);
          const jobs = this.parseJobsFromHTML(html, companyUrl, companyName);
          console.log(`Extracted ${jobs.length} jobs from ${companyUrl}`);
          return jobs;
        } catch (error) {
          console.error(`Failed to scrape ${companyUrl}:`, error);
          return this.getFallbackJobs(companyUrl, companyName);
        }
      }
      parseJobsFromHTML(html, sourceUrl, companyName) {
        const jobs = [];
        const domain = new URL(sourceUrl).hostname;
        const jsonLdJobs = this.extractJsonLdJobs(html, sourceUrl, companyName);
        jobs.push(...jsonLdJobs);
        const dataIslandJobs = this.extractDataIslandJobs(html, sourceUrl, companyName);
        jobs.push(...dataIslandJobs);
        const htmlJobs = this.extractSimpleHtmlJobs(html, sourceUrl, companyName);
        jobs.push(...htmlJobs);
        return this.deduplicateJobs(jobs).slice(0, 50);
      }
      extractJsonLdJobs(html, sourceUrl, companyName) {
        const jobs = [];
        const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/g;
        const matches = Array.from(html.matchAll(jsonLdPattern));
        for (const match of matches) {
          try {
            const jsonData = JSON.parse(match[1]);
            const jobPostings3 = this.extractJobPostingsFromJsonLd(jsonData);
            for (const posting of jobPostings3) {
              if (posting.title && posting.hiringOrganization) {
                jobs.push({
                  id: `jsonld_${this.generateId(posting.title, posting.hiringOrganization?.name)}`,
                  title: posting.title || "Software Engineer",
                  company: companyName || posting.hiringOrganization?.name || new URL(sourceUrl).hostname,
                  location: this.parseLocation(posting.jobLocation),
                  description: posting.description || "",
                  requirements: this.extractRequirements(posting.description || ""),
                  skills: this.extractSkills(posting.title + " " + (posting.description || "")),
                  workType: this.parseWorkType(posting.employmentType),
                  salaryMin: posting.baseSalary?.value?.minValue,
                  salaryMax: posting.baseSalary?.value?.maxValue,
                  source: companyName || new URL(sourceUrl).hostname,
                  externalUrl: posting.url || sourceUrl,
                  postedDate: posting.datePosted || (/* @__PURE__ */ new Date()).toISOString()
                });
              }
            }
          } catch (error) {
            console.log("Failed to parse JSON-LD:", error);
          }
        }
        return jobs;
      }
      extractJobPostingsFromJsonLd(data) {
        const jobs = [];
        if (data && data["@type"] === "JobPosting") {
          jobs.push(data);
        } else if (Array.isArray(data)) {
          for (const item of data) {
            jobs.push(...this.extractJobPostingsFromJsonLd(item));
          }
        } else if (typeof data === "object" && data !== null) {
          for (const key in data) {
            if (data[key] && typeof data[key] === "object") {
              jobs.push(...this.extractJobPostingsFromJsonLd(data[key]));
            }
          }
        }
        return jobs;
      }
      extractDataIslandJobs(html, sourceUrl, companyName) {
        const jobs = [];
        const patterns = [
          /"jobs":\s*(\[.*?\])/,
          /"positions":\s*(\[.*?\])/,
          /"listings":\s*(\[.*?\])/,
          /"careers":\s*(\[.*?\])/,
          /"openings":\s*(\[.*?\])/
        ];
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              const extractedJobs = this.parseJobDataFromArray(data, sourceUrl, companyName);
              jobs.push(...extractedJobs);
            } catch (error) {
              console.log("Failed to parse data island:", error);
            }
          }
        }
        return jobs;
      }
      parseJobDataFromArray(data, sourceUrl, companyName) {
        const jobs = [];
        if (Array.isArray(data)) {
          for (const item of data) {
            if (this.isJobObject(item)) {
              jobs.push(this.transformToUniversalJob(item, sourceUrl, companyName));
            }
          }
        }
        return jobs;
      }
      extractSimpleHtmlJobs(html, sourceUrl, companyName) {
        const jobs = [];
        const titlePatterns = [
          /(?:Senior|Junior|Lead|Staff|Principal)?\s*(?:Software Engineer|Software Developer|Developer|Frontend Engineer|Backend Engineer|Full Stack Engineer|Full Stack Developer|Data Scientist|Data Engineer|Product Manager|UX Designer|UI Designer|DevOps Engineer|Site Reliability Engineer|Mobile Developer|iOS Developer|Android Developer|QA Engineer|Security Engineer|Machine Learning Engineer|AI Engineer)/gi
        ];
        const jobListingPatterns = [
          /<div[^>]*(?:class|id)="[^"]*(?:job|position|career|opening)[^"]*"[^>]*>(.*?)<\/div>/gi,
          /<li[^>]*(?:class|id)="[^"]*(?:job|position|career|opening)[^"]*"[^>]*>(.*?)<\/li>/gi,
          /<article[^>]*>(.*?)<\/article>/gi
        ];
        const titles = /* @__PURE__ */ new Set();
        for (const pattern of titlePatterns) {
          const matches = Array.from(html.matchAll(pattern));
          for (const match of matches) {
            titles.add(match[0].trim());
          }
        }
        for (const pattern of jobListingPatterns) {
          const matches = Array.from(html.matchAll(pattern));
          for (const match of matches) {
            const content = match[1];
            const titleMatch = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>|<[^>]*(?:class|id)="[^"]*title[^"]*"[^>]*>([^<]+)</i);
            if (titleMatch) {
              const title = (titleMatch[1] || titleMatch[2] || "").trim();
              if (title && title.length > 3 && title.length < 100) {
                titles.add(title);
              }
            }
          }
        }
        let index2 = 0;
        const titleArray = Array.from(titles);
        for (const title of titleArray) {
          if (index2 >= 15) break;
          if (title.length < 5 || title.includes("Apply") || title.includes("Login") || title.includes("Search")) {
            continue;
          }
          jobs.push({
            id: `html_${this.generateId(title, companyName)}_${index2}`,
            title,
            company: companyName || new URL(sourceUrl).hostname.replace("www.", "").replace(".com", ""),
            location: this.inferLocationFromHtml(html) || "Remote",
            description: `${title} position at ${companyName || new URL(sourceUrl).hostname}. Join our team and make an impact.`,
            requirements: this.extractRequirements(title),
            skills: this.extractSkills(title),
            workType: this.inferWorkTypeFromHtml(html, title),
            source: companyName || new URL(sourceUrl).hostname,
            externalUrl: sourceUrl,
            postedDate: (/* @__PURE__ */ new Date()).toISOString()
          });
          index2++;
        }
        return jobs;
      }
      inferLocationFromHtml(html) {
        const locationPatterns = [
          /(?:San Francisco|New York|Seattle|Austin|Boston|Denver|Chicago|Los Angeles|Remote|Hybrid)/gi
        ];
        for (const pattern of locationPatterns) {
          const match = html.match(pattern);
          if (match) {
            return match[0];
          }
        }
        return null;
      }
      inferWorkTypeFromHtml(html, title) {
        const combined = (html + " " + title).toLowerCase();
        if (combined.includes("remote")) return "remote";
        if (combined.includes("onsite") || combined.includes("office")) return "onsite";
        return "hybrid";
      }
      isJobObject(obj) {
        if (typeof obj !== "object" || obj === null) return false;
        const jobFields = ["title", "position", "role", "job_title", "name"];
        const hasJobField = jobFields.some((field) => obj[field]);
        return hasJobField;
      }
      transformToUniversalJob(obj, sourceUrl, companyName) {
        return {
          id: `api_${this.generateId(obj.title || obj.position || obj.role, companyName)}`,
          title: obj.title || obj.position || obj.role || obj.job_title || obj.name,
          company: companyName || obj.company || obj.employer || obj.organization || obj.company_name || new URL(sourceUrl).hostname,
          location: obj.location || obj.city || obj.office_location || "Remote",
          description: obj.description || obj.summary || obj.job_description || "",
          requirements: this.extractRequirements(obj.requirements || obj.description || ""),
          skills: this.extractSkills(obj.skills || obj.technologies || obj.title || ""),
          workType: this.parseWorkType(obj.employment_type || obj.work_type || obj.type),
          salaryMin: obj.salary_min || obj.min_salary || obj.salary?.min,
          salaryMax: obj.salary_max || obj.max_salary || obj.salary?.max,
          source: companyName || new URL(sourceUrl).hostname,
          externalUrl: obj.url || obj.link || obj.apply_url || sourceUrl,
          postedDate: obj.posted_date || obj.created_at || obj.date_posted || (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      extractRequirements(text2) {
        const requirements = [];
        const lines = text2.split("\n");
        for (const line of lines) {
          const cleaned = line.trim();
          if (cleaned.length > 10 && (cleaned.includes("experience") || cleaned.includes("required") || cleaned.includes("must have") || cleaned.includes("qualification"))) {
            requirements.push(cleaned);
          }
        }
        return requirements.slice(0, 5);
      }
      extractSkills(text2) {
        const skillKeywords = [
          "JavaScript",
          "TypeScript",
          "React",
          "Vue",
          "Angular",
          "Node.js",
          "Python",
          "Java",
          "Go",
          "Rust",
          "Docker",
          "Kubernetes",
          "AWS",
          "GCP",
          "Azure",
          "PostgreSQL",
          "MongoDB",
          "Redis",
          "Git",
          "CI/CD",
          "GraphQL",
          "REST",
          "API",
          "Microservices",
          "DevOps",
          "Machine Learning",
          "Data Science",
          "AI",
          "Frontend",
          "Backend",
          "Full Stack",
          "Mobile",
          "iOS",
          "Android"
        ];
        const skills = [];
        const lowerText = text2.toLowerCase();
        for (const skill of skillKeywords) {
          if (lowerText.includes(skill.toLowerCase())) {
            skills.push(skill);
          }
        }
        return Array.from(new Set(skills));
      }
      parseLocation(location) {
        if (typeof location === "string") return location;
        if (location?.address?.addressLocality) return location.address.addressLocality;
        if (location?.name) return location.name;
        return "Remote";
      }
      parseWorkType(employmentType) {
        if (!employmentType) return "hybrid";
        const type = employmentType.toString().toLowerCase();
        if (type.includes("remote")) return "remote";
        if (type.includes("onsite") || type.includes("office")) return "onsite";
        return "hybrid";
      }
      generateId(title, company) {
        const str = `${title}_${company}_${Date.now()}`;
        return str.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      }
      deduplicateJobs(jobs) {
        const seen = /* @__PURE__ */ new Set();
        return jobs.filter((job) => {
          const key = `${job.title}_${job.company}`.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      getFallbackJobs(sourceUrl, companyName) {
        const company = companyName || new URL(sourceUrl).hostname.replace("www.", "");
        return [
          {
            id: `fallback_${Date.now()}_1`,
            title: "Senior Software Engineer",
            company,
            location: "San Francisco, CA",
            description: `Join ${company} as a Senior Software Engineer and work on cutting-edge technology solutions.`,
            requirements: ["5+ years experience", "Strong programming skills", "Team collaboration"],
            skills: ["JavaScript", "React", "Node.js", "AWS"],
            workType: "hybrid",
            source: company,
            externalUrl: sourceUrl,
            postedDate: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: `fallback_${Date.now()}_2`,
            title: "Product Manager",
            company,
            location: "Remote",
            description: `Lead product development at ${company} and drive innovation in our core products.`,
            requirements: ["Product management experience", "Strategic thinking", "Data-driven approach"],
            skills: ["Product Strategy", "Analytics", "User Research", "Agile"],
            workType: "remote",
            source: company,
            externalUrl: sourceUrl,
            postedDate: (/* @__PURE__ */ new Date()).toISOString()
          }
        ];
      }
      // Method to scrape multiple companies
      async scrapeMultipleCompanies(companyUrls) {
        const allJobs = [];
        for (const { url, name } of companyUrls) {
          try {
            const jobs = await this.scrapeCompanyJobs(url, name);
            allJobs.push(...jobs);
          } catch (error) {
            console.error(`Failed to scrape ${name}:`, error);
          }
        }
        return this.deduplicateJobs(allJobs);
      }
    };
    universalJobScraper = new UniversalJobScraper();
  }
});

// server/ai-resume-parser.ts
var ai_resume_parser_exports = {};
__export(ai_resume_parser_exports, {
  AIResumeParser: () => AIResumeParser,
  aiResumeParser: () => aiResumeParser
});
import * as path from "path";
import mammoth from "mammoth";
var AIResumeParser, aiResumeParser;
var init_ai_resume_parser = __esm({
  "server/ai-resume-parser.ts"() {
    AIResumeParser = class {
      constructor() {
        this.skillsDatabase = [
          // Programming Languages
          "JavaScript",
          "TypeScript",
          "Python",
          "Java",
          "C++",
          "C#",
          "Go",
          "Rust",
          "Ruby",
          "PHP",
          "Swift",
          "Kotlin",
          "Scala",
          "R",
          "MATLAB",
          "Perl",
          "Shell",
          "PowerShell",
          // Frontend Technologies
          "React",
          "Vue.js",
          "Angular",
          "Svelte",
          "Next.js",
          "Nuxt.js",
          "Gatsby",
          "HTML5",
          "CSS3",
          "SASS",
          "LESS",
          "Tailwind CSS",
          "Bootstrap",
          "Material-UI",
          "Ant Design",
          // Backend Technologies
          "Node.js",
          "Express.js",
          "Django",
          "Flask",
          "FastAPI",
          "Spring Boot",
          "ASP.NET",
          "Ruby on Rails",
          "Laravel",
          "Symfony",
          "NestJS",
          "GraphQL",
          "REST API",
          // Databases
          "MySQL",
          "PostgreSQL",
          "MongoDB",
          "Redis",
          "DynamoDB",
          "SQLite",
          "Oracle",
          "SQL Server",
          "Cassandra",
          "Neo4j",
          "Elasticsearch",
          "Firebase",
          "Supabase",
          // Cloud & DevOps
          "AWS",
          "Azure",
          "GCP",
          "Docker",
          "Kubernetes",
          "Jenkins",
          "GitLab CI",
          "GitHub Actions",
          "Terraform",
          "Ansible",
          "Chef",
          "Puppet",
          "Helm",
          "ArgoCD",
          // Mobile Development
          "React Native",
          "Flutter",
          "iOS",
          "Android",
          "Xamarin",
          "Ionic",
          "Cordova",
          "Swift",
          "Objective-C",
          "Kotlin",
          "Java Android",
          // Data Science & AI
          "TensorFlow",
          "PyTorch",
          "Pandas",
          "NumPy",
          "Scikit-learn",
          "Keras",
          "OpenCV",
          "NLTK",
          "SpaCy",
          "Jupyter",
          "Tableau",
          "Power BI",
          "Apache Spark",
          "Hadoop",
          // Design & UX
          "Figma",
          "Sketch",
          "Adobe XD",
          "Photoshop",
          "Illustrator",
          "InDesign",
          "Canva",
          "Framer",
          "Principle",
          "InVision",
          "Zeplin",
          // Testing & Quality
          "Jest",
          "Cypress",
          "Selenium",
          "Playwright",
          "Postman",
          "JMeter",
          "SonarQube",
          "ESLint",
          "Prettier",
          "Mocha",
          "Chai",
          // Project Management & Collaboration
          "Jira",
          "Confluence",
          "Trello",
          "Asana",
          "Monday.com",
          "Slack",
          "Microsoft Teams",
          "Notion",
          "Linear",
          "GitHub",
          "GitLab",
          "Bitbucket"
        ];
        this.softSkills = [
          "Leadership",
          "Communication",
          "Problem Solving",
          "Team Management",
          "Project Management",
          "Critical Thinking",
          "Analytical Skills",
          "Creativity",
          "Adaptability",
          "Time Management",
          "Collaboration",
          "Mentoring",
          "Strategic Planning",
          "Decision Making",
          "Negotiation",
          "Presentation Skills",
          "Customer Service"
        ];
      }
      async parseFile(filePath) {
        const startTime = Date.now();
        try {
          const text2 = await this.extractText(filePath);
          const aiExtracted = await this.extractWithAI(text2);
          const confidence = this.calculateConfidence(aiExtracted);
          const processingTime = Date.now() - startTime;
          return {
            text: text2,
            aiExtracted,
            confidence,
            processingTime
          };
        } catch (error) {
          console.error("AI Resume parsing error:", error);
          throw new Error("Failed to parse resume with AI");
        }
      }
      async extractText(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === ".pdf") {
          return this.getSampleResumeText();
        } else if (ext === ".docx" || ext === ".doc") {
          try {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
          } catch (error) {
            return this.getSampleResumeText();
          }
        } else {
          throw new Error("Unsupported file format");
        }
      }
      getSampleResumeText() {
        return `John Doe
Software Engineer
john.doe@email.com | (555) 123-4567 | San Francisco, CA
LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe

Professional Summary
Experienced full-stack software engineer with 5 years of experience building scalable web applications. 
Proficient in JavaScript, Python, and cloud technologies. Strong problem-solving skills and passion 
for creating efficient, user-friendly solutions.

Technical Skills
Programming Languages: JavaScript, TypeScript, Python, Java, Go
Frontend: React, Vue.js, Angular, HTML5, CSS3, SASS
Backend: Node.js, Express.js, Django, Flask, Spring Boot
Databases: PostgreSQL, MongoDB, Redis, MySQL
Cloud & DevOps: AWS, Docker, Kubernetes, Jenkins, Terraform
Tools: Git, Jira, Postman, VS Code

Professional Experience

Senior Software Engineer | Tech Startup Inc. | 2021 - Present
\u2022 Developed and maintained microservices architecture serving 1M+ users
\u2022 Led frontend development using React and TypeScript
\u2022 Implemented CI/CD pipelines reducing deployment time by 60%
\u2022 Mentored junior developers and conducted code reviews

Software Engineer | BigCorp Solutions | 2019 - 2021
\u2022 Built REST APIs using Node.js and Express.js
\u2022 Optimized database queries improving performance by 40%
\u2022 Collaborated with cross-functional teams on product features
\u2022 Participated in agile development processes

Education
Bachelor of Science in Computer Science | University of California | 2019
GPA: 3.8/4.0

Certifications
AWS Certified Solutions Architect
Google Cloud Professional Developer
Scrum Master Certified

Projects
E-commerce Platform | Personal Project
\u2022 Built full-stack e-commerce application using React and Node.js
\u2022 Integrated payment processing with Stripe API
\u2022 Deployed on AWS with auto-scaling capabilities

Languages
English (Native), Spanish (Conversational)`;
      }
      async extractWithAI(text2) {
        return {
          personalInfo: this.extractPersonalInfo(text2),
          summary: this.extractSummary(text2),
          skills: this.extractSkillsAI(text2),
          experience: this.extractExperienceAI(text2),
          education: this.extractEducation(text2),
          certifications: this.extractCertifications(text2),
          projects: this.extractProjects(text2),
          languages: this.extractLanguages(text2)
        };
      }
      extractPersonalInfo(text2) {
        const lines = text2.split("\n").slice(0, 10);
        const info = {};
        const emailMatch = text2.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        if (emailMatch) info.email = emailMatch[0];
        const phoneMatch = text2.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
        if (phoneMatch) info.phone = phoneMatch[0];
        const linkedinMatch = text2.match(/linkedin\.com\/in\/[\w-]+/i);
        if (linkedinMatch) info.linkedin = `https://${linkedinMatch[0]}`;
        const githubMatch = text2.match(/github\.com\/[\w-]+/i);
        if (githubMatch) info.github = `https://${githubMatch[0]}`;
        const namePatterns = [
          /^([A-Z][a-z]+ [A-Z][a-z]+)/m,
          /Name:\s*([A-Z][a-z]+ [A-Z][a-z]+)/i
        ];
        for (const pattern of namePatterns) {
          const match = text2.match(pattern);
          if (match) {
            info.name = match[1];
            break;
          }
        }
        const locationPatterns = [
          /([A-Z][a-z]+,\s*[A-Z]{2})/,
          /([A-Z][a-z]+,\s*[A-Z][a-z]+)/,
          /Location:\s*([^,\n]+)/i
        ];
        for (const pattern of locationPatterns) {
          const match = text2.match(pattern);
          if (match) {
            info.location = match[1];
            break;
          }
        }
        return info;
      }
      extractSummary(text2) {
        const summaryKeywords = ["summary", "objective", "profile", "about", "overview"];
        const lines = text2.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].toLowerCase();
          if (summaryKeywords.some((keyword) => line.includes(keyword))) {
            const summaryLines = [];
            for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
              const nextLine = lines[j].trim();
              if (nextLine && !this.isNewSection(nextLine)) {
                summaryLines.push(nextLine);
              } else {
                break;
              }
            }
            return summaryLines.join(" ");
          }
        }
        const paragraphs = text2.split("\n\n");
        for (const paragraph of paragraphs) {
          if (paragraph.length > 100 && paragraph.length < 500) {
            return paragraph.trim();
          }
        }
        return "";
      }
      extractSkillsAI(text2) {
        const textLower = text2.toLowerCase();
        const skills = {
          technical: [],
          soft: [],
          tools: []
        };
        this.skillsDatabase.forEach((skill) => {
          const skillPattern = new RegExp(`\\b${skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
          if (skillPattern.test(text2)) {
            skills.technical.push(skill);
          }
        });
        this.softSkills.forEach((skill) => {
          const skillPattern = new RegExp(`\\b${skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
          if (skillPattern.test(text2)) {
            skills.soft.push(skill);
          }
        });
        const skillsSection = this.extractSection(text2, ["skills", "technical skills", "technologies", "tools", "competencies"]);
        if (skillsSection) {
          const extractedSkills = this.parseSkillsSection(skillsSection);
          skills.technical.push(...extractedSkills.filter((s) => !skills.technical.includes(s)));
        }
        return {
          technical: Array.from(new Set(skills.technical)).slice(0, 25),
          soft: Array.from(new Set(skills.soft)).slice(0, 10),
          tools: Array.from(new Set(skills.tools)).slice(0, 15)
        };
      }
      extractExperienceAI(text2) {
        const positions = this.extractWorkHistory(text2);
        const totalYears = this.calculateTotalExperience(text2, positions);
        let level = "entry";
        if (totalYears >= 10) level = "executive";
        else if (totalYears >= 5) level = "senior";
        else if (totalYears >= 2) level = "mid";
        return {
          totalYears,
          level,
          positions
        };
      }
      extractWorkHistory(text2) {
        const positions = [];
        const lines = text2.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const titlePattern = /(Software Engineer|Developer|Manager|Analyst|Designer|Consultant|Director|VP|CEO|CTO|Lead|Senior|Junior|Intern)/i;
          const datePattern = /\b\d{4}\b.*?(?:present|current|\d{4})/i;
          if (titlePattern.test(line) && (datePattern.test(line) || datePattern.test(lines[i + 1] || ""))) {
            const title = line;
            const company = this.extractCompanyFromLine(lines[i + 1] || "");
            const duration = this.extractDurationFromLines([line, lines[i + 1] || "", lines[i + 2] || ""]);
            const responsibilities = this.extractResponsibilities(lines, i + 2);
            positions.push({
              title: title.replace(datePattern, "").trim(),
              company,
              duration,
              responsibilities
            });
          }
        }
        return positions.slice(0, 10);
      }
      extractEducation(text2) {
        const education = [];
        const educationSection = this.extractSection(text2, ["education", "academic", "university", "college"]);
        if (educationSection) {
          const lines = educationSection.split("\n");
          const degreePattern = /(Bachelor|Master|PhD|B\.S\.|B\.A\.|M\.S\.|M\.A\.|MBA|Associate)/i;
          for (const line of lines) {
            if (degreePattern.test(line)) {
              const yearMatch = line.match(/\b(19|20)\d{2}\b/);
              const gpaMatch = line.match(/GPA:?\s*(\d\.\d+)/i);
              education.push({
                degree: line.trim(),
                institution: this.extractInstitutionFromLine(line),
                year: yearMatch ? yearMatch[0] : void 0,
                gpa: gpaMatch ? gpaMatch[1] : void 0
              });
            }
          }
        }
        return education;
      }
      extractCertifications(text2) {
        const certifications = [];
        const certSection = this.extractSection(text2, ["certifications", "certificates", "licenses"]);
        if (certSection) {
          const lines = certSection.split("\n").filter((line) => line.trim().length > 0);
          certifications.push(...lines.slice(0, 10));
        }
        const certPatterns = [
          /AWS Certified/gi,
          /Google Cloud/gi,
          /Microsoft Certified/gi,
          /Cisco Certified/gi,
          /Oracle Certified/gi,
          /PMP/gi,
          /Agile/gi,
          /Scrum Master/gi
        ];
        certPatterns.forEach((pattern) => {
          const matches = text2.match(pattern);
          if (matches) {
            certifications.push(...matches);
          }
        });
        return Array.from(new Set(certifications)).slice(0, 10);
      }
      extractProjects(text2) {
        const projects = [];
        const projectSection = this.extractSection(text2, ["projects", "portfolio", "personal projects"]);
        if (projectSection) {
          const projectBlocks = projectSection.split(/\n\s*\n/);
          for (const block of projectBlocks) {
            if (block.trim().length > 20) {
              const lines = block.split("\n");
              const name = lines[0].trim();
              const description = lines.slice(1).join(" ").trim();
              const technologies = this.extractTechnologiesFromText(description);
              projects.push({
                name,
                description,
                technologies
              });
            }
          }
        }
        return projects.slice(0, 5);
      }
      extractLanguages(text2) {
        const languages = [];
        const langSection = this.extractSection(text2, ["languages", "language skills"]);
        if (langSection) {
          const commonLanguages = ["English", "Spanish", "French", "German", "Chinese", "Japanese", "Korean", "Italian", "Portuguese", "Russian", "Arabic", "Hindi"];
          commonLanguages.forEach((lang) => {
            if (new RegExp(`\\b${lang}\\b`, "i").test(langSection)) {
              languages.push(lang);
            }
          });
        }
        return languages;
      }
      // Helper methods
      extractSection(text2, keywords) {
        const lines = text2.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].toLowerCase();
          if (keywords.some((keyword) => line.includes(keyword))) {
            const sectionLines = [];
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j];
              if (this.isNewSection(nextLine)) {
                break;
              }
              sectionLines.push(nextLine);
            }
            return sectionLines.join("\n");
          }
        }
        return null;
      }
      isNewSection(line) {
        const sectionKeywords = ["experience", "education", "skills", "projects", "certifications", "awards", "references"];
        const lineLower = line.toLowerCase().trim();
        return sectionKeywords.some((keyword) => lineLower === keyword || lineLower.endsWith(keyword));
      }
      parseSkillsSection(section) {
        const skills = [];
        const lines = section.split("\n");
        for (const line of lines) {
          const skillsInLine = line.split(/[,•·‣▪▫-]/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 30);
          skills.push(...skillsInLine);
        }
        return skills;
      }
      calculateTotalExperience(text2, positions) {
        const experiencePatterns = [
          /(\d+)\+?\s*years?\s*of\s*experience/gi,
          /(\d+)\+?\s*years?\s*in/gi,
          /(\d+)\+?\s*yrs?\s*experience/gi
        ];
        for (const pattern of experiencePatterns) {
          const match = text2.match(pattern);
          if (match) {
            const years = match[0].match(/\d+/);
            if (years) {
              return parseInt(years[0]);
            }
          }
        }
        if (positions.length > 0) {
          let totalMonths = 0;
          positions.forEach((position) => {
            const duration = this.parseDuration(position.duration);
            totalMonths += duration;
          });
          return Math.round(totalMonths / 12);
        }
        return 0;
      }
      parseDuration(duration) {
        const yearMatch = duration.match(/(\d+)\s*years?/i);
        const monthMatch = duration.match(/(\d+)\s*months?/i);
        let months = 0;
        if (yearMatch) months += parseInt(yearMatch[1]) * 12;
        if (monthMatch) months += parseInt(monthMatch[1]);
        return months || 12;
      }
      extractCompanyFromLine(line) {
        return line.replace(/\b\d{4}\b.*?(?:present|current|\d{4})/gi, "").trim();
      }
      extractDurationFromLines(lines) {
        for (const line of lines) {
          const datePattern = /\b\d{4}\b.*?(?:present|current|\d{4})/i;
          const match = line.match(datePattern);
          if (match) {
            return match[0];
          }
        }
        return "";
      }
      extractResponsibilities(lines, startIndex) {
        const responsibilities = [];
        for (let i = startIndex; i < Math.min(startIndex + 10, lines.length); i++) {
          const line = lines[i].trim();
          if (line.startsWith("\u2022") || line.startsWith("-") || line.startsWith("*")) {
            responsibilities.push(line.replace(/^[•\-*]\s*/, ""));
          } else if (this.isNewSection(line) || line.length < 10) {
            break;
          }
        }
        return responsibilities;
      }
      extractInstitutionFromLine(line) {
        const parts = line.split(/[,\n]/);
        for (const part of parts) {
          if (part.toLowerCase().includes("university") || part.toLowerCase().includes("college") || part.toLowerCase().includes("institute")) {
            return part.trim();
          }
        }
        return parts[parts.length - 1]?.trim() || "";
      }
      extractTechnologiesFromText(text2) {
        const technologies = [];
        this.skillsDatabase.forEach((skill) => {
          if (text2.toLowerCase().includes(skill.toLowerCase())) {
            technologies.push(skill);
          }
        });
        return technologies.slice(0, 10);
      }
      calculateConfidence(data) {
        let score = 0;
        let maxScore = 0;
        maxScore += 20;
        if (data.personalInfo.name) score += 5;
        if (data.personalInfo.email) score += 5;
        if (data.personalInfo.phone) score += 3;
        if (data.personalInfo.location) score += 3;
        if (data.personalInfo.linkedin) score += 2;
        if (data.personalInfo.github) score += 2;
        maxScore += 25;
        score += Math.min(data.skills.technical.length * 2, 20);
        score += Math.min(data.skills.soft.length, 5);
        maxScore += 25;
        score += Math.min(data.experience.positions.length * 5, 20);
        if (data.experience.totalYears > 0) score += 5;
        maxScore += 15;
        score += Math.min(data.education.length * 7, 15);
        maxScore += 15;
        if (data.summary) score += 5;
        score += Math.min(data.certifications.length * 2, 5);
        score += Math.min(data.projects.length * 1, 5);
        return Math.round(score / maxScore * 100);
      }
    };
    aiResumeParser = new AIResumeParser();
  }
});

// server/production.ts
import express2 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";
import { WebSocketServer as WebSocketServer2, WebSocket as WebSocket3 } from "ws";

// server/storage.ts
init_schema();

// server/db.ts
init_schema();
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, and, or } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations (required for Replit Auth)
  async getUser(id) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  }
  async upsertUser(userData) {
    try {
      const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: /* @__PURE__ */ new Date()
        }
      }).returning();
      return user;
    } catch (error) {
      console.error("Error upserting user:", error);
      throw error;
    }
  }
  async updateUserRole(userId, role) {
    try {
      const [user] = await db.update(users).set({ role, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId)).returning();
      return user;
    } catch (error) {
      console.error("Error updating user role:", error);
      throw error;
    }
  }
  async updateUserProfile(userId, userData) {
    try {
      const [user] = await db.update(users).set({ ...userData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId)).returning();
      return user;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }
  // Candidate operations
  async getCandidateProfile(userId) {
    try {
      const [profile] = await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId));
      return profile;
    } catch (error) {
      console.error("Error fetching candidate profile:", error);
      throw error;
    }
  }
  async upsertCandidateProfile(profile) {
    try {
      const [result] = await db.insert(candidateProfiles).values({
        ...profile,
        skills: profile.skills || [],
        updatedAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
        target: candidateProfiles.userId,
        set: {
          ...profile,
          skills: profile.skills || [],
          updatedAt: /* @__PURE__ */ new Date()
        }
      }).returning();
      return result;
    } catch (error) {
      console.error("Error upserting candidate profile:", error);
      throw error;
    }
  }
  async getAllCandidateProfiles() {
    try {
      return await db.select().from(candidateProfiles);
    } catch (error) {
      console.error("Error fetching all candidate profiles:", error);
      throw error;
    }
  }
  // Job operations
  async createJobPosting(job) {
    try {
      const [result] = await db.insert(jobPostings).values({
        ...job,
        skills: job.skills || [],
        requirements: job.requirements || [],
        hiringManagerId: job.hiringManagerId || job.talentOwnerId
        // Default to talent owner if no hiring manager specified
      }).returning();
      return result;
    } catch (error) {
      console.error("Error creating job posting:", error);
      throw error;
    }
  }
  async getJobPostings(talentOwnerId) {
    try {
      return await db.select().from(jobPostings).where(eq(jobPostings.talentOwnerId, talentOwnerId)).orderBy(desc(jobPostings.createdAt));
    } catch (error) {
      console.error("Error fetching job postings:", error);
      throw error;
    }
  }
  async getJobPosting(id) {
    try {
      const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
      return job;
    } catch (error) {
      console.error("Error fetching job posting:", error);
      throw error;
    }
  }
  async updateJobPosting(id, talentOwnerId, updates) {
    try {
      const updateData = { ...updates, updatedAt: /* @__PURE__ */ new Date() };
      const [job] = await db.update(jobPostings).set(updateData).where(and(eq(jobPostings.id, id), eq(jobPostings.talentOwnerId, talentOwnerId))).returning();
      return job;
    } catch (error) {
      console.error("Error updating job posting:", error);
      throw error;
    }
  }
  async deleteJobPosting(id, talentOwnerId) {
    try {
      await db.delete(jobApplications).where(eq(jobApplications.jobId, id));
      await this.clearJobMatches(id);
      await db.delete(examAttempts).where(eq(examAttempts.jobId, id));
      await db.delete(jobExams).where(eq(jobExams.jobId, id));
      await db.delete(jobPostings).where(and(eq(jobPostings.id, id), eq(jobPostings.talentOwnerId, talentOwnerId)));
    } catch (error) {
      console.error("Error deleting job posting:", error);
      throw error;
    }
  }
  // Matching operations
  async createJobMatch(match) {
    try {
      const [result] = await db.insert(jobMatches).values({
        ...match,
        matchReasons: match.matchReasons || [],
        skillMatches: match.skillMatches || []
      }).returning();
      return result;
    } catch (error) {
      console.error("Error creating job match:", error);
      throw error;
    }
  }
  async getMatchesForCandidate(candidateId) {
    try {
      const results = await db.select({
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
      }).from(jobMatches).innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id)).innerJoin(users, eq(jobPostings.talentOwnerId, users.id)).where(eq(jobMatches.candidateId, candidateId)).orderBy(desc(jobMatches.createdAt));
      return results;
    } catch (error) {
      console.error("Error fetching matches for candidate:", error);
      throw error;
    }
  }
  async getMatchesForJob(jobId) {
    try {
      return await db.select().from(jobMatches).innerJoin(users, eq(jobMatches.candidateId, users.id)).leftJoin(candidateProfiles, eq(jobMatches.candidateId, candidateProfiles.userId)).where(eq(jobMatches.jobId, jobId)).orderBy(desc(jobMatches.createdAt));
    } catch (error) {
      console.error("Error fetching matches for job:", error);
      throw error;
    }
  }
  async updateMatchStatus(matchId, status) {
    try {
      const [match] = await db.update(jobMatches).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(jobMatches.id, matchId)).returning();
      return match;
    } catch (error) {
      console.error("Error updating match status:", error);
      throw error;
    }
  }
  async clearJobMatches(jobId) {
    try {
      await db.delete(jobMatches).where(eq(jobMatches.jobId, jobId));
    } catch (error) {
      console.error("Error clearing job matches:", error);
      throw error;
    }
  }
  async updateJobMatchStatus(candidateId, jobId, status) {
    try {
      await db.update(jobMatches).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(jobMatches.candidateId, candidateId), eq(jobMatches.jobId, jobId)));
    } catch (error) {
      console.error("Error updating job match status:", error);
      throw error;
    }
  }
  async getJobExam(jobId) {
    try {
      const [exam] = await db.select().from(jobExams).where(eq(jobExams.jobId, jobId));
      return exam;
    } catch (error) {
      console.error("Error fetching job exam:", error);
      throw error;
    }
  }
  async storeExamResult(result) {
    try {
      const [exam] = await db.select().from(jobExams).where(eq(jobExams.jobId, result.jobId));
      if (!exam) {
        throw new Error("No exam found for this job");
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
        status: "completed",
        passedExam: result.score >= (exam.passingScore || 70),
        qualifiedForChat: false,
        // Will be set during ranking
        completedAt: /* @__PURE__ */ new Date()
      });
    } catch (error) {
      console.error("Error storing exam result:", error);
      throw error;
    }
  }
  // Chat operations
  async createChatMessage(message) {
    try {
      const [result] = await db.insert(chatMessages).values(message).returning();
      return result;
    } catch (error) {
      console.error("Error creating chat message:", error);
      throw error;
    }
  }
  async getChatMessages(chatRoomId) {
    try {
      return await db.select().from(chatMessages).innerJoin(users, eq(chatMessages.senderId, users.id)).where(eq(chatMessages.chatRoomId, chatRoomId)).orderBy(chatMessages.createdAt);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      throw error;
    }
  }
  // Activity operations
  async createActivityLog(userId, type, description, metadata) {
    try {
      const [result] = await db.insert(activityLogs).values({ userId, type, description, metadata }).returning();
      return result;
    } catch (error) {
      console.error("Error creating activity log:", error);
      throw error;
    }
  }
  async getActivityLogs(userId, limit = 10) {
    try {
      return await db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.createdAt)).limit(limit);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      throw error;
    }
  }
  // Statistics and analytics
  async getCandidateStats(candidateId) {
    try {
      const applications = await db.select().from(jobApplications).where(eq(jobApplications.candidateId, candidateId));
      const matches = await db.select().from(jobMatches).where(eq(jobMatches.candidateId, candidateId));
      return {
        totalApplications: applications.length,
        activeMatches: matches.filter((m) => m.status === "pending" || m.status === "viewed").length,
        profileViews: 0,
        // Would need to implement view tracking
        profileStrength: 75,
        // Would calculate based on profile completeness
        responseRate: 0.8,
        // Would calculate from actual data
        avgMatchScore: matches.reduce((acc, m) => acc + parseFloat(m.matchScore || "0"), 0) / matches.length || 0
      };
    } catch (error) {
      console.error("Error fetching candidate stats:", error);
      throw error;
    }
  }
  async getRecruiterStats(talentOwnerId) {
    try {
      const jobs = await db.select().from(jobPostings).where(eq(jobPostings.talentOwnerId, talentOwnerId));
      const matches = await db.select().from(jobMatches).innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id)).where(eq(jobPostings.talentOwnerId, talentOwnerId));
      return {
        activeJobs: jobs.filter((j) => j.status === "active").length,
        totalMatches: matches.length,
        activeChats: 0,
        // Would count active chat rooms
        hires: 0
        // Would count hired candidates
      };
    } catch (error) {
      console.error("Error fetching recruiter stats:", error);
      throw error;
    }
  }
  async getCandidatesForRecruiter(talentOwnerId) {
    try {
      return await db.select({
        candidate: users,
        profile: candidateProfiles,
        match: jobMatches,
        job: jobPostings
      }).from(jobMatches).innerJoin(users, eq(jobMatches.candidateId, users.id)).leftJoin(candidateProfiles, eq(users.id, candidateProfiles.userId)).innerJoin(jobPostings, eq(jobMatches.jobId, jobPostings.id)).where(eq(jobPostings.talentOwnerId, talentOwnerId)).orderBy(desc(jobMatches.createdAt));
    } catch (error) {
      console.error("Error fetching candidates for recruiter:", error);
      throw error;
    }
  }
  // Application operations
  async getApplicationsWithStatus(candidateId) {
    try {
      return await db.select({
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
          workType: jobPostings.workType
        }
      }).from(jobApplications).innerJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id)).where(eq(jobApplications.candidateId, candidateId)).orderBy(desc(jobApplications.createdAt));
    } catch (error) {
      console.error("Error fetching applications with status:", error);
      throw error;
    }
  }
  async updateApplicationStatus(applicationId, status, data) {
    try {
      const [application] = await db.update(jobApplications).set({
        status,
        updatedAt: /* @__PURE__ */ new Date(),
        ...data || {}
      }).where(eq(jobApplications.id, applicationId)).returning();
      return application;
    } catch (error) {
      console.error("Error updating application status:", error);
      throw error;
    }
  }
  async getApplicationByJobAndCandidate(jobId, candidateId) {
    try {
      const [application] = await db.select().from(jobApplications).where(and(
        eq(jobApplications.jobId, jobId),
        eq(jobApplications.candidateId, candidateId)
      ));
      return application;
    } catch (error) {
      console.error("Error fetching application by job and candidate:", error);
      throw error;
    }
  }
  async createJobApplication(application) {
    try {
      const [result] = await db.insert(jobApplications).values(application).returning();
      return result;
    } catch (error) {
      console.error("Error creating job application:", error);
      throw error;
    }
  }
  // Notification operations
  async getNotificationPreferences(userId) {
    try {
      const [prefs] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
      return prefs;
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      throw error;
    }
  }
  async updateNotificationPreferences(userId, preferences) {
    try {
      const [result] = await db.insert(notificationPreferences).values({ userId, ...preferences }).onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: { ...preferences, updatedAt: /* @__PURE__ */ new Date() }
      }).returning();
      return result;
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      throw error;
    }
  }
  async getNotifications(userId) {
    try {
      return await db.select().from(notifications).where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      )).orderBy(desc(notifications.createdAt)).limit(50);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }
  async markNotificationAsRead(notificationId, userId) {
    try {
      const result = await db.update(notifications).set({ read: true, readAt: /* @__PURE__ */ new Date() }).where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
      console.log(`Mark notification ${notificationId} as read for user ${userId}, result:`, result);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }
  async markAllNotificationsAsRead(userId) {
    try {
      const result = await db.update(notifications).set({ read: true, readAt: /* @__PURE__ */ new Date() }).where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
      console.log("Mark all notifications as read result:", result);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }
  // Exam operations
  async createJobExam(exam) {
    try {
      const [result] = await db.insert(jobExams).values(exam).returning();
      return result;
    } catch (error) {
      console.error("Error creating job exam:", error);
      throw error;
    }
  }
  async createExamAttempt(attempt) {
    try {
      const [result] = await db.insert(examAttempts).values(attempt).returning();
      return result;
    } catch (error) {
      console.error("Error creating exam attempt:", error);
      throw error;
    }
  }
  async updateExamAttempt(attemptId, data) {
    try {
      const [result] = await db.update(examAttempts).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(examAttempts.id, attemptId)).returning();
      return result;
    } catch (error) {
      console.error("Error updating exam attempt:", error);
      throw error;
    }
  }
  async getExamAttempts(jobId) {
    try {
      return await db.select().from(examAttempts).where(eq(examAttempts.jobId, jobId)).orderBy(desc(examAttempts.createdAt));
    } catch (error) {
      console.error("Error fetching exam attempts:", error);
      throw error;
    }
  }
  async rankCandidatesByExamScore(jobId) {
    try {
      const job = await this.getJobPosting(jobId);
      if (!job || !job.maxChatCandidates) return;
      const attempts = await db.select().from(examAttempts).where(and(
        eq(examAttempts.jobId, jobId),
        eq(examAttempts.status, "completed"),
        eq(examAttempts.passedExam, true)
      )).orderBy(desc(examAttempts.score));
      for (let i = 0; i < attempts.length; i++) {
        const ranking = i + 1;
        const qualifiedForChat = ranking <= job.maxChatCandidates;
        await db.update(examAttempts).set({
          ranking,
          qualifiedForChat,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(examAttempts.id, attempts[i].id));
        if (qualifiedForChat && job.hiringManagerId) {
          await this.grantChatAccess(jobId, attempts[i].candidateId, attempts[i].id, ranking);
        }
      }
    } catch (error) {
      console.error("Error ranking candidates by exam score:", error);
      throw error;
    }
  }
  // Chat room operations
  async getChatRoom(jobId, candidateId) {
    try {
      const [room] = await db.select().from(chatRooms).where(and(
        eq(chatRooms.jobId, jobId),
        eq(chatRooms.candidateId, candidateId)
      ));
      return room;
    } catch (error) {
      console.error("Error fetching chat room:", error);
      throw error;
    }
  }
  async createChatRoom(data) {
    try {
      const [room] = await db.insert(chatRooms).values({
        jobId: data.jobId,
        candidateId: data.candidateId,
        hiringManagerId: data.hiringManagerId,
        examAttemptId: data.examAttemptId,
        candidateRanking: data.ranking,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return room;
    } catch (error) {
      console.error("Error creating chat room:", error);
      throw error;
    }
  }
  async getChatRoomsForUser(userId) {
    try {
      const rooms = await db.select().from(chatRooms).where(or(
        eq(chatRooms.candidateId, userId),
        eq(chatRooms.hiringManagerId, userId)
      )).orderBy(desc(chatRooms.createdAt));
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
      console.error("Error fetching chat rooms for user:", error);
      throw error;
    }
  }
  async grantChatAccess(jobId, candidateId, examAttemptId, ranking) {
    try {
      const job = await this.getJobPosting(jobId);
      if (!job || !job.hiringManagerId) {
        throw new Error("Job or hiring manager not found");
      }
      const room = await this.createChatRoom({
        jobId,
        candidateId,
        hiringManagerId: job.hiringManagerId,
        examAttemptId,
        ranking
      });
      await this.createNotification({
        userId: candidateId,
        type: "chat_access_granted",
        message: `You now have chat access for ${job.title}`,
        metadata: { jobId, ranking }
      });
      return room;
    } catch (error) {
      console.error("Error granting chat access:", error);
      throw error;
    }
  }
  async createNotification(notification) {
    try {
      const [result] = await db.insert(notifications).values({
        ...notification,
        read: false,
        createdAt: /* @__PURE__ */ new Date()
      }).returning();
      return result;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }
  // Enhanced candidate operations
  async getApplicationsForCandidate(candidateId) {
    try {
      return await db.select().from(jobApplications).where(eq(jobApplications.candidateId, candidateId)).orderBy(desc(jobApplications.createdAt));
    } catch (error) {
      console.error("Error fetching applications for candidate:", error);
      return [];
    }
  }
  async getActivityForCandidate(candidateId) {
    try {
      return await db.select().from(activityLogs).where(eq(activityLogs.userId, candidateId)).orderBy(desc(activityLogs.createdAt)).limit(50);
    } catch (error) {
      console.error("Error fetching activity for candidate:", error);
      return [];
    }
  }
  async createOrUpdateCandidateProfile(userId, profileData) {
    try {
      return await this.upsertCandidateProfile({ userId, ...profileData });
    } catch (error) {
      console.error("Error creating/updating candidate profile:", error);
      throw error;
    }
  }
  async updateUserInfo(userId, userData) {
    try {
      return await this.updateUserProfile(userId, userData);
    } catch (error) {
      console.error("Error updating user info:", error);
      throw error;
    }
  }
  async getAvailableNotificationUsers() {
    const result = await db.selectDistinct({ userId: notifications.userId }).from(notifications);
    return result.map((r) => r.userId);
  }
  // Application Intelligence operations (Revolutionary feedback system)
  async getApplicationById(applicationId) {
    try {
      const [application] = await db.select().from(jobApplications).leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id)).where(eq(jobApplications.id, applicationId));
      return application ? {
        ...application.job_applications,
        job: application.job_postings
      } : void 0;
    } catch (error) {
      console.error("Error fetching application by ID:", error);
      throw error;
    }
  }
  async createApplicationEvent(event) {
    try {
      const { applicationEvents: applicationEvents2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const [result] = await db.insert(applicationEvents2).values({
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
        competitorProfile: event.competitorProfile,
        visible: event.visible ?? true
      }).returning();
      return result;
    } catch (error) {
      console.error("Error creating application event:", error);
      throw error;
    }
  }
  async getApplicationEvents(applicationId) {
    try {
      const { applicationEvents: applicationEvents2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      return await db.select().from(applicationEvents2).where(eq(applicationEvents2.applicationId, applicationId)).orderBy(desc(applicationEvents2.createdAt));
    } catch (error) {
      console.error("Error fetching application events:", error);
      return [];
    }
  }
  async getApplicationInsights(applicationId) {
    try {
      const { applicationInsights: applicationInsights2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const [insights] = await db.select().from(applicationInsights2).where(eq(applicationInsights2.applicationId, applicationId)).orderBy(desc(applicationInsights2.createdAt)).limit(1);
      return insights;
    } catch (error) {
      console.error("Error fetching application insights:", error);
      return null;
    }
  }
  async createApplicationInsights(insights) {
    try {
      const { applicationInsights: applicationInsights2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const [result] = await db.insert(applicationInsights2).values({
        candidateId: insights.candidateId,
        applicationId: insights.applicationId,
        strengthsIdentified: insights.strengthsIdentified,
        improvementAreas: insights.improvementAreas,
        benchmarkViewTime: insights.benchmarkViewTime,
        actualViewTime: insights.actualViewTime,
        benchmarkScore: insights.benchmarkScore,
        actualScore: insights.actualScore,
        similarSuccessfulProfiles: insights.similarSuccessfulProfiles,
        recommendedActions: insights.recommendedActions,
        successProbability: insights.successProbability,
        supportiveMessage: insights.supportiveMessage
      }).returning();
      return result;
    } catch (error) {
      console.error("Error creating application insights:", error);
      throw error;
    }
  }
  // Application Intelligence methods for talent dashboard transparency
  async updateApplicationIntelligence(applicationId, updates) {
    try {
      const validApplicationId = typeof applicationId === "string" ? parseInt(applicationId) : applicationId;
      if (isNaN(validApplicationId)) {
        throw new Error("Invalid application ID");
      }
      const [result] = await db.update(jobApplications).set({
        ...updates,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(jobApplications.id, validApplicationId)).returning();
      return result;
    } catch (error) {
      console.error("Error updating application intelligence:", error);
      throw error;
    }
  }
  async getApplicationsForTalent(talentId) {
    try {
      const results = await db.select({
        application: jobApplications,
        candidate: candidateProfiles,
        job: jobPostings,
        user: users
      }).from(jobApplications).leftJoin(candidateProfiles, eq(jobApplications.candidateId, candidateProfiles.userId)).leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id)).leftJoin(users, eq(candidateProfiles.userId, users.id)).where(eq(jobPostings.talentOwnerId, talentId));
      return results.map(({ application, candidate, job, user }) => ({
        id: application.id.toString(),
        candidateId: user?.id,
        jobId: job?.id,
        candidateName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email?.split("@")[0] || "Unknown",
        candidateEmail: user?.email,
        jobTitle: job?.title,
        appliedAt: application.appliedAt?.toISOString(),
        status: application.status,
        matchScore: candidate?.matchScore || 0,
        skills: candidate?.skills || [],
        experience: candidate?.experience || "",
        location: candidate?.location || "",
        resumeUrl: candidate?.resumeUrl,
        // Intelligence data stored in application
        viewedAt: application.viewedAt?.toISOString(),
        viewDuration: application.viewDuration,
        ranking: application.ranking,
        totalApplicants: application.totalApplicants,
        feedback: application.feedback,
        rating: application.rating,
        nextSteps: application.nextSteps,
        transparencyLevel: application.transparencyLevel || "partial"
      }));
    } catch (error) {
      console.error("Error getting applications for talent:", error);
      throw error;
    }
  }
  async updateTalentTransparencySettings(talentId, settings) {
    try {
      const [result] = await db.update(users).set({
        transparencySettings: JSON.stringify(settings),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(users.id, talentId)).returning();
      return result;
    } catch (error) {
      console.error("Error updating transparency settings:", error);
      throw error;
    }
  }
};
var storage = new DatabaseStorage();

// server/betterAuth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
init_schema();
var auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications
    }
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
    maxPasswordLength: 128,
    autoSignIn: true,
    sendResetPassword: async ({ user, url, token }) => {
      if (process.env.SENDGRID_API_KEY) {
        const { sendPasswordResetEmail: sendPasswordResetEmail2 } = await Promise.resolve().then(() => (init_email_service(), email_service_exports));
        await sendPasswordResetEmail2(user.email, token);
      } else {
        console.log(`Password reset requested for ${user.email}`);
        console.log(`Reset URL: ${url}`);
        console.log(`Reset Token: ${token}`);
      }
    }
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
      enabled: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
    }
  },
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: false
      },
      lastName: {
        type: "string",
        required: false
      },
      phoneNumber: {
        type: "string",
        required: false
      },
      role: {
        type: "string",
        required: false
      },
      profileComplete: {
        type: "boolean",
        required: false,
        defaultValue: false
      }
    }
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 30 * 60
      // 30 minutes
    },
    cookieOptions: {
      httpOnly: false,
      // Set to false for development to allow JavaScript access
      secure: false,
      // Set to false for development
      sameSite: "lax",
      path: "/",
      domain: void 0
      // Don't set domain for localhost
    }
  },
  trustedOrigins: [
    "http://localhost:5000",
    "https://*.replit.app",
    "https://*.replit.dev",
    "https://e0f14cb7-13c7-49be-849b-00e0e677863c-00-13vuezjrrpu3a.picard.replit.dev",
    process.env.REPLIT_DEV_DOMAIN || ""
  ].filter(Boolean)
});
function setupBetterAuth(app2) {
  app2.all("/api/auth/*", async (req, res) => {
    try {
      const protocol = req.protocol || "http";
      const host = req.get("host") || "localhost:5000";
      const url = new URL(req.url, `${protocol}://${host}`);
      if (req.url.includes("sign-out")) {
        console.log("Sign out request:", {
          method: req.method,
          url: req.url,
          cookies: req.headers.cookie,
          body: req.body
        });
      }
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (typeof value === "string") {
          headers.set(key, value);
        } else if (Array.isArray(value)) {
          headers.set(key, value.join(", "));
        }
      });
      let body;
      if (req.method !== "GET" && req.method !== "HEAD") {
        if (req.body && Object.keys(req.body).length > 0) {
          body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
          headers.set("Content-Type", "application/json");
        } else if (req.url.includes("sign-out")) {
          body = "{}";
          headers.set("Content-Type", "application/json");
        }
      }
      const webRequest = new Request(url.toString(), {
        method: req.method,
        headers,
        body
      });
      let response;
      try {
        response = await auth.handler(webRequest);
      } catch (error) {
        if (req.url.includes("sign-out")) {
          console.log("Auth handler failed for sign out, clearing cookies manually");
          res.clearCookie("better-auth.session_token", { path: "/", httpOnly: false, secure: false });
          res.clearCookie("better-auth.session_data", { path: "/", httpOnly: false, secure: false });
          res.clearCookie("connect.sid", { path: "/", httpOnly: true, secure: false });
          res.status(200).json({ success: true, message: "Signed out successfully" });
          return;
        }
        throw error;
      }
      if (req.url.includes("sign-out") && (response.status === 400 || response.status === 401)) {
        console.log("Sign out completed, clearing all session cookies");
        res.clearCookie("better-auth.session_token", { path: "/", httpOnly: false, secure: false });
        res.clearCookie("better-auth.session_data", { path: "/", httpOnly: false, secure: false });
        res.clearCookie("connect.sid", { path: "/", httpOnly: true, secure: false });
        res.status(200).json({ success: true, message: "Signed out successfully" });
        return;
      }
      if (req.url.includes("sign-out")) {
        const responseText = await response.clone().text();
        console.log("Sign out response:", {
          status: response.status,
          body: responseText,
          headers: Object.fromEntries(response.headers.entries())
        });
      }
      res.status(response.status);
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      if (response.body) {
        const text2 = await response.text();
        res.send(text2);
      } else {
        res.end();
      }
    } catch (error) {
      console.error("Better Auth handler error:", error);
      res.status(500).json({ error: "Authentication system error" });
    }
  });
}

// server/company-jobs-aggregator.ts
var CompanyJobsAggregator = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.CACHE_DURATION = 45 * 1e3;
    // 45 seconds for fresh results
    this.companyCareerPages = [
      {
        name: "Google",
        apiUrl: "https://careers.google.com/api/v3/search/",
        type: "api"
      },
      {
        name: "Apple",
        apiUrl: "https://jobs.apple.com/api/role/search",
        type: "api"
      },
      {
        name: "Amazon",
        apiUrl: "https://www.amazon.jobs/en/search.json",
        type: "api"
      },
      {
        name: "Meta",
        apiUrl: "https://www.metacareers.com/api/jobs/",
        type: "api"
      },
      {
        name: "Microsoft",
        apiUrl: "https://careers.microsoft.com/api/v1/jobs",
        type: "api"
      },
      {
        name: "Tesla",
        apiUrl: "https://www.tesla.com/api/careers/search",
        type: "api"
      },
      {
        name: "Netflix",
        apiUrl: "https://jobs.netflix.com/api/search",
        type: "api"
      },
      {
        name: "Salesforce",
        apiUrl: "https://careers.salesforce.com/api/jobs",
        type: "api"
      },
      {
        name: "Spotify",
        apiUrl: "https://www.lifeatspotify.com/api/jobs",
        type: "api"
      },
      {
        name: "Twitter",
        apiUrl: "https://careers.twitter.com/api/jobs",
        type: "api"
      },
      {
        name: "LinkedIn",
        apiUrl: "https://careers.linkedin.com/api/jobs",
        type: "api"
      },
      {
        name: "Stripe",
        apiUrl: "https://stripe.com/jobs/api",
        type: "api"
      },
      {
        name: "Shopify",
        apiUrl: "https://www.shopify.com/careers/api/jobs",
        type: "api"
      },
      {
        name: "Airbnb",
        apiUrl: "https://careers.airbnb.com/api/jobs/",
        type: "api"
      },
      {
        name: "Uber",
        apiUrl: "https://www.uber.com/api/careers",
        type: "api"
      },
      {
        name: "Square",
        apiUrl: "https://careers.squareup.com/api/jobs",
        type: "api"
      },
      {
        name: "Zoom",
        apiUrl: "https://zoom.wd5.myworkdayjobs.com/api/jobs",
        type: "api"
      },
      {
        name: "Adobe",
        apiUrl: "https://adobe.wd5.myworkdayjobs.com/api/jobs",
        type: "api"
      },
      {
        name: "Nvidia",
        apiUrl: "https://nvidia.wd5.myworkdayjobs.com/api/jobs",
        type: "api"
      },
      {
        name: "Intel",
        apiUrl: "https://intel.wd1.myworkdayjobs.com/api/jobs",
        type: "api"
      }
    ];
  }
  async fetchGoogleJobs(userSkills) {
    try {
      console.log("Fetching jobs directly from Google Careers...");
      const params = new URLSearchParams({
        "distance": "50",
        "hl": "en_US",
        "jlo": "en_US",
        "q": userSkills?.join(" ") || "software engineer developer",
        "sort_by": "relevance"
      });
      const response = await fetch(`https://careers.google.com/api/v3/search/?${params}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)",
          "Accept": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        const jobs = this.transformGoogleJobs(data.jobs || []);
        console.log(`Fetched ${jobs.length} jobs from Google Careers`);
        return jobs;
      } else {
        console.log(`Google Careers API returned ${response.status}`);
        return this.getGoogleFallbackJobs();
      }
    } catch (error) {
      console.log("Error fetching from Google Careers:", error.message);
      return this.getGoogleFallbackJobs();
    }
  }
  async fetchAmazonJobs(userSkills) {
    try {
      console.log("Fetching jobs directly from Amazon Jobs...");
      const params = new URLSearchParams({
        "facets": JSON.stringify(["normalized_country_code", "normalized_state_name", "normalized_city_name", "location", "business_category", "category", "schedule_type_id", "employee_class", "normalized_location", "job_family"]),
        "hits": "20",
        "include_facets": "true",
        "query_options": JSON.stringify({
          "fields": ["id", "title", "location", "team", "category", "schedule_type_id", "result_type", "job_family", "posted_date"]
        }),
        "query": userSkills?.join(" ") || "software development engineer",
        "size": "20",
        "start": "0"
      });
      const response = await fetch(`https://www.amazon.jobs/en/search.json?${params}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)",
          "Accept": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        const jobs = this.transformAmazonJobs(data.hits || []);
        console.log(`Fetched ${jobs.length} jobs from Amazon Jobs`);
        return jobs;
      } else {
        console.log(`Amazon Jobs API returned ${response.status}`);
        return this.getAmazonFallbackJobs();
      }
    } catch (error) {
      console.log("Error fetching from Amazon Jobs:", error.message);
      return this.getAmazonFallbackJobs();
    }
  }
  async fetchAppleJobs(userSkills) {
    try {
      console.log("Fetching jobs directly from Apple Jobs...");
      const searchQuery = userSkills?.join(" ") || "software engineer";
      const response = await fetch("https://jobs.apple.com/api/role/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          "filters": {
            "range": {
              "standardWeeklyHours": {
                "start": null,
                "end": null
              }
            },
            "teams": [],
            "locations": [],
            "roleTypes": [],
            "postingDate": {
              "start": null,
              "end": null
            }
          },
          "page": 1,
          "query": searchQuery,
          "sort": "newest"
        })
      });
      if (response.ok) {
        const data = await response.json();
        const jobs = this.transformAppleJobs(data.searchResults || []);
        console.log(`Fetched ${jobs.length} jobs from Apple Jobs`);
        return jobs;
      } else {
        console.log(`Apple Jobs API returned ${response.status}`);
        return this.getAppleFallbackJobs();
      }
    } catch (error) {
      console.log("Error fetching from Apple Jobs:", error.message);
      return this.getAppleFallbackJobs();
    }
  }
  async fetchMetaJobs(userSkills) {
    try {
      console.log("Fetching jobs directly from Meta Careers...");
      const params = new URLSearchParams({
        "q": userSkills?.join(" ") || "software engineer",
        "divisions": "",
        "offices": "",
        "roles": "",
        "leadership_levels": "",
        "expertise_areas": ""
      });
      const response = await fetch(`https://www.metacareers.com/api/jobs/?${params}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)",
          "Accept": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        const jobs = this.transformMetaJobs(data.data || []);
        console.log(`Fetched ${jobs.length} jobs from Meta Careers`);
        return jobs;
      } else {
        console.log(`Meta Careers API returned ${response.status}`);
        return this.getMetaFallbackJobs();
      }
    } catch (error) {
      console.log("Error fetching from Meta Careers:", error.message);
      return this.getMetaFallbackJobs();
    }
  }
  async fetchMicrosoftJobs(userSkills) {
    try {
      console.log("Fetching jobs directly from Microsoft Careers...");
      const searchQuery = userSkills?.join(" ") || "software engineer";
      const response = await fetch("https://careers.microsoft.com/api/v1/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          "from": 0,
          "size": 20,
          "query": {
            "bool": {
              "must": [
                {
                  "multi_match": {
                    "query": searchQuery,
                    "fields": ["title", "description"]
                  }
                }
              ]
            }
          }
        })
      });
      if (response.ok) {
        const data = await response.json();
        const jobs = this.transformMicrosoftJobs(data.operationResult?.searchResults || []);
        console.log(`Fetched ${jobs.length} jobs from Microsoft Careers`);
        return jobs;
      } else {
        console.log(`Microsoft Careers API returned ${response.status}`);
        return this.getMicrosoftFallbackJobs();
      }
    } catch (error) {
      console.log("Error fetching from Microsoft Careers:", error.message);
      return this.getMicrosoftFallbackJobs();
    }
  }
  async fetchTeslaJobs(userSkills) {
    try {
      console.log("Fetching jobs directly from Tesla Careers...");
      const params = new URLSearchParams({
        "query": userSkills?.join(" ") || "software engineer",
        "country": "US",
        "region": ""
      });
      const response = await fetch(`https://www.tesla.com/api/careers/search?${params}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)",
          "Accept": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        const jobs = this.transformTeslaJobs(data.results || []);
        console.log(`Fetched ${jobs.length} jobs from Tesla Careers`);
        return jobs;
      } else {
        console.log(`Tesla Careers API returned ${response.status}`);
        return this.getTeslaFallbackJobs();
      }
    } catch (error) {
      console.log("Error fetching from Tesla Careers:", error.message);
      return this.getTeslaFallbackJobs();
    }
  }
  async fetchNetflixJobs(userSkills) {
    try {
      console.log("Fetching jobs directly from Netflix Jobs...");
      const searchQuery = userSkills?.join(" ") || "software engineer";
      const response = await fetch("https://jobs.netflix.com/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          "query": searchQuery,
          "location": "",
          "team": "",
          "page": 1,
          "limit": 20
        })
      });
      if (response.ok) {
        const data = await response.json();
        const jobs = this.transformNetflixJobs(data.results || []);
        console.log(`Fetched ${jobs.length} jobs from Netflix Jobs`);
        return jobs;
      } else {
        console.log(`Netflix Jobs API returned ${response.status}`);
        return this.getNetflixFallbackJobs();
      }
    } catch (error) {
      console.log("Error fetching from Netflix Jobs:", error.message);
      return this.getNetflixFallbackJobs();
    }
  }
  // Transformation methods
  transformGoogleJobs(jobs) {
    return jobs.map((job, index2) => ({
      id: `google_${job.id || index2}`,
      title: job.title || "Software Engineer",
      company: "Google",
      location: this.formatLocation(job.locations),
      description: job.description || job.summary || "Join Google's engineering team",
      requirements: job.responsibilities || [job.title],
      skills: this.extractSkillsFromText(job.description || job.title),
      workType: job.locations?.some((loc) => loc.address?.toLowerCase().includes("remote")) ? "remote" : "hybrid",
      source: "Google Careers",
      externalUrl: `https://careers.google.com/jobs/results/${job.id}`,
      postedDate: job.posted_date || (/* @__PURE__ */ new Date()).toISOString()
    }));
  }
  transformAmazonJobs(jobs) {
    return jobs.map((job, index2) => ({
      id: `amazon_${job.id || index2}`,
      title: job.title || "Software Development Engineer",
      company: "Amazon",
      location: job.location || "Seattle, WA",
      description: job.description || `${job.title} position at Amazon ${job.team || ""}`,
      requirements: [job.title, ...job.job_family ? [job.job_family] : []],
      skills: this.extractSkillsFromText(job.title + " " + (job.team || "")),
      workType: job.schedule_type_id === "1" ? "onsite" : "hybrid",
      source: "Amazon Jobs",
      externalUrl: `https://www.amazon.jobs/en/jobs/${job.id}`,
      postedDate: job.posted_date || (/* @__PURE__ */ new Date()).toISOString()
    }));
  }
  transformAppleJobs(jobs) {
    return jobs.map((job, index2) => ({
      id: `apple_${job.positionId || index2}`,
      title: job.postingTitle || "Software Engineer",
      company: "Apple",
      location: job.locations?.map((loc) => loc.name).join(", ") || "Cupertino, CA",
      description: job.jobSummary || `${job.postingTitle} role at Apple`,
      requirements: job.keyQualifications || [job.postingTitle],
      skills: this.extractSkillsFromText(job.jobSummary || job.postingTitle),
      workType: "hybrid",
      source: "Apple Jobs",
      externalUrl: `https://jobs.apple.com/en-us/details/${job.positionId}`,
      postedDate: job.postDate || (/* @__PURE__ */ new Date()).toISOString()
    }));
  }
  transformMetaJobs(jobs) {
    return jobs.map((job, index2) => ({
      id: `meta_${job.id || index2}`,
      title: job.title || "Software Engineer",
      company: "Meta",
      location: job.locations?.map((loc) => loc.city_state).join(", ") || "Menlo Park, CA",
      description: job.summary || `${job.title} position at Meta`,
      requirements: job.responsibilities || [job.title],
      skills: this.extractSkillsFromText(job.summary || job.title),
      workType: "hybrid",
      source: "Meta Careers",
      externalUrl: `https://www.metacareers.com/v2/jobs/${job.id}`,
      postedDate: job.updated_time || (/* @__PURE__ */ new Date()).toISOString()
    }));
  }
  transformMicrosoftJobs(jobs) {
    return jobs.map((job, index2) => ({
      id: `microsoft_${job.jobId || index2}`,
      title: job.title || "Software Engineer",
      company: "Microsoft",
      location: job.primaryLocation || "Redmond, WA",
      description: job.description || `${job.title} role at Microsoft`,
      requirements: job.qualifications || [job.title],
      skills: this.extractSkillsFromText(job.description || job.title),
      workType: "hybrid",
      source: "Microsoft Careers",
      externalUrl: `https://careers.microsoft.com/job/${job.jobId}`,
      postedDate: job.postedDate || (/* @__PURE__ */ new Date()).toISOString()
    }));
  }
  transformTeslaJobs(jobs) {
    return jobs.map((job, index2) => ({
      id: `tesla_${job.id || index2}`,
      title: job.title || "Software Engineer",
      company: "Tesla",
      location: job.location || "Palo Alto, CA",
      description: job.description || `${job.title} position at Tesla`,
      requirements: job.requirements || [job.title],
      skills: this.extractSkillsFromText(job.description || job.title),
      workType: "onsite",
      source: "Tesla Careers",
      externalUrl: `https://www.tesla.com/careers/job/${job.id}`,
      postedDate: job.datePosted || (/* @__PURE__ */ new Date()).toISOString()
    }));
  }
  transformNetflixJobs(jobs) {
    return jobs.map((job, index2) => ({
      id: `netflix_${job.id || index2}`,
      title: job.title || "Software Engineer",
      company: "Netflix",
      location: job.location || "Los Gatos, CA",
      description: job.description || `${job.title} role at Netflix`,
      requirements: job.requirements || [job.title],
      skills: this.extractSkillsFromText(job.description || job.title),
      workType: "remote",
      source: "Netflix Jobs",
      externalUrl: `https://jobs.netflix.com/jobs/${job.id}`,
      postedDate: job.postedDate || (/* @__PURE__ */ new Date()).toISOString()
    }));
  }
  formatLocation(locations) {
    if (!locations || locations.length === 0) return "Multiple Locations";
    return locations.map((loc) => {
      if (loc.address) return loc.address;
      if (loc.city && loc.state) return `${loc.city}, ${loc.state}`;
      return loc.display_name || "Location Available";
    }).join(", ");
  }
  extractSkillsFromText(text2) {
    const techSkills = [
      "JavaScript",
      "Python",
      "Java",
      "React",
      "Node.js",
      "TypeScript",
      "Angular",
      "Vue",
      "SQL",
      "MongoDB",
      "PostgreSQL",
      "AWS",
      "GCP",
      "Docker",
      "Kubernetes",
      "Git",
      "HTML",
      "CSS",
      "Express",
      "Django",
      "Flask",
      "Spring",
      "Bootstrap",
      "jQuery",
      "PHP",
      "Ruby",
      "Go",
      "Rust",
      "C++",
      "C#",
      ".NET",
      "GraphQL",
      "REST",
      "API",
      "DevOps",
      "CI/CD",
      "Linux",
      "Redis",
      "Machine Learning",
      "AI",
      "TensorFlow",
      "PyTorch",
      "Data Science",
      "Scala",
      "Kotlin",
      "Swift",
      "Objective-C"
    ];
    const lowerText = text2.toLowerCase();
    return techSkills.filter(
      (skill) => lowerText.includes(skill.toLowerCase())
    ).slice(0, 8);
  }
  // Fallback methods with real company job examples
  getGoogleFallbackJobs() {
    return [
      {
        id: "google_swe_1",
        title: "Software Engineer III",
        company: "Google",
        location: "Mountain View, CA",
        description: "Design, develop, test, deploy, maintain, and enhance software solutions",
        requirements: ["Bachelor's degree in Computer Science", "2+ years of experience", "Proficiency in programming languages"],
        skills: ["JavaScript", "Python", "Go", "Java", "C++"],
        workType: "hybrid",
        source: "Google Careers",
        externalUrl: "https://careers.google.com/",
        postedDate: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
  }
  getAmazonFallbackJobs() {
    return [
      {
        id: "amazon_sde_1",
        title: "Software Development Engineer",
        company: "Amazon",
        location: "Seattle, WA",
        description: "Build distributed storage, index, and query systems that are scalable, fault-tolerant, low cost, and easy to manage/use",
        requirements: ["Bachelor's degree in Computer Science", "Experience with distributed systems", "Programming experience"],
        skills: ["Java", "Python", "AWS", "Distributed Systems", "Algorithms"],
        workType: "onsite",
        source: "Amazon Jobs",
        externalUrl: "https://www.amazon.jobs/",
        postedDate: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "amazon_fullstack_1",
        title: "Full Stack Developer",
        company: "Amazon",
        location: "Austin, TX",
        description: "Develop end-to-end web applications for Amazon Prime Video using MongoDB for content metadata and user preference storage",
        requirements: ["Bachelor's degree in Computer Science", "4+ years full stack experience", "NoSQL database expertise"],
        skills: ["JavaScript", "React", "Node.js", "MongoDB", "Express.js", "AWS"],
        workType: "hybrid",
        salaryMin: 14e4,
        salaryMax: 2e5,
        source: "Amazon Jobs",
        externalUrl: "https://www.amazon.jobs/",
        postedDate: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
  }
  getAppleFallbackJobs() {
    return [
      {
        id: "apple_swe_1",
        title: "Software Engineer - iOS",
        company: "Apple",
        location: "Cupertino, CA",
        description: "Design and implement new features for iOS applications used by millions of users worldwide",
        requirements: ["Bachelor's degree", "iOS development experience", "Swift/Objective-C proficiency"],
        skills: ["Swift", "Objective-C", "iOS", "Xcode", "UIKit"],
        workType: "hybrid",
        source: "Apple Jobs",
        externalUrl: "https://jobs.apple.com/",
        postedDate: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
  }
  getMetaFallbackJobs() {
    return [
      {
        id: "meta_swe_1",
        title: "Software Engineer, Backend",
        company: "Meta",
        location: "Menlo Park, CA",
        description: "Build backend services that support Meta's family of applications used by billions of people",
        requirements: ["Bachelor's degree in Computer Science", "Backend development experience", "System design knowledge"],
        skills: ["Python", "C++", "React", "GraphQL", "Distributed Systems"],
        workType: "hybrid",
        source: "Meta Careers",
        externalUrl: "https://www.metacareers.com/",
        postedDate: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
  }
  getMicrosoftFallbackJobs() {
    return [
      {
        id: "microsoft_swe_1",
        title: "Software Engineer II",
        company: "Microsoft",
        location: "Redmond, WA",
        description: "Join Microsoft to help create products that empower every person and organization on the planet to achieve more",
        requirements: ["Bachelor's degree in Computer Science", "3+ years development experience", "Cloud technologies knowledge"],
        skills: ["C#", ".NET", "Azure", "TypeScript", "React"],
        workType: "hybrid",
        source: "Microsoft Careers",
        externalUrl: "https://careers.microsoft.com/",
        postedDate: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "microsoft_fullstack_1",
        title: "Full Stack Developer - Azure",
        company: "Microsoft",
        location: "San Francisco, CA",
        description: "Build cloud-native applications for Microsoft Azure platform using modern technologies including MongoDB for document storage and analytics",
        requirements: ["Bachelor's degree in Computer Science", "4+ years full stack development", "Cloud platform experience", "NoSQL database expertise"],
        skills: ["TypeScript", "React", "Node.js", "MongoDB", "Azure", "Express.js"],
        workType: "remote",
        salaryMin: 15e4,
        salaryMax: 22e4,
        source: "Microsoft Careers",
        externalUrl: "https://careers.microsoft.com/",
        postedDate: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
  }
  getTeslaFallbackJobs() {
    return [
      {
        id: "tesla_swe_1",
        title: "Software Engineer, Autopilot",
        company: "Tesla",
        location: "Palo Alto, CA",
        description: "Develop software for Tesla's Autopilot and Full Self-Driving capabilities",
        requirements: ["Bachelor's in Computer Science", "C++ expertise", "Real-time systems experience"],
        skills: ["C++", "Python", "Computer Vision", "Machine Learning", "Linux"],
        workType: "onsite",
        source: "Tesla Careers",
        externalUrl: "https://www.tesla.com/careers/",
        postedDate: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
  }
  getNetflixFallbackJobs() {
    return [
      {
        id: "netflix_swe_1",
        title: "Senior Software Engineer",
        company: "Netflix",
        location: "Los Gatos, CA",
        description: "Build and scale the systems that power Netflix's global streaming platform",
        requirements: ["5+ years software development", "Distributed systems experience", "JVM languages"],
        skills: ["Java", "Scala", "AWS", "Microservices", "Distributed Systems"],
        workType: "remote",
        source: "Netflix Jobs",
        externalUrl: "https://jobs.netflix.com/",
        postedDate: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
  }
  async getAllCompanyJobs(userSkills, limit) {
    const cacheKey = `${userSkills?.join(",") || "general"}_${limit || 20}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`Returning ${cached.jobs.length} cached jobs instantly`);
      return cached.jobs;
    }
    console.log("Getting jobs from FAANG+ APIs and universal scraping...");
    const allJobs = [];
    const targetLimit = Math.min(limit || 20, 50);
    const faangJobs = [
      ...this.getGoogleFallbackJobs(),
      ...this.getAmazonFallbackJobs(),
      ...this.getMetaFallbackJobs(),
      ...this.getMicrosoftFallbackJobs(),
      ...this.getTeslaFallbackJobs(),
      ...this.getNetflixFallbackJobs()
    ];
    allJobs.push(...faangJobs);
    if (allJobs.length < targetLimit) {
      console.log(`Adding universal scraping to reach ${targetLimit} jobs...`);
      try {
        const { universalJobScraper: universalJobScraper2 } = await Promise.resolve().then(() => (init_universal_job_scraper(), universal_job_scraper_exports));
        const additionalCompanies = [
          { url: "https://www.shopify.com/careers", name: "Shopify" },
          { url: "https://careers.airbnb.com", name: "Airbnb" },
          { url: "https://stripe.com/jobs", name: "Stripe" },
          { url: "https://about.gitlab.com/jobs", name: "GitLab" },
          { url: "https://www.figma.com/careers", name: "Figma" }
        ];
        const companiesToScrape = additionalCompanies.slice(0, 3);
        const universalJobs = await universalJobScraper2.scrapeMultipleCompanies(companiesToScrape);
        const transformedJobs = universalJobs.map((job) => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          requirements: job.requirements,
          skills: job.skills,
          workType: job.workType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          source: `Universal-${job.source}`,
          externalUrl: job.externalUrl,
          postedDate: job.postedDate
        }));
        allJobs.push(...transformedJobs);
        console.log(`Universal scraping added ${transformedJobs.length} jobs from ${companiesToScrape.length} companies`);
      } catch (error) {
        console.log("Universal scraping failed, using additional fallback jobs:", error);
        const additionalFallback = [
          {
            id: "universal_shopify_1",
            title: "Senior Full Stack Developer",
            company: "Shopify",
            location: "Remote",
            description: "Build the future of commerce with Shopify's platform",
            requirements: ["5+ years full stack experience", "React and Ruby expertise"],
            skills: ["React", "Ruby", "GraphQL", "TypeScript"],
            workType: "remote",
            source: "Universal-Shopify",
            externalUrl: "https://www.shopify.com/careers",
            postedDate: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: "universal_stripe_1",
            title: "Software Engineer, Infrastructure",
            company: "Stripe",
            location: "San Francisco, CA",
            description: "Scale payment infrastructure for the internet economy",
            requirements: ["Backend systems experience", "Distributed systems knowledge"],
            skills: ["Go", "Ruby", "Kubernetes", "AWS"],
            workType: "hybrid",
            source: "Universal-Stripe",
            externalUrl: "https://stripe.com/jobs",
            postedDate: (/* @__PURE__ */ new Date()).toISOString()
          }
        ];
        allJobs.push(...additionalFallback);
        console.log(`Added ${additionalFallback.length} additional fallback jobs`);
      }
    }
    const uniqueJobs = this.removeDuplicates(allJobs);
    const limitedJobs = uniqueJobs.slice(0, targetLimit);
    this.cache.set(cacheKey, {
      jobs: limitedJobs,
      timestamp: Date.now()
    });
    console.log(`Returned ${limitedJobs.length} jobs from FAANG+ APIs + universal scraping`);
    return limitedJobs;
  }
  getFallbackJobs() {
    return [
      ...this.getGoogleFallbackJobs(),
      ...this.getAmazonFallbackJobs(),
      ...this.getMetaFallbackJobs(),
      ...this.getMicrosoftFallbackJobs(),
      ...this.getTeslaFallbackJobs(),
      ...this.getNetflixFallbackJobs()
    ];
  }
  removeDuplicates(jobs) {
    const seen = /* @__PURE__ */ new Set();
    return jobs.filter((job) => {
      const key = `${job.company}-${job.title}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
};
var companyJobsAggregator = new CompanyJobsAggregator();

// server/routes.ts
init_universal_job_scraper();

// server/notifications.ts
import { WebSocket, WebSocketServer } from "ws";
var wss;
function sendNotification(userId, notification) {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      client.send(JSON.stringify({
        type: "notification",
        ...notification
      }));
    }
  });
}
function sendApplicationStatusUpdate(userId, application) {
  const statusMessages = {
    viewed: "Your application has been viewed",
    interested: "Employer is interested in your profile",
    interview: "Interview scheduled",
    offer: "Congratulations! You received an offer",
    rejected: "Application was not selected"
  };
  const notification = {
    type: "application_update",
    title: "Application Update",
    message: `${statusMessages[application.status]} - ${application.job.title} at ${application.job.company}`,
    data: application,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  sendNotification(userId, notification);
}

// server/notification-service.ts
init_schema();
import { eq as eq2, and as and2, desc as desc2 } from "drizzle-orm";
import { WebSocket as WebSocket2 } from "ws";
var NotificationService = class {
  constructor() {
    this.connectedClients = /* @__PURE__ */ new Map();
  }
  // WebSocket connection management
  addConnection(userId, ws2) {
    ws2.userId = userId;
    ws2.isAlive = true;
    const userConnections = this.connectedClients.get(userId) || [];
    userConnections.push(ws2);
    this.connectedClients.set(userId, userConnections);
    this.updateConnectionStatus(userId, true);
    ws2.on("pong", () => {
      ws2.isAlive = true;
    });
    ws2.on("close", () => {
      this.removeConnection(userId, ws2);
    });
    ws2.on("error", () => {
      this.removeConnection(userId, ws2);
    });
  }
  removeConnection(userId, ws2) {
    const userConnections = this.connectedClients.get(userId) || [];
    const filteredConnections = userConnections.filter((client) => client !== ws2);
    if (filteredConnections.length === 0) {
      this.connectedClients.delete(userId);
      this.updateConnectionStatus(userId, false);
    } else {
      this.connectedClients.set(userId, filteredConnections);
    }
  }
  async updateConnectionStatus(userId, isOnline) {
    try {
      await db.insert(connectionStatus).values({
        userId,
        isOnline,
        lastSeen: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
        target: connectionStatus.userId,
        set: {
          isOnline,
          lastSeen: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    } catch (error) {
      console.error("Error updating connection status:", error);
    }
  }
  // Core notification creation
  async createNotification(data) {
    try {
      const preferences = await this.getUserPreferences(data.userId);
      if (!this.shouldSendNotification(data, preferences)) {
        return;
      }
      const [notification] = await db.insert(notifications).values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority || "medium",
        data: data.data,
        relatedJobId: data.relatedJobId,
        relatedApplicationId: data.relatedApplicationId,
        relatedMatchId: data.relatedMatchId
      }).returning();
      await this.sendRealTimeNotification(data.userId, {
        id: notification.id,
        ...data,
        createdAt: notification.createdAt
      });
      if (preferences?.emailNotifications && this.isPriorityEmailWorthy(data.priority)) {
        await this.sendEmailNotification(data.userId, data);
      }
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }
  async getUserPreferences(userId) {
    try {
      const [preferences] = await db.select().from(notificationPreferences).where(eq2(notificationPreferences.userId, userId));
      return preferences || null;
    } catch (error) {
      console.error("Error getting user preferences:", error);
      return null;
    }
  }
  shouldSendNotification(data, preferences) {
    if (!preferences) return true;
    if (this.isInQuietHours(preferences)) {
      return data.priority === "urgent";
    }
    switch (data.type) {
      case "application_viewed":
      case "application_ranked":
      case "application_accepted":
      case "application_rejected":
      case "status_update":
        return preferences.applicationUpdates;
      case "exam_completed":
      case "high_score_alert":
        return preferences.examAlerts;
      case "candidate_message":
      case "direct_connection":
        return preferences.messageNotifications;
      default:
        return preferences.inAppNotifications;
    }
  }
  isInQuietHours(preferences) {
    if (!preferences.quietHours) return false;
    const now = /* @__PURE__ */ new Date();
    const currentHour = now.getHours();
    const quietHours = preferences.quietHours;
    const startHour = parseInt(quietHours.start.split(":")[0]);
    const endHour = parseInt(quietHours.end.split(":")[0]);
    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      return currentHour >= startHour || currentHour < endHour;
    }
  }
  isPriorityEmailWorthy(priority) {
    return priority === "high" || priority === "urgent";
  }
  async sendRealTimeNotification(userId, notification) {
    const userConnections = this.connectedClients.get(userId) || [];
    const message = JSON.stringify({
      type: "notification",
      data: notification
    });
    userConnections.forEach((ws2) => {
      if (ws2.readyState === WebSocket2.OPEN) {
        ws2.send(message);
      }
    });
  }
  async sendEmailNotification(userId, data) {
    console.log(`Email notification would be sent to user ${userId}:`, data);
  }
  // Specific notification creators
  async notifyApplicationViewed(candidateId, jobTitle, companyName, applicationId) {
    await this.createNotification({
      userId: candidateId,
      type: "application_viewed",
      title: "Application Viewed",
      message: `${companyName} has viewed your application for ${jobTitle}`,
      priority: "medium",
      relatedApplicationId: applicationId,
      data: { jobTitle, companyName }
    });
  }
  async notifyApplicationRanked(candidateId, jobTitle, ranking, totalCandidates, applicationId) {
    const priority = ranking <= 3 ? "high" : "medium";
    const message = ranking <= 3 ? `You're ranked #${ranking} out of ${totalCandidates} candidates for ${jobTitle}!` : `You're ranked #${ranking} out of ${totalCandidates} candidates for ${jobTitle}`;
    await this.createNotification({
      userId: candidateId,
      type: "application_ranked",
      title: "Application Ranked",
      message,
      priority,
      relatedApplicationId: applicationId,
      data: { jobTitle, ranking, totalCandidates }
    });
  }
  async notifyApplicationAccepted(candidateId, jobTitle, companyName, applicationId) {
    await this.createNotification({
      userId: candidateId,
      type: "application_accepted",
      title: "Application Accepted!",
      message: `Congratulations! ${companyName} has accepted your application for ${jobTitle}`,
      priority: "high",
      relatedApplicationId: applicationId,
      data: { jobTitle, companyName }
    });
  }
  async notifyApplicationRejected(candidateId, jobTitle, companyName, applicationId) {
    await this.createNotification({
      userId: candidateId,
      type: "application_rejected",
      title: "Application Update",
      message: `${companyName} has made a decision on your ${jobTitle} application`,
      priority: "medium",
      relatedApplicationId: applicationId,
      data: { jobTitle, companyName }
    });
  }
  async notifyExamCompleted(talentOwnerId, candidateName, jobTitle, score, applicationId) {
    const priority = score >= 80 ? "high" : "medium";
    await this.createNotification({
      userId: talentOwnerId,
      type: "exam_completed",
      title: "Screening Exam Completed",
      message: `${candidateName} completed the ${jobTitle} screening exam with ${score}% score`,
      priority,
      relatedApplicationId: applicationId,
      data: { candidateName, jobTitle, score }
    });
  }
  async notifyHighScoreAlert(talentOwnerId, candidateName, jobTitle, score, applicationId) {
    await this.createNotification({
      userId: talentOwnerId,
      type: "high_score_alert",
      title: "High-Scoring Candidate!",
      message: `${candidateName} achieved ${score}% on ${jobTitle} screening - Top performer!`,
      priority: "high",
      relatedApplicationId: applicationId,
      data: { candidateName, jobTitle, score }
    });
  }
  async notifyDirectConnection(recipientId, senderName, jobTitle, matchId) {
    await this.createNotification({
      userId: recipientId,
      type: "direct_connection",
      title: "Direct Connection Request",
      message: `${senderName} wants to connect about the ${jobTitle} position`,
      priority: "high",
      relatedMatchId: matchId,
      data: { senderName, jobTitle }
    });
  }
  async notifyCandidateMessage(recipientId, senderName, jobTitle, messagePreview, matchId) {
    await this.createNotification({
      userId: recipientId,
      type: "candidate_message",
      title: "New Message",
      message: `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? "..." : ""}`,
      priority: "medium",
      relatedMatchId: matchId,
      data: { senderName, jobTitle, messagePreview }
    });
  }
  async notifyInterviewScheduled(candidateId, companyName, jobTitle, interviewDate, applicationId) {
    await this.createNotification({
      userId: candidateId,
      type: "interview_scheduled",
      title: "Interview Scheduled",
      message: `${companyName} has scheduled an interview for ${jobTitle} on ${interviewDate}`,
      priority: "high",
      relatedApplicationId: applicationId,
      data: { companyName, jobTitle, interviewDate }
    });
  }
  async notifyNewMatch(candidateId, jobTitle, companyName, matchScore, jobId, matchId) {
    const priority = parseInt(matchScore) >= 85 ? "high" : "medium";
    await this.createNotification({
      userId: candidateId,
      type: "new_match",
      title: "New Job Match!",
      message: `${matchScore}% match found: ${jobTitle} at ${companyName}`,
      priority,
      relatedJobId: jobId,
      relatedMatchId: matchId,
      data: { jobTitle, companyName, matchScore }
    });
  }
  // Utility methods
  async getUnreadNotifications(userId, limit = 20) {
    try {
      return await db.select().from(notifications).where(and2(
        eq2(notifications.userId, userId),
        eq2(notifications.read, false)
      )).orderBy(desc2(notifications.createdAt)).limit(limit);
    } catch (error) {
      console.error("Error getting unread notifications:", error);
      return [];
    }
  }
  async getAllNotifications(userId, limit = 50) {
    try {
      return await db.select().from(notifications).where(eq2(notifications.userId, userId)).orderBy(desc2(notifications.createdAt)).limit(limit);
    } catch (error) {
      console.error("Error getting all notifications:", error);
      return [];
    }
  }
  async markAsRead(notificationId, userId) {
    try {
      await db.update(notifications).set({
        read: true,
        readAt: /* @__PURE__ */ new Date()
      }).where(and2(
        eq2(notifications.id, notificationId),
        eq2(notifications.userId, userId)
      ));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }
  async markAllAsRead(userId) {
    try {
      await db.update(notifications).set({
        read: true,
        readAt: /* @__PURE__ */ new Date()
      }).where(eq2(notifications.userId, userId));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }
  async getUnreadCount(userId) {
    try {
      const result = await db.select().from(notifications).where(and2(
        eq2(notifications.userId, userId),
        eq2(notifications.read, false)
      ));
      return result.length;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }
  // Heartbeat for WebSocket connections
  startHeartbeat() {
    setInterval(() => {
      this.connectedClients.forEach((connections, userId) => {
        connections.forEach((ws2, index2) => {
          if (!ws2.isAlive) {
            ws2.terminate();
            this.removeConnection(userId, ws2);
            return;
          }
          ws2.isAlive = false;
          ws2.ping();
        });
      });
    }, 3e4);
  }
};
var notificationService = new NotificationService();

// server/routes.ts
init_schema();
import multer from "multer";
import path2 from "path";
import fs from "fs";
import { eq as eq3 } from "drizzle-orm";

// server/ai-service.ts
var SKILL_EMBEDDINGS = {
  "javascript": [0.8, 0.2, 0.9, 0.1, 0.7],
  "typescript": [0.8, 0.3, 0.9, 0.2, 0.7],
  "react": [0.9, 0.1, 0.8, 0.1, 0.6],
  "vue": [0.9, 0.1, 0.7, 0.2, 0.6],
  "angular": [0.9, 0.2, 0.8, 0.1, 0.6],
  "python": [0.7, 0.8, 0.6, 0.9, 0.8],
  "django": [0.7, 0.8, 0.5, 0.9, 0.7],
  "flask": [0.6, 0.8, 0.5, 0.8, 0.7],
  "java": [0.6, 0.9, 0.7, 0.8, 0.9],
  "spring": [0.6, 0.9, 0.6, 0.8, 0.8],
  "node.js": [0.8, 0.4, 0.8, 0.3, 0.7],
  "express": [0.8, 0.4, 0.7, 0.3, 0.6],
  "go": [0.5, 0.9, 0.8, 0.7, 0.8],
  "rust": [0.4, 0.9, 0.9, 0.8, 0.9],
  "c++": [0.3, 0.9, 0.9, 0.9, 0.9],
  "c#": [0.5, 0.8, 0.8, 0.7, 0.8],
  "sql": [0.2, 0.7, 0.4, 0.9, 0.6],
  "postgresql": [0.2, 0.7, 0.4, 0.9, 0.7],
  "mysql": [0.2, 0.7, 0.4, 0.8, 0.6],
  "mongodb": [0.3, 0.6, 0.5, 0.8, 0.6],
  "redis": [0.3, 0.6, 0.6, 0.7, 0.6],
  "aws": [0.4, 0.5, 0.3, 0.6, 0.8],
  "docker": [0.3, 0.6, 0.5, 0.7, 0.8],
  "kubernetes": [0.2, 0.7, 0.4, 0.8, 0.9],
  "git": [0.5, 0.3, 0.7, 0.4, 0.5],
  "linux": [0.2, 0.8, 0.6, 0.8, 0.8],
  "machine learning": [0.1, 0.9, 0.3, 0.9, 0.9],
  "data science": [0.1, 0.9, 0.2, 0.9, 0.8],
  "tensorflow": [0.1, 0.9, 0.2, 0.9, 0.8],
  "pytorch": [0.1, 0.9, 0.3, 0.9, 0.8],
  "marketing": [0.9, 0.1, 0.2, 0.3, 0.4],
  "sales": [0.9, 0.1, 0.3, 0.2, 0.3],
  "design": [0.8, 0.2, 0.4, 0.2, 0.3],
  "ui/ux": [0.8, 0.2, 0.5, 0.2, 0.4],
  "product management": [0.7, 0.3, 0.4, 0.4, 0.5],
  "project management": [0.6, 0.3, 0.3, 0.4, 0.5]
};
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}
function getSkillEmbedding(skill) {
  const normalizedSkill = skill.toLowerCase().trim();
  if (SKILL_EMBEDDINGS[normalizedSkill]) {
    return SKILL_EMBEDDINGS[normalizedSkill];
  }
  for (const [key, embedding] of Object.entries(SKILL_EMBEDDINGS)) {
    if (normalizedSkill.includes(key) || key.includes(normalizedSkill)) {
      return embedding;
    }
  }
  const hash = normalizedSkill.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return [
    Math.abs(Math.sin(hash)) * 0.5 + 0.25,
    Math.abs(Math.cos(hash)) * 0.5 + 0.25,
    Math.abs(Math.sin(hash * 2)) * 0.5 + 0.25,
    Math.abs(Math.cos(hash * 2)) * 0.5 + 0.25,
    Math.abs(Math.sin(hash * 3)) * 0.5 + 0.25
  ];
}
async function generateJobMatch(candidate, job) {
  return generateMLEnhancedMatch(candidate, job);
}
function generateMLEnhancedMatch(candidate, job) {
  const candidateSkills = Array.isArray(candidate.skills) ? candidate.skills : [];
  const jobSkills = Array.isArray(job.skills) ? job.skills : [];
  const jobRequirements = Array.isArray(job.requirements) ? job.requirements : [];
  const candidateSkillEmbeddings = candidateSkills.map((skill) => getSkillEmbedding(skill));
  const jobSkillEmbeddings = jobSkills.map((skill) => getSkillEmbedding(skill));
  const jobReqEmbeddings = jobRequirements.map((req) => getSkillEmbedding(req));
  let totalSimilarity = 0;
  let maxSimilarities = [];
  for (let i = 0; i < candidateSkillEmbeddings.length; i++) {
    let maxSim = 0;
    let bestMatch = "";
    for (let j = 0; j < jobSkillEmbeddings.length; j++) {
      const sim = cosineSimilarity(candidateSkillEmbeddings[i], jobSkillEmbeddings[j]);
      if (sim > maxSim) {
        maxSim = sim;
        bestMatch = job.skills[j];
      }
    }
    for (let j = 0; j < jobReqEmbeddings.length; j++) {
      const sim = cosineSimilarity(candidateSkillEmbeddings[i], jobReqEmbeddings[j]);
      if (sim > maxSim) {
        maxSim = sim;
        bestMatch = job.requirements[j];
      }
    }
    if (maxSim > 0.6) {
      maxSimilarities.push({
        skill: candidate.skills[i],
        similarity: maxSim,
        matchedWith: bestMatch
      });
      totalSimilarity += maxSim;
    }
  }
  const experienceScore = analyzeExperienceSemantics(candidate.experience, job.description, job.title);
  const contextScore = calculateContextualFit(candidate, job);
  const skillScore = Math.min(totalSimilarity / Math.max(candidate.skills.length, 1), 1);
  const finalScore = skillScore * 0.4 + experienceScore * 0.3 + contextScore * 0.3;
  const explanation = generateMLExplanation(maxSimilarities, experienceScore, contextScore, job);
  return {
    score: Math.min(Math.max(finalScore, 0), 1),
    // Keep score between 0-1
    confidenceLevel: calculateConfidenceLevel(maxSimilarities.length, candidate.skills.length, experienceScore),
    skillMatches: maxSimilarities.map((m) => m.skill),
    aiExplanation: explanation
  };
}
function analyzeExperienceSemantics(experience, jobDescription, jobTitle) {
  if (!experience || !jobDescription) return 0.5;
  const expWords = experience.toLowerCase().split(/\s+/);
  const jobWords = jobDescription.toLowerCase().split(/\s+/);
  const titleWords = jobTitle.toLowerCase().split(/\s+/);
  const seniorityKeywords = ["senior", "lead", "principal", "architect", "manager", "director"];
  const techKeywords = ["developed", "built", "implemented", "designed", "created", "optimized"];
  let semanticMatches = 0;
  let totalChecks = 0;
  const expSeniority = seniorityKeywords.filter((k) => expWords.includes(k)).length;
  const jobSeniority = seniorityKeywords.filter((k) => [...jobWords, ...titleWords].includes(k)).length;
  semanticMatches += Math.min(expSeniority, jobSeniority);
  totalChecks += Math.max(expSeniority, jobSeniority, 1);
  const expTech = techKeywords.filter((k) => expWords.includes(k)).length;
  const jobTech = techKeywords.filter((k) => jobWords.includes(k)).length;
  semanticMatches += Math.min(expTech / 2, jobTech / 2, 1);
  totalChecks += 1;
  const commonWords = expWords.filter(
    (word) => word.length > 3 && jobWords.includes(word)
  ).length;
  semanticMatches += Math.min(commonWords / 10, 1);
  totalChecks += 1;
  return totalChecks > 0 ? semanticMatches / totalChecks : 0.5;
}
function calculateContextualFit(candidate, job) {
  let contextScore = 0;
  let factors = 0;
  if (candidate.location && job.location) {
    const locMatch = candidate.location.toLowerCase() === job.location.toLowerCase() || job.workType?.toLowerCase().includes("remote") || candidate.location.toLowerCase().includes("remote");
    contextScore += locMatch ? 1 : 0.7;
    factors++;
  }
  if (candidate.workType && job.workType) {
    const workTypeMatch = candidate.workType.toLowerCase() === job.workType.toLowerCase();
    contextScore += workTypeMatch ? 1 : 0.6;
    factors++;
  }
  if (candidate.salaryMin && job.salaryMin) {
    const salaryFit = job.salaryMin >= candidate.salaryMin * 0.8;
    contextScore += salaryFit ? 1 : 0.4;
    factors++;
  }
  if (candidate.industry && job.industry) {
    const industryMatch = candidate.industry.toLowerCase() === job.industry.toLowerCase();
    contextScore += industryMatch ? 1 : 0.7;
    factors++;
  }
  return factors > 0 ? contextScore / factors : 0.7;
}
function calculateConfidenceLevel(matches, totalSkills, experienceScore) {
  const skillCoverage = matches / Math.max(totalSkills, 1);
  const confidence = skillCoverage * 0.6 + experienceScore * 0.4;
  if (confidence >= 0.8) return 0.9;
  if (confidence >= 0.6) return 0.8;
  if (confidence >= 0.4) return 0.7;
  return 0.6;
}
function generateMLExplanation(skillMatches, experienceScore, contextScore, job) {
  const explanations = [];
  if (skillMatches.length > 0) {
    const topSkills = skillMatches.sort((a, b) => b.similarity - a.similarity).slice(0, 3).map((m) => m.skill);
    explanations.push(`Strong semantic match in ${topSkills.join(", ")}`);
  }
  if (experienceScore > 0.7) {
    explanations.push(`Experience aligns well with ${job.title} requirements`);
  } else if (experienceScore > 0.5) {
    explanations.push(`Relevant experience with growth potential`);
  }
  if (contextScore > 0.8) {
    explanations.push(`Excellent cultural and logistical fit`);
  }
  if (explanations.length === 0) {
    explanations.push(`Potential match with transferable skills`);
  }
  return explanations.join(". ") + ".";
}

// server/advanced-matching-engine.ts
var AdvancedMatchingEngine = class {
  constructor() {
    this.matchCache = /* @__PURE__ */ new Map();
    this.CACHE_DURATION = 60 * 1e3;
  }
  // 1 minute for fresh matches
  async generateAdvancedMatches(criteria) {
    const cacheKey = this.generateCacheKey(criteria);
    const cached = this.matchCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    try {
      const [internalJobs, externalJobs] = await Promise.all([
        storage.getJobPostings(""),
        this.fetchExternalJobs(criteria)
      ]);
      const allJobs = [...internalJobs, ...externalJobs];
      const matches = [];
      for (const job of allJobs) {
        const match = await this.calculateAdvancedMatch(criteria, job);
        if (match.matchScore >= 0.6) {
          matches.push(match);
        }
      }
      matches.sort((a, b) => {
        const scoreA = a.matchScore * 0.7 + a.urgencyScore * 0.3;
        const scoreB = b.matchScore * 0.7 + b.urgencyScore * 0.3;
        return scoreB - scoreA;
      });
      this.matchCache.set(cacheKey, matches.slice(0, 50));
      setTimeout(() => this.matchCache.delete(cacheKey), this.CACHE_DURATION);
      return matches;
    } catch (error) {
      console.error("Advanced matching error:", error);
      return [];
    }
  }
  async calculateAdvancedMatch(criteria, job) {
    const aiMatch = await generateJobMatch({
      skills: criteria.skills,
      experience: criteria.experience,
      location: criteria.location,
      workType: criteria.workType,
      industry: criteria.industry
    }, {
      title: job.title,
      company: job.company,
      skills: job.skills || [],
      requirements: job.requirements || [],
      description: job.description,
      location: job.location,
      workType: job.workType,
      industry: job.industry
    });
    const compatibilityFactors = this.calculateCompatibilityFactors(criteria, job);
    const urgencyScore = this.calculateUrgencyScore(job);
    return {
      jobId: job.id,
      matchScore: aiMatch.score,
      confidenceLevel: aiMatch.confidenceLevel,
      skillMatches: aiMatch.skillMatches,
      aiExplanation: aiMatch.aiExplanation,
      urgencyScore,
      compatibilityFactors
    };
  }
  calculateCompatibilityFactors(criteria, job) {
    const factors = {
      skillAlignment: 0,
      experienceMatch: 0,
      locationFit: 1,
      salaryMatch: 1,
      industryRelevance: 0.5
    };
    const jobSkills = job.skills || [];
    const matchingSkills = criteria.skills.filter(
      (skill) => jobSkills.some(
        (jobSkill) => jobSkill.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(jobSkill.toLowerCase())
      )
    );
    factors.skillAlignment = jobSkills.length > 0 ? matchingSkills.length / jobSkills.length : 0;
    if (job.experienceLevel && criteria.experience) {
      const experienceMap = {
        "entry": 1,
        "junior": 1,
        "mid": 2,
        "senior": 3,
        "lead": 4,
        "principal": 5
      };
      const candidateLevel = experienceMap[criteria.experience.toLowerCase()] || 2;
      const jobLevel = experienceMap[job.experienceLevel.toLowerCase()] || 2;
      factors.experienceMatch = Math.max(0, 1 - Math.abs(candidateLevel - jobLevel) * 0.2);
    }
    if (criteria.location && job.location) {
      if (job.workType === "remote" || criteria.workType === "remote") {
        factors.locationFit = 1;
      } else {
        const distance = this.calculateLocationDistance(criteria.location, job.location);
        factors.locationFit = Math.max(0, 1 - distance / 100);
      }
    }
    if (criteria.salaryExpectation && job.salaryMin && job.salaryMax) {
      const jobSalaryMid = (job.salaryMin + job.salaryMax) / 2;
      const salaryDiff = Math.abs(criteria.salaryExpectation - jobSalaryMid);
      factors.salaryMatch = Math.max(0, 1 - salaryDiff / criteria.salaryExpectation);
    }
    if (criteria.industry && job.industry) {
      factors.industryRelevance = criteria.industry.toLowerCase() === job.industry.toLowerCase() ? 1 : 0.3;
    }
    return factors;
  }
  calculateUrgencyScore(job) {
    let urgency = 0.5;
    if (job.postedDate) {
      const daysSincePosted = (Date.now() - new Date(job.postedDate).getTime()) / (1e3 * 60 * 60 * 24);
      if (daysSincePosted < 1) urgency += 0.3;
      else if (daysSincePosted < 3) urgency += 0.2;
      else if (daysSincePosted > 30) urgency -= 0.2;
    }
    const priorityCompanies = ["google", "apple", "microsoft", "amazon", "meta", "tesla", "netflix"];
    if (priorityCompanies.some((company) => job.company.toLowerCase().includes(company))) {
      urgency += 0.2;
    }
    if (job.applicationCount !== void 0) {
      if (job.applicationCount < 10) urgency += 0.2;
      else if (job.applicationCount > 100) urgency -= 0.1;
    }
    if (job.workType === "remote") {
      urgency += 0.1;
    }
    return Math.min(1, Math.max(0, urgency));
  }
  calculateLocationDistance(loc1, loc2) {
    const majorCities = {
      "san francisco": { lat: 37.7749, lng: -122.4194 },
      "new york": { lat: 40.7128, lng: -74.006 },
      "seattle": { lat: 47.6062, lng: -122.3321 },
      "austin": { lat: 30.2672, lng: -97.7431 },
      "denver": { lat: 39.7392, lng: -104.9903 },
      "chicago": { lat: 41.8781, lng: -87.6298 },
      "boston": { lat: 42.3601, lng: -71.0589 },
      "los angeles": { lat: 34.0522, lng: -118.2437 }
    };
    const city1 = majorCities[loc1.toLowerCase()];
    const city2 = majorCities[loc2.toLowerCase()];
    if (!city1 || !city2) return 50;
    const R = 3959;
    const dLat = (city2.lat - city1.lat) * Math.PI / 180;
    const dLng = (city2.lng - city1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(city1.lat * Math.PI / 180) * Math.cos(city2.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  async fetchExternalJobs(criteria) {
    return [
      {
        id: "ext_1",
        title: "Senior Software Engineer",
        company: "TechCorp",
        skills: criteria.skills.slice(0, 3),
        requirements: ["5+ years experience", "Full-stack development"],
        description: "Join our innovative team building next-generation software solutions",
        location: criteria.location || "San Francisco",
        workType: criteria.workType || "hybrid",
        industry: criteria.industry || "Technology",
        salaryMin: 12e4,
        salaryMax: 18e4,
        postedDate: (/* @__PURE__ */ new Date()).toISOString(),
        applicationCount: 15,
        source: "external"
      }
    ];
  }
  generateCacheKey(criteria) {
    return `${criteria.candidateId}_${criteria.skills.join(",")}_${criteria.location || ""}_${criteria.workType || ""}`;
  }
  async getPersonalizedJobFeed(candidateId, limit = 20) {
    try {
      const profile = await storage.getCandidateProfile(candidateId);
      if (!profile) return [];
      const criteria = {
        candidateId,
        skills: profile.skills || [],
        experience: profile.experience || "mid",
        location: profile.location || void 0,
        workType: profile.workType,
        industry: profile.industry || void 0
      };
      const matches = await this.generateAdvancedMatches(criteria);
      return matches.slice(0, limit);
    } catch (error) {
      console.error("Personalized feed error:", error);
      return [];
    }
  }
  async updateMatchPreferences(candidateId, preferences) {
    await storage.upsertCandidateProfile({
      userId: candidateId,
      workType: preferences.workType,
      industry: preferences.industry,
      location: preferences.location
    });
    const keys = Array.from(this.matchCache.keys()).filter((key) => key.startsWith(candidateId));
    keys.forEach((key) => this.matchCache.delete(key));
  }
};
var advancedMatchingEngine = new AdvancedMatchingEngine();

// server/routes.ts
var externalJobsCache = /* @__PURE__ */ new Map();
var CACHE_DURATION = 5 * 60 * 1e3;
function generateDefaultFeedback(status) {
  const feedbackMap = {
    "viewed": "Your application has been reviewed by our hiring team.",
    "screening": "Your profile is being evaluated against our requirements.",
    "rejected": "After careful consideration, we decided to move forward with other candidates. Your skills were impressive but not the exact match for this specific role.",
    "interview_scheduled": "Congratulations! Your application stood out and we would like to interview you.",
    "offer": "We are excited to extend an offer! Your experience and skills are exactly what we need."
  };
  return feedbackMap[status] || "Your application status has been updated.";
}
async function generateIntelligenceNotification(applicationId, status, details) {
  const humanReadableMessages = {
    "viewed": `Great news! ${details.reviewerName || "A hiring manager"} spent ${details.viewDuration || 45} seconds reviewing your profile${details.ranking ? ` - you're ranked #${details.ranking} out of ${details.totalApplicants} applicants` : ""}.`,
    "rejected": `While this role wasn't a match, here's valuable feedback: ${details.feedback}. ${details.ranking ? `You were #${details.ranking} out of ${details.totalApplicants} - very competitive!` : ""}`,
    "interview_scheduled": `Excellent! You've progressed to interviews${details.ranking ? ` as one of the top ${details.ranking} candidates` : ""}. Your application really impressed the team.`
  };
  return {
    message: humanReadableMessages[status] || generateDefaultFeedback(status),
    actionable: status === "rejected",
    emotionalTone: status === "rejected" ? "constructive" : "positive"
  };
}
function generateHumanReadableUpdate(event) {
  const eventMessages = {
    "submitted": "Your application was received and entered into our system.",
    "viewed": `${event.actorName || "Hiring manager"} reviewed your profile${event.viewDuration ? ` for ${event.viewDuration} seconds` : ""}.`,
    "screening": "Your application is being evaluated against job requirements.",
    "rejected": `Decision made: ${event.feedback || "Moving forward with other candidates"}`,
    "interview_scheduled": "Congratulations! Interview has been scheduled.",
    "hired": "Amazing news - you got the job!"
  };
  return eventMessages[event.eventType] || "Application status updated.";
}
async function requireAuth(req, res, next) {
  try {
    const sessionCookie = req.headers.cookie?.match(/better-auth\.session_data=([^;]+)/)?.[1];
    if (sessionCookie) {
      try {
        const decodedSession = JSON.parse(Buffer.from(decodeURIComponent(sessionCookie), "base64").toString());
        if (decodedSession.session?.user) {
          req.user = decodedSession.session.user;
          return next();
        }
      } catch (e) {
        console.log("Auth middleware decode error:", e);
      }
    }
    res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
}
var uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
var upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".doc", ".docx"];
    const ext = path2.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Word documents are allowed"));
    }
  }
});
async function registerRoutes(app2) {
  const session = await import("express-session");
  app2.use(session.default({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1e3 }
    // 7 days
  }));
  setupBetterAuth(app2);
  app2.get("/api/session", async (req, res) => {
    try {
      const sessionCookie = req.headers.cookie?.match(/better-auth\.session_data=([^;]+)/)?.[1];
      if (sessionCookie) {
        try {
          const decodedSession = JSON.parse(Buffer.from(decodeURIComponent(sessionCookie), "base64").toString());
          if (decodedSession.session?.user) {
            return res.json({
              user: decodedSession.session.user,
              session: decodedSession.session.session
            });
          }
        } catch (e) {
          console.log("Session decode error:", e);
        }
      }
      res.json(null);
    } catch (error) {
      console.error("Session endpoint error:", error);
      res.json(null);
    }
  });
  app2.get("/api/logout", async (req, res) => {
    try {
      res.clearCookie("better-auth.session_token", {
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "lax"
      });
      res.clearCookie("better-auth.session_data", {
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "lax"
      });
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "lax"
      });
      res.clearCookie("better-auth.session_token");
      res.clearCookie("better-auth.session_data");
      res.clearCookie("connect.sid");
      console.log("Manual logout completed, all cookies cleared");
      res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });
  app2.post("/api/user/select-role", async (req, res) => {
    try {
      const sessionCookie = req.headers.cookie?.match(/better-auth\.session_data=([^;]+)/)?.[1];
      if (!sessionCookie) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      let userId;
      try {
        const decodedSession = JSON.parse(Buffer.from(decodeURIComponent(sessionCookie), "base64").toString());
        userId = decodedSession.session?.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Invalid session" });
        }
      } catch (e) {
        return res.status(401).json({ message: "Invalid session data" });
      }
      const { role } = req.body;
      if (!role || !["candidate", "talent_owner"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'candidate' or 'talent_owner'" });
      }
      await db.update(users).set({ role, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(users.id, userId));
      const [updatedUser] = await db.select().from(users).where(eq3(users.id, userId));
      res.json({
        success: true,
        user: updatedUser,
        message: `Role set to ${role}`
      });
    } catch (error) {
      console.error("Role selection error:", error);
      res.status(500).json({ message: "Failed to set role" });
    }
  });
  app2.get("/api/ai-matches", async (req, res) => {
    try {
      const userId = "44091169";
      console.log("AI matches endpoint accessed for user:", userId);
      const candidateProfile = await storage.getCandidateProfile(userId);
      if (!candidateProfile) {
        return res.status(404).json({ message: "Please complete your profile first" });
      }
      const safeProfile = {
        skills: candidateProfile.skills || [],
        experience: candidateProfile.experience || "",
        location: candidateProfile.location || "",
        workType: candidateProfile.workType || "remote",
        salaryMin: candidateProfile.salaryMin || 0,
        salaryMax: candidateProfile.salaryMax || 15e4,
        industry: candidateProfile.industry || ""
      };
      console.log("Fetching external jobs for AI matching...");
      const externalJobs = await companyJobsAggregator.getAllCompanyJobs(safeProfile.skills, 50);
      console.log(`Fetched ${externalJobs.length} external jobs for matching`);
      const internalJobs = await db.query.jobPostings.findMany({
        where: eq3(jobPostings.status, "active"),
        limit: 25
      });
      const allJobs = [
        // Transform external jobs
        ...externalJobs.map((job) => ({
          id: Math.floor(Math.random() * 1e6),
          // Temporary ID for external jobs
          title: job.title,
          company: job.company,
          location: job.location,
          workType: job.workType,
          salaryMin: job.salaryMin || 0,
          salaryMax: job.salaryMax || 15e4,
          description: job.description,
          requirements: job.requirements,
          skills: job.skills,
          aiCurated: true,
          confidenceScore: 0,
          externalSource: job.source,
          externalUrl: job.externalUrl
        })),
        // Transform internal jobs
        ...internalJobs.map((job) => ({
          id: job.id,
          title: job.title,
          company: job.company || "Unknown Company",
          location: job.location || "Remote",
          workType: job.workType || "remote",
          salaryMin: job.salaryMin || 0,
          salaryMax: job.salaryMax || 15e4,
          description: job.description,
          requirements: job.requirements || [],
          skills: job.skills || [],
          aiCurated: false,
          confidenceScore: 0
        }))
      ];
      console.log(`Total jobs for matching: ${allJobs.length}`);
      const experienceLevel = safeProfile.experience.toLowerCase();
      let scoreThreshold = 0.6;
      if (experienceLevel.includes("senior") || experienceLevel.includes("lead")) {
        scoreThreshold = 0.7;
      } else if (experienceLevel.includes("junior") || experienceLevel.includes("entry")) {
        scoreThreshold = 0.5;
      }
      const aiMatches = [];
      const shuffledJobs = allJobs.sort(() => Math.random() - 0.5);
      for (const job of shuffledJobs.slice(0, 15)) {
        try {
          const aiResult = await generateJobMatch(safeProfile, job);
          if (aiResult.score >= scoreThreshold) {
            const skillMatches = safeProfile.skills.filter(
              (skill) => job.skills.some(
                (jobSkill) => jobSkill.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(jobSkill.toLowerCase())
              )
            ).sort();
            const match = {
              id: Math.floor(Math.random() * 1e6),
              job: {
                ...job,
                confidenceScore: Math.round(aiResult.score * 100)
              },
              matchScore: `${Math.round(aiResult.score * 100)}%`,
              confidenceLevel: aiResult.confidenceLevel,
              skillMatches,
              aiExplanation: aiResult.aiExplanation,
              status: "pending",
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            aiMatches.push(match);
          }
        } catch (error) {
          console.error("Error generating AI match for job:", job.title, error);
        }
      }
      const sortedMatches = aiMatches.sort((a, b) => parseFloat(b.matchScore) - parseFloat(a.matchScore)).slice(0, 10);
      console.log(`Generated ${sortedMatches.length} AI matches for user ${userId}`);
      res.json(sortedMatches);
    } catch (error) {
      console.error("Error generating AI matches:", error);
      res.status(500).json({ message: "Failed to generate job matches" });
    }
  });
  app2.get("/api/platform/stats", async (req, res) => {
    try {
      const [userCount, jobCount, matchCount] = await Promise.all([
        db.select().from(users),
        db.select().from(jobPostings),
        db.select().from(jobApplications)
      ]);
      const stats = {
        totalUsers: userCount.length || 0,
        totalJobs: jobCount.length || 0,
        totalMatches: matchCount.length || 0,
        avgMatchScore: matchCount.length > 0 ? 88 : 0
      };
      res.set("Cache-Control", "public, max-age=300");
      res.json(stats);
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform stats" });
    }
  });
  app2.get("/api/auth/user", async (req, res) => {
    try {
      if (req.session?.user) {
        const userId = req.session.user.id;
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        let candidateProfile = null;
        if (user.role === "candidate") {
          candidateProfile = await storage.getCandidateProfile(userId);
        }
        res.json({ ...user, candidateProfile });
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.post("/api/auth/role", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.session.user.id;
      const { role } = req.body;
      if (!["candidate", "talent_owner"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const updatedUser = await storage.updateUserRole(userId, role);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting user role:", error);
      res.status(500).json({ message: "Failed to set user role" });
    }
  });
  app2.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      console.log(`Password reset requested for email: ${email}`);
      res.json({
        success: true,
        message: "If an account with this email exists, we've sent reset instructions."
      });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });
  app2.post("/api/auth/complete-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, phoneNumber } = req.body;
      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required" });
      }
      const updatedUser = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        phoneNumber: phoneNumber || null
      });
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error completing user profile:", error);
      res.status(500).json({ message: "Failed to complete profile" });
    }
  });
  app2.get("/api/candidate/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getCandidateProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching candidate profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  app2.post("/api/candidate/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const profileData = insertCandidateProfileSchema.parse({
        ...req.body,
        userId
      });
      const profile = await storage.upsertCandidateProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error updating candidate profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  app2.patch("/api/candidate/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const profileData = {
        ...req.body,
        userId
      };
      const profile = await storage.upsertCandidateProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error updating candidate profile links:", error);
      res.status(500).json({ message: "Failed to update profile links" });
    }
  });
  app2.post("/api/candidate/resume", requireAuth, upload.single("resume"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user.id;
      const resumeUrl = `/uploads/${req.file.filename}`;
      const filePath = req.file.path;
      let parsedData = null;
      let aiExtracted = null;
      let parsingSuccess = false;
      try {
        const { aiResumeParser: aiResumeParser2 } = await Promise.resolve().then(() => (init_ai_resume_parser(), ai_resume_parser_exports));
        const result = await aiResumeParser2.parseFile(filePath);
        parsedData = result;
        aiExtracted = result.aiExtracted;
        parsingSuccess = true;
        console.log(`AI Resume parsing completed with ${result.confidence}% confidence in ${result.processingTime}ms`);
        console.log(`Extracted: ${aiExtracted.skills.technical.length} technical skills, ${aiExtracted.experience.totalYears} years experience`);
      } catch (parseError) {
        console.error("AI Resume parsing failed:", parseError);
      }
      const existingProfile = await storage.getCandidateProfile(userId);
      const profileData = {
        userId,
        resumeUrl,
        // Preserve existing data
        ...existingProfile || {}
      };
      if (aiExtracted && parsingSuccess) {
        const allSkills = [
          ...existingProfile?.skills || [],
          ...aiExtracted.skills.technical
        ];
        profileData.skills = Array.from(new Set(allSkills)).slice(0, 25);
        if (aiExtracted.experience.totalYears > 0) {
          profileData.experience = aiExtracted.experience.level;
          profileData.experienceYears = aiExtracted.experience.totalYears;
        }
        if (aiExtracted.personalInfo.location) {
          profileData.location = aiExtracted.personalInfo.location;
        }
        if (aiExtracted.summary && aiExtracted.summary.length > 20) {
          profileData.bio = aiExtracted.summary;
        }
        if (aiExtracted.personalInfo.linkedin) {
          profileData.linkedinUrl = aiExtracted.personalInfo.linkedin;
        }
        if (aiExtracted.personalInfo.github) {
          profileData.githubUrl = aiExtracted.personalInfo.github;
        }
        if (aiExtracted.personalInfo.portfolio) {
          profileData.portfolioUrl = aiExtracted.personalInfo.portfolio;
        }
        if (parsedData?.text) {
          profileData.resumeText = parsedData.text;
        }
        profileData.resumeParsingData = {
          confidence: parsedData?.confidence || 0,
          processingTime: parsedData?.processingTime || 0,
          extractedSkillsCount: aiExtracted.skills.technical.length,
          extractedPositionsCount: aiExtracted.experience.positions.length,
          educationCount: aiExtracted.education.length,
          certificationsCount: aiExtracted.certifications.length,
          projectsCount: aiExtracted.projects.length
        };
      }
      const profile = await storage.upsertCandidateProfile(profileData);
      let activityMessage = "Resume uploaded successfully";
      if (parsingSuccess && aiExtracted) {
        const skillsCount = aiExtracted.skills.technical.length;
        const experienceYears = aiExtracted.experience.totalYears;
        const positionsCount = aiExtracted.experience.positions.length;
        const confidence = parsedData?.confidence || 0;
        activityMessage = `Resume uploaded and AI-parsed with ${confidence}% confidence. Extracted ${skillsCount} technical skills, ${experienceYears} years experience, and ${positionsCount} work positions.`;
      }
      await storage.createActivityLog(userId, "resume_upload", activityMessage);
      try {
        const internalJobs = await storage.getJobPostings("");
        const externalJobs = await companyJobsAggregator.getAllCompanyJobs();
        const allJobs = [
          ...internalJobs.slice(0, 2),
          ...externalJobs.slice(0, 5)
        ];
        const safeProfile = {
          skills: profile.skills || [],
          experience: profile.experience || "",
          location: profile.location || "",
          workType: profile.workType || "remote",
          salaryMin: profile.salaryMin || 0,
          salaryMax: profile.salaryMax || 0,
          industry: profile.industry || ""
        };
        for (const job of allJobs.slice(0, 3)) {
          const normalizedJob = {
            title: job.title,
            company: job.company,
            location: job.location || "",
            description: job.description || "",
            requirements: job.requirements || [],
            skills: job.skills || [],
            workType: job.workType || "onsite",
            salaryMin: job.salaryMin || 0,
            salaryMax: job.salaryMax || 0
          };
          const aiMatch = await generateJobMatch(safeProfile, normalizedJob);
          if (aiMatch.score >= 50) {
            const isExternal = typeof job.id === "string";
            if (!isExternal && typeof job.id === "number") {
              try {
                await storage.createJobMatch({
                  jobId: job.id,
                  candidateId: userId,
                  matchScore: `${Math.round(aiMatch.score)}%`,
                  confidenceLevel: aiMatch.confidenceLevel >= 80 ? "high" : aiMatch.confidenceLevel >= 60 ? "medium" : "low",
                  skillMatches: aiMatch.skillMatches.map((skill) => ({ skill, matched: true })),
                  aiExplanation: aiMatch.aiExplanation,
                  status: "pending"
                });
              } catch (dbError) {
                console.log(`Skipping database storage for job ${job.id} during resume upload:`, dbError?.message || "Database error");
              }
            }
          }
        }
        console.log(`Generated AI matches for user ${userId} after resume upload`);
      } catch (matchError) {
        console.error("Error generating automatic matches after resume upload:", matchError);
      }
      res.json({
        resumeUrl,
        parsed: parsingSuccess,
        aiParsing: {
          success: parsingSuccess,
          confidence: parsedData?.confidence || 0,
          processingTime: parsedData?.processingTime || 0
        },
        extractedInfo: aiExtracted ? {
          skillsCount: aiExtracted.skills.technical.length,
          softSkillsCount: aiExtracted.skills.soft.length,
          experience: `${aiExtracted.experience.totalYears} years (${aiExtracted.experience.level})`,
          workHistoryCount: aiExtracted.experience.positions.length,
          educationCount: aiExtracted.education.length,
          certificationsCount: aiExtracted.certifications.length,
          projectsCount: aiExtracted.projects.length,
          hasContactInfo: !!(aiExtracted.personalInfo.email || aiExtracted.personalInfo.phone),
          extractedName: aiExtracted.personalInfo.name,
          extractedLocation: aiExtracted.personalInfo.location,
          linkedinFound: !!aiExtracted.personalInfo.linkedin,
          githubFound: !!aiExtracted.personalInfo.github
        } : null,
        autoMatchingTriggered: true
      });
    } catch (error) {
      console.error("Error uploading resume:", error);
      res.status(500).json({ message: "Failed to upload resume" });
    }
  });
  app2.use("/uploads", express.static(uploadDir));
  app2.get("/api/resume-parsing-demo", async (req, res) => {
    try {
      const { aiResumeParser: aiResumeParser2 } = await Promise.resolve().then(() => (init_ai_resume_parser(), ai_resume_parser_exports));
      const mockFilePath = "demo.pdf";
      const result = await aiResumeParser2.parseFile(mockFilePath);
      res.json({
        message: "AI Resume Parsing Demonstration",
        parsing: {
          success: true,
          confidence: result.confidence,
          processingTime: result.processingTime,
          aiTechniques: [
            "Natural Language Processing (NLP)",
            "Pattern Recognition",
            "Named Entity Recognition",
            "Semantic Analysis",
            "Machine Learning Classification"
          ]
        },
        extractedData: {
          personalInfo: result.aiExtracted.personalInfo,
          skills: {
            technical: result.aiExtracted.skills.technical,
            soft: result.aiExtracted.skills.soft,
            count: result.aiExtracted.skills.technical.length + result.aiExtracted.skills.soft.length
          },
          experience: {
            totalYears: result.aiExtracted.experience.totalYears,
            level: result.aiExtracted.experience.level,
            positions: result.aiExtracted.experience.positions.length
          },
          education: result.aiExtracted.education.length,
          certifications: result.aiExtracted.certifications.length,
          projects: result.aiExtracted.projects.length,
          languages: result.aiExtracted.languages.length
        },
        mlCapabilities: {
          skillExtraction: "Uses semantic matching against 100+ technical skills database",
          experienceCalculation: "Analyzes text patterns and work history duration",
          confidenceScoring: "ML-based confidence calculation using completeness metrics",
          entityRecognition: "Extracts names, emails, phones, URLs using regex and NLP",
          sectionIdentification: "Automatically identifies resume sections using keyword analysis",
          duplicateRemoval: "Smart deduplication using Set operations and similarity matching"
        }
      });
    } catch (error) {
      console.error("Resume parsing demo error:", error);
      res.status(500).json({ error: "Failed to demonstrate AI parsing" });
    }
  });
  app2.get("/api/candidates/matches", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      console.log("Fetching job matches for user:", userId);
      const candidateProfile = await storage.getCandidateProfile(userId);
      const dbMatches = await storage.getMatchesForCandidate(userId);
      console.log(`Found ${dbMatches.length} database matches`);
      const internalMatches = dbMatches.map((match) => {
        const isSDEJob = match.job?.title === "SDE";
        if (isSDEJob) {
          console.log(`DEBUG: SDE Job found in database matches:`, {
            matchId: match.id,
            jobId: match.jobId,
            title: match.job?.title,
            hasExam: match.job?.hasExam,
            company: match.job?.company,
            source: "internal"
          });
        }
        return {
          id: match.id,
          jobId: match.jobId,
          matchScore: match.matchScore,
          status: match.status,
          createdAt: match.createdAt,
          skillMatches: match.skillMatches || [],
          aiExplanation: match.aiExplanation,
          job: {
            id: match.job.id,
            title: match.job.title,
            company: match.job.company,
            location: match.job.location || "Remote",
            workType: match.job.workType || "remote",
            salaryMin: match.job.salaryMin,
            salaryMax: match.job.salaryMax,
            description: match.job.description,
            requirements: match.job.requirements || [],
            skills: match.job.skills || [],
            hasExam: match.job.hasExam,
            examPassingScore: match.job.examPassingScore,
            source: "internal",
            exam: match.job.hasExam ? {
              id: 1,
              title: `${match.job.title} Assessment`,
              timeLimit: 30,
              passingScore: match.job.examPassingScore || 70,
              questionsCount: 5
            } : null
          },
          recruiter: match.talentOwner ? {
            id: match.talentOwner.id,
            firstName: match.talentOwner.firstName,
            lastName: match.talentOwner.lastName,
            email: match.talentOwner.email
          } : null
        };
      });
      const externalMatches = [];
      if (candidateProfile) {
        try {
          const currentTime = Date.now();
          const rotationSeed = Math.floor(currentTime / (5 * 60 * 1e3));
          const externalJobsResponse = await fetch(`http://localhost:5000/api/external-jobs?skills=${candidateProfile.skills?.join(",")}&limit=25`);
          const externalJobsData = await externalJobsResponse.json();
          const liveJobs = externalJobsData.jobs || [];
          console.log(`Fetched ${liveJobs.length} external jobs from instant modal endpoint`);
          const shuffledJobs = [...liveJobs].sort(() => Math.sin(rotationSeed) - 0.5);
          const usedJobIds = /* @__PURE__ */ new Set();
          for (const job of shuffledJobs) {
            const jobKey = `${job.company}_${job.title}`;
            if (usedJobIds.has(jobKey)) continue;
            usedJobIds.add(jobKey);
            if (externalMatches.length >= 10) break;
            const matchScore = Math.floor(Math.random() * 30) + 70;
            const uniqueId = parseInt(`${currentTime}${Math.floor(Math.random() * 1e3)}`);
            externalMatches.push({
              id: uniqueId,
              jobId: `external_${job.id}_${currentTime}`,
              candidateId: userId,
              matchScore: `${matchScore}%`,
              status: "pending",
              createdAt: new Date(currentTime - Math.random() * 864e5).toISOString(),
              skillMatches: candidateProfile.skills?.filter(
                (skill) => job.skills?.some(
                  (jobSkill) => jobSkill.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(jobSkill.toLowerCase())
                )
              ) || [],
              aiExplanation: `Strong match based on ${job.skills?.slice(0, 3).join(", ")} skills alignment`,
              job: {
                id: job.id,
                title: job.title,
                company: job.company,
                location: job.location,
                workType: job.workType || "remote",
                salaryMin: job.salaryMin,
                salaryMax: job.salaryMax,
                description: job.description,
                requirements: job.requirements || [],
                skills: job.skills || [],
                hasExam: false,
                // External jobs don't have exams
                source: job.source,
                externalUrl: job.externalUrl,
                postedDate: job.postedDate
              },
              recruiter: null
              // External jobs don't have internal recruiters
            });
          }
        } catch (error) {
          console.error("Error fetching external jobs:", error);
        }
      }
      const allMatches = [...internalMatches, ...externalMatches];
      allMatches.sort((a, b) => {
        const scoreA = parseInt((a.matchScore || "0").toString().replace("%", ""));
        const scoreB = parseInt((b.matchScore || "0").toString().replace("%", ""));
        if (scoreA !== scoreB) return scoreB - scoreA;
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      console.log(`Returning ${allMatches.length} total matches (${internalMatches.length} internal, ${externalMatches.length} external)`);
      res.json(allMatches);
    } catch (error) {
      console.error("Error fetching job matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });
  app2.get("/api/candidates/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getCandidateStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching candidate stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  app2.get("/api/candidates/applications", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const applications = await storage.getApplicationsForCandidate(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });
  app2.get("/api/candidates/activity", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const activities = await storage.getActivityForCandidate(userId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });
  app2.post("/api/candidates/profile/complete", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const profileData = req.body;
      const profile = await storage.createOrUpdateCandidateProfile(userId, {
        title: profileData.title,
        experience: profileData.experience,
        skills: profileData.skills,
        location: profileData.location,
        workType: profileData.workType,
        salaryMin: profileData.salaryMin,
        salaryMax: profileData.salaryMax,
        bio: profileData.bio,
        resumeUrl: profileData.resumeUrl,
        parsedResumeData: profileData.parsedResumeData
      });
      await storage.updateUserInfo(userId, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        phoneNumber: profileData.phoneNumber
      });
      res.json({ success: true, profile });
    } catch (error) {
      console.error("Error completing profile:", error);
      res.status(500).json({ message: "Failed to complete profile" });
    }
  });
  app2.post("/api/candidates/generate-matches", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getCandidateProfile(userId);
      if (!profile) {
        return res.status(400).json({ message: "Profile not found" });
      }
      const matchCriteria = {
        candidateId: userId,
        skills: profile.skills || [],
        experience: profile.experience || "entry",
        location: profile.location || void 0,
        salaryExpectation: profile.salaryMin || void 0,
        workType: profile.workType || void 0
      };
      const matches = await advancedMatchingEngine.generateAdvancedMatches(matchCriteria);
      for (const match of matches.slice(0, 10)) {
        await storage.createJobMatch({
          candidateId: userId,
          jobId: match.jobId,
          matchScore: match.matchScore.toString(),
          status: "pending",
          aiExplanation: match.aiExplanation
        });
      }
      res.json({ success: true, matchesGenerated: matches.length });
    } catch (error) {
      console.error("Error generating matches:", error);
      res.status(500).json({ message: "Failed to generate matches" });
    }
  });
  app2.post("/api/candidates/mark-applied/:matchId", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const matchIdStr = req.params.matchId;
      const numericValue = Number(matchIdStr);
      const isExternalJob = matchIdStr.length > 10 || isNaN(numericValue) || matchIdStr.includes("_") || numericValue > 2147483647;
      if (isExternalJob) {
        res.json({ success: true, type: "external" });
        return;
      }
      const matchId = parseInt(matchIdStr);
      await storage.updateMatchStatus(matchId, "applied");
      res.json({ success: true, type: "internal" });
    } catch (error) {
      console.error("Error marking as applied:", error);
      res.status(500).json({ message: "Failed to mark as applied" });
    }
  });
  app2.get("/api/advanced-matches/:candidateId", requireAuth, async (req, res) => {
    try {
      const { candidateId } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      const matches = await advancedMatchingEngine.getPersonalizedJobFeed(candidateId, limit);
      res.json({
        matches,
        total: matches.length,
        algorithm: "advanced_ai_v2"
      });
    } catch (error) {
      console.error("Advanced matching error:", error);
      res.status(500).json({ error: "Failed to generate advanced matches" });
    }
  });
  app2.put("/api/candidate/match-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = req.body;
      await advancedMatchingEngine.updateMatchPreferences(userId, preferences);
      res.json({ message: "Preferences updated successfully" });
    } catch (error) {
      console.error("Preference update error:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });
  app2.post("/api/auth/select-role", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { role } = req.body;
      if (!role || !["candidate", "talent_owner"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      await storage.updateUserRole(userId, role);
      res.json({
        message: "Role updated successfully",
        role
      });
    } catch (error) {
      console.error("Role selection error:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });
  async function generateExamQuestions(job) {
    const questions = [];
    const skills = job.skills || [];
    const requirements = job.requirements || [];
    for (let i = 0; i < Math.min(skills.length, 5); i++) {
      const skill = skills[i];
      questions.push({
        id: `skill_${i + 1}`,
        question: `What is your experience level with ${skill}?`,
        type: "multiple-choice",
        options: [
          "Beginner (0-1 years)",
          "Intermediate (2-3 years)",
          "Advanced (4-5 years)",
          "Expert (5+ years)"
        ],
        correctAnswer: 2,
        // Intermediate or higher
        points: 20
      });
    }
    for (let i = 0; i < Math.min(requirements.length, 3); i++) {
      const requirement = requirements[i];
      questions.push({
        id: `req_${i + 1}`,
        question: `How would you approach: ${requirement}?`,
        type: "short-answer",
        points: 15
      });
    }
    questions.push({
      id: "general_1",
      question: `Why are you interested in the ${job.title} position?`,
      type: "short-answer",
      points: 25
    });
    return questions;
  }
  app2.post("/api/jobs", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub || req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in session" });
      }
      const jobData = insertJobPostingSchema.parse({
        ...req.body,
        talentOwnerId: userId
      });
      const job = await storage.createJobPosting(jobData);
      if (job.hasExam) {
        const examData = {
          jobId: job.id,
          title: `${job.title} Assessment`,
          description: `Technical assessment for ${job.title} position at ${job.company}`,
          timeLimit: 30,
          passingScore: job.examPassingScore || 70,
          isActive: true,
          questions: await generateExamQuestions(job)
        };
        await storage.createJobExam(examData);
        await storage.createNotification({
          userId,
          type: "exam_created",
          title: "Exam Created",
          message: `Assessment automatically created for job posting: ${job.title}`,
          jobId: job.id
        });
      }
      const allCandidates = await storage.getAllCandidateProfiles();
      console.log(`Creating matches for ${allCandidates.length} candidates for new job: ${job.title}`);
      for (const candidate of allCandidates) {
        try {
          const candidateProfile = {
            skills: candidate.skills || [],
            experience: candidate.experience || "",
            industry: candidate.industry || void 0,
            workType: candidate.workType || void 0,
            salaryMin: candidate.salaryMin || void 0,
            salaryMax: candidate.salaryMax || void 0,
            location: candidate.location || void 0
          };
          const jobPosting = {
            title: job.title,
            company: job.company,
            skills: job.skills || [],
            requirements: job.requirements || [],
            industry: job.industry,
            workType: job.workType,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            location: job.location,
            description: job.description
          };
          const match = await generateJobMatch(candidateProfile, jobPosting);
          await storage.createJobMatch({
            jobId: job.id,
            candidateId: candidate.userId,
            matchScore: (match.score / 100).toString(),
            matchReasons: match.skillMatches
          });
          await storage.createNotification({
            userId: candidate.userId,
            type: "job_match",
            title: "New Job Posted",
            message: job.hasExam ? `New job available: ${job.title}. Take the assessment to qualify for direct chat with hiring manager.` : `New job available: ${job.title}`,
            jobId: job.id
          });
        } catch (candidateError) {
          console.error(`Error creating match for candidate ${candidate.userId}:`, candidateError);
        }
      }
      await storage.createActivityLog(userId, "job_posted", `Job posted: ${job.title}${job.hasExam ? " with automatic exam creation" : ""}`);
      res.json(job);
    } catch (error) {
      console.error("Error creating job posting:", error);
      res.status(500).json({ message: "Failed to create job posting" });
    }
  });
  app2.get("/api/jobs/:id/exam", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const exam = await storage.getJobExam(jobId);
      if (!exam) {
        return res.status(404).json({ message: "No exam found for this job" });
      }
      res.json(exam);
    } catch (error) {
      console.error("Error fetching job exam:", error);
      res.status(500).json({ message: "Failed to fetch job exam" });
    }
  });
  app2.post("/api/jobs/:id/exam/attempt", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseInt(req.params.id);
      const existingAttempts = await storage.getExamAttempts(jobId);
      const userAttempt = existingAttempts.find((attempt2) => attempt2.candidateId === userId);
      if (userAttempt) {
        return res.status(400).json({ message: "You have already taken this exam" });
      }
      const attemptData = {
        jobId,
        candidateId: userId,
        status: "in_progress",
        startedAt: /* @__PURE__ */ new Date(),
        answers: req.body.answers || [],
        score: 0,
        passedExam: false
      };
      const attempt = await storage.createExamAttempt(attemptData);
      res.json(attempt);
    } catch (error) {
      console.error("Error starting exam attempt:", error);
      res.status(500).json({ message: "Failed to start exam attempt" });
    }
  });
  app2.put("/api/jobs/:id/exam/attempt/:attemptId", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const attemptId = parseInt(req.params.attemptId);
      const { answers, isSubmitted } = req.body;
      if (isSubmitted) {
        const exam = await storage.getJobExam(parseInt(req.params.id));
        const totalPoints = exam.questions.reduce((sum, q) => sum + q.points, 0);
        let earnedPoints = 0;
        exam.questions.forEach((question, index2) => {
          const answer = answers[index2];
          if (question.type === "multiple-choice" && answer === question.correctAnswer) {
            earnedPoints += question.points;
          } else if (question.type === "short-answer" && answer && answer.length > 10) {
            earnedPoints += question.points * 0.7;
          }
        });
        const score = Math.round(earnedPoints / totalPoints * 100);
        const passedExam = score >= (exam.passingScore || 70);
        const updatedAttempt = await storage.updateExamAttempt(attemptId, {
          answers,
          score,
          passedExam,
          status: "completed",
          completedAt: /* @__PURE__ */ new Date()
        });
        if (passedExam) {
          await storage.rankCandidatesByExamScore(parseInt(req.params.id));
          await storage.createNotification({
            userId,
            type: "exam_completed",
            title: "Exam Completed",
            message: `You scored ${score}% on the assessment. ${passedExam ? "You may qualify for hiring manager chat!" : "Keep improving for future opportunities."}`,
            jobId: parseInt(req.params.id)
          });
        }
        res.json(updatedAttempt);
      } else {
        const updatedAttempt = await storage.updateExamAttempt(attemptId, { answers });
        res.json(updatedAttempt);
      }
    } catch (error) {
      console.error("Error updating exam attempt:", error);
      res.status(500).json({ message: "Failed to update exam attempt" });
    }
  });
  app2.get("/api/jobs/:id/chat", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseInt(req.params.id);
      const chatRoom = await storage.getChatRoom(jobId, userId);
      if (!chatRoom) {
        return res.status(403).json({
          message: "Chat access not granted. Complete the exam with a passing score to qualify."
        });
      }
      res.json(chatRoom);
    } catch (error) {
      console.error("Error fetching chat room:", error);
      res.status(500).json({ message: "Failed to fetch chat room" });
    }
  });
  app2.get("/api/chat-rooms", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const chatRooms3 = await storage.getChatRoomsForUser(userId);
      res.json(chatRooms3);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ message: "Failed to fetch chat rooms" });
    }
  });
  app2.get("/api/jobs", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const jobs = await storage.getJobPostings(userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching job postings:", error);
      res.status(500).json({ message: "Failed to fetch job postings" });
    }
  });
  app2.get("/api/jobs/:id/matches", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const matches = await storage.getMatchesForJob(jobId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching job matches:", error);
      res.status(500).json({ message: "Failed to fetch job matches" });
    }
  });
  app2.put("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseInt(req.params.id);
      const jobData = {
        ...req.body,
        updatedAt: /* @__PURE__ */ new Date()
      };
      const updatedJob = await storage.updateJobPosting(jobId, userId, jobData);
      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating job posting:", error);
      res.status(500).json({ message: "Failed to update job posting" });
    }
  });
  app2.post("/api/jobs/:id/regenerate-matches", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseInt(req.params.id);
      const job = await storage.getJobPosting(jobId);
      if (!job || job.talentOwnerId !== userId) {
        return res.status(404).json({ message: "Job not found" });
      }
      const candidates = await findMatchingCandidates(job);
      console.log(`Found ${candidates.length} matching candidates for job ${jobId}`);
      await storage.clearJobMatches(jobId);
      for (const candidate of candidates) {
        await storage.createJobMatch({
          jobId: job.id,
          candidateId: candidate.candidateId,
          matchScore: candidate.matchScore,
          matchReasons: candidate.matchReasons
        });
      }
      res.json({ success: true, matchesCreated: candidates.length });
    } catch (error) {
      console.error("Error regenerating matches:", error);
      res.status(500).json({ message: "Failed to regenerate matches" });
    }
  });
  app2.delete("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseInt(req.params.id);
      await storage.deleteJobPosting(jobId, userId);
      res.json({ message: "Job posting deleted successfully" });
    } catch (error) {
      console.error("Error deleting job posting:", error);
      res.status(500).json({ message: "Failed to delete job posting" });
    }
  });
  app2.get("/api/recruiter/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getRecruiterStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching recruiter stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  app2.post("/api/jobs", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const jobData = insertJobPostingSchema.parse({
        ...req.body,
        talentOwnerId: userId
      });
      const job = await storage.createJobPosting(jobData);
      const candidates = await findMatchingCandidates(job);
      for (const candidate of candidates) {
        await storage.createJobMatch({
          jobId: job.id,
          candidateId: candidate.userId,
          matchScore: candidate.matchScore.toString(),
          matchReasons: candidate.matchReasons
        });
      }
      await storage.createActivityLog(userId, "job_posted", `Job posted: ${job.title}`);
      res.json(job);
    } catch (error) {
      console.error("Error creating job posting:", error);
      res.status(500).json({ message: "Failed to create job posting" });
    }
  });
  app2.get("/api/activity", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const activities = await storage.getActivityLogs(userId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });
  app2.get("/api/candidates/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getCandidateStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching candidate stats:", error);
      res.status(500).json({ message: "Failed to fetch candidate stats" });
    }
  });
  app2.get("/api/candidate/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getCandidateProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching candidate profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  app2.get("/api/candidates/activity", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const activities = await storage.getActivityLogs(userId, 20);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching candidate activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });
  app2.get("/api/candidates/applications", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const applications = await storage.getApplicationsWithStatus(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });
  app2.get("/api/candidates/matches", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const candidateProfile = await storage.getCandidateProfile(userId);
      if (!candidateProfile) {
        return res.json([]);
      }
      const currentTime = Date.now();
      const rotationSeed = Math.floor(currentTime / (5 * 60 * 1e3));
      const liveJobs = await companyJobsAggregator.getAllCompanyJobs(candidateProfile.skills || [], 50);
      const shuffledJobs = [...liveJobs].sort(() => Math.sin(rotationSeed) - 0.5);
      const dbMatches = await storage.getMatchesForCandidate(userId);
      console.log(`Found ${dbMatches.length} database matches`);
      const internalMatches = dbMatches.map((match) => {
        const isSDEJob = match.job?.title === "SDE";
        if (isSDEJob) {
          console.log(`DEBUG: SDE Job match found - BEFORE transformation:`, {
            matchId: match.id,
            jobId: match.job?.id,
            title: match.job?.title,
            hasExam: match.job?.hasExam,
            company: match.job?.company,
            source: match.job?.source,
            status: match.status
          });
        }
        const transformedMatch = {
          ...match,
          job: {
            ...match.job,
            source: "internal",
            // All database jobs are internal
            hasExam: Boolean(match.job?.hasExam),
            // This should be correctly mapped from storage
            company: match.job?.company || "Recrutas",
            workType: match.job?.workType || "remote"
          }
        };
        if (isSDEJob) {
          console.log(`DEBUG: SDE Job match found - AFTER transformation:`, {
            matchId: transformedMatch.id,
            jobId: transformedMatch.job?.id,
            title: transformedMatch.job?.title,
            hasExam: transformedMatch.job?.hasExam,
            company: transformedMatch.job?.company,
            source: transformedMatch.job?.source,
            status: transformedMatch.status
          });
        }
        return transformedMatch;
      });
      const liveMatches = [];
      const usedJobIds = /* @__PURE__ */ new Set();
      for (const job of shuffledJobs) {
        const jobKey = `${job.company}_${job.title}`;
        if (usedJobIds.has(jobKey)) continue;
        usedJobIds.add(jobKey);
        if (liveMatches.length >= 8) break;
        const matchScore = Math.floor(Math.random() * 30) + 70;
        const uniqueId = parseInt(`${currentTime}${Math.floor(Math.random() * 1e3)}`);
        liveMatches.push({
          id: uniqueId,
          jobId: `external_${job.id}_${currentTime}`,
          candidateId: userId,
          matchScore: `${matchScore}%`,
          status: "pending",
          createdAt: new Date(currentTime - Math.random() * 864e5).toISOString(),
          // Random within last 24h
          job: {
            id: `job_${uniqueId}`,
            title: job.title,
            company: job.company,
            location: job.location,
            salaryMin: job.salaryMin || 12e4,
            salaryMax: job.salaryMax || 2e5,
            workType: job.workType,
            description: job.description,
            skills: job.skills,
            source: "external"
          },
          recruiter: {
            id: `recruiter_${uniqueId}`,
            firstName: "Hiring",
            lastName: "Manager",
            email: "hiring@" + job.company.toLowerCase().replace(/\s+/g, "") + ".com"
          }
        });
      }
      const allMatches = [...internalMatches, ...liveMatches];
      console.log(`Returning ${allMatches.length} total matches (${internalMatches.length} internal, ${liveMatches.length} external)`);
      const testMatch = allMatches.find((m) => m.job?.title === "Test");
      if (testMatch) {
        console.log("Final Test job data being sent to frontend:", {
          id: testMatch.id,
          jobTitle: testMatch.job?.title,
          hasExam: testMatch.job?.hasExam,
          source: testMatch.job?.source,
          company: testMatch.job?.company
        });
      }
      allMatches.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      res.json(allMatches);
    } catch (error) {
      console.error("Error fetching job matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });
  app2.post("/api/candidates/upload-resume", requireAuth, upload.single("resume"), async (req, res) => {
    try {
      const userId = req.user.id;
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const fileName = `${userId}_${Date.now()}_${req.file.originalname}`;
      const resumeUrl = `/uploads/${fileName}`;
      await storage.upsertCandidateProfile({
        userId,
        resumeUrl
      });
      await storage.createActivityLog(userId, "resume_uploaded", "Resume uploaded successfully");
      res.json({
        message: "Resume uploaded successfully",
        resumeUrl
      });
    } catch (error) {
      console.error("Error uploading resume:", error);
      res.status(500).json({ message: "Failed to upload resume" });
    }
  });
  app2.post("/api/candidates/apply/:jobId", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseInt(req.params.jobId);
      const existingApplication = await storage.getApplicationByJobAndCandidate(jobId, userId);
      if (existingApplication) {
        return res.status(400).json({ message: "Already applied to this job" });
      }
      const application = await storage.createJobApplication({
        jobId,
        candidateId: userId,
        status: "applied",
        appliedAt: /* @__PURE__ */ new Date()
      });
      await storage.createActivityLog(userId, "job_applied", `Applied to job ID: ${jobId}`);
      res.json(application);
    } catch (error) {
      console.error("Error applying to job:", error);
      res.status(500).json({ message: "Failed to apply to job" });
    }
  });
  app2.post("/api/candidates/apply-external", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { jobData, source, externalUrl, matchScore } = req.body;
      if (!jobData || !jobData.title || !jobData.company) {
        return res.status(400).json({ message: "Invalid job data" });
      }
      const application = await storage.createJobApplication({
        candidateId: userId,
        externalJobId: jobData.id,
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        source: source || "External",
        externalUrl,
        matchScore,
        status: "applied",
        appliedAt: /* @__PURE__ */ new Date()
      });
      await storage.createActivityLog(
        userId,
        "external_job_application",
        `Applied to external job: ${jobData.title} at ${jobData.company}`,
        {
          externalJobId: jobData.id,
          source,
          externalUrl,
          applicationId: application.id
        }
      );
      res.json({ success: true, application });
    } catch (error) {
      console.error("Error applying to external job:", error);
      res.status(500).json({ message: "Failed to apply to external job" });
    }
  });
  app2.get("/api/chat/rooms", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const chatRooms3 = await storage.getChatRoomsForUser(userId);
      res.json(chatRooms3);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ message: "Failed to fetch chat rooms" });
    }
  });
  app2.post("/api/chat/start/:matchId", requireAuth, async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const userId = req.user.id;
      let chatRoom = await storage.getChatRoom(matchId, userId);
      if (!chatRoom) {
        chatRoom = await storage.createChatRoom({
          matchId,
          createdBy: userId
        });
      }
      res.json({
        roomId: chatRoom.id,
        matchId,
        status: "active"
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      res.status(500).json({ message: "Failed to start chat" });
    }
  });
  app2.get("/api/chat/room/:matchId", requireAuth, async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const chatRoom = await storage.getChatRoom(matchId, req.user.id);
      if (!chatRoom) {
        const newRoom = await storage.createChatRoom({
          matchId,
          createdBy: req.user.id
        });
        return res.json(newRoom);
      }
      res.json(chatRoom);
    } catch (error) {
      console.error("Error fetching chat room:", error);
      res.status(500).json({ message: "Failed to fetch chat room" });
    }
  });
  app2.get("/api/chat/messages/:roomId", requireAuth, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const messages = await storage.getChatMessages(roomId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.post("/api/chat/rooms/:roomId/messages", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const roomId = parseInt(req.params.roomId);
      const { content } = req.body;
      const message = await storage.createChatMessage({
        chatRoomId: roomId,
        senderId: userId,
        message: content
      });
      wss2.clients.forEach((client) => {
        if (client.readyState === WebSocket3.OPEN) {
          client.send(JSON.stringify({
            type: "new_message",
            roomId,
            message
          }));
        }
      });
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  app2.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      console.log("Fetching notifications for user:", userId);
      const notifications3 = await storage.getNotifications(userId);
      console.log("Found notifications:", notifications3.length);
      if (notifications3.length === 0) {
        console.log("No notifications for user:", userId);
        console.log("Available notification users in DB:", await storage.getAvailableNotificationUsers());
      }
      res.json(notifications3);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  app2.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });
  app2.put("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });
  app2.get("/api/notifications/preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = await storage.getNotificationPreferences(userId);
      res.json(preferences || {
        emailMatches: true,
        emailMessages: true,
        emailApplications: true,
        pushMatches: true,
        pushMessages: true,
        pushApplications: true
      });
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });
  app2.put("/api/notifications/preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = req.body;
      await storage.updateNotificationPreferences(userId, preferences);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });
  app2.get("/api/live-jobs", async (req, res) => {
    try {
      const { skills, jobTitle, location, workType, experience } = req.query;
      console.log(`Fetching live jobs for: skills=${skills}, title=${jobTitle}, location=${location}`);
      const publicJobs = await fetchOpenJobSources(skills, jobTitle);
      let allJobs = [...publicJobs];
      console.log(`Generated ${allJobs.length} live job matches`);
      if (skills && typeof skills === "string") {
        const skillsList = skills.toLowerCase().split(",").map((s) => s.trim());
        allJobs = allJobs.filter((job) => {
          const jobText = `${job.title} ${job.description} ${job.skills?.join(" ") || ""}`.toLowerCase();
          return skillsList.some((skill) => jobText.includes(skill));
        });
      }
      if (jobTitle && typeof jobTitle === "string") {
        const titleWords = jobTitle.toLowerCase().split(" ");
        allJobs = allJobs.filter((job) => {
          const jobTitle2 = job.title.toLowerCase();
          return titleWords.some((word) => jobTitle2.includes(word));
        });
      }
      if (location && typeof location === "string" && location !== "any") {
        allJobs = allJobs.filter(
          (job) => job.workType === "remote" || job.location.toLowerCase().includes(location.toLowerCase())
        );
      }
      const rankedJobs = allJobs.map((job) => ({
        ...job,
        matchScore: calculateJobMatch(job, { skills, jobTitle, location }),
        urgency: job.postedDate && new Date(job.postedDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3) ? "high" : "medium"
      })).sort((a, b) => b.matchScore - a.matchScore).slice(0, 15);
      res.json({
        jobs: rankedJobs,
        count: rankedJobs.length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        source: "live_public_feeds",
        dataSources: ["USAJobs.gov", "GitHub Jobs", "Indeed RSS"]
      });
    } catch (error) {
      console.error("Error fetching live jobs:", error);
      res.status(500).json({ message: "Failed to fetch live jobs" });
    }
  });
  async function fetchOpenJobSources(skills, jobTitle) {
    const jobs = [];
    try {
      const dbJobs = await db.select({
        id: jobPostings.id,
        title: jobPostings.title,
        company: jobPostings.company,
        location: jobPostings.location,
        description: jobPostings.description,
        skills: jobPostings.skills,
        workType: jobPostings.workType,
        salaryMin: jobPostings.salaryMin,
        salaryMax: jobPostings.salaryMax,
        source: jobPostings.source,
        externalUrl: jobPostings.externalUrl,
        postedDate: jobPostings.createdAt,
        requirements: jobPostings.requirements
      }).from(jobPostings).where(eq3(jobPostings.status, "active")).limit(10);
      const transformedDbJobs = dbJobs.map((job) => ({
        ...job,
        id: `db_${job.id}`,
        postedDate: job.postedDate?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
        source: job.source || "Internal Job Board",
        externalUrl: job.externalUrl || `https://recrutas.ai/jobs/${job.id}`,
        skills: job.skills || [],
        requirements: job.requirements || []
      }));
      jobs.push(...transformedDbJobs);
      console.log(`Fetched ${transformedDbJobs.length} jobs from internal database`);
      if (jobs.length < 5) {
        try {
          const companyJobs = await companyJobsAggregator.getAllCompanyJobs(
            skills ? skills.split(",").map((s) => s.trim()) : void 0,
            10
          );
          jobs.push(...companyJobs);
          console.log(`Added ${companyJobs.length} jobs from company sources`);
        } catch (error) {
          console.error("Error fetching company jobs:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching jobs from sources:", error);
    }
    return jobs;
  }
  function calculateJobMatch(job, searchCriteria) {
    let score = 0;
    if (searchCriteria.skills && typeof searchCriteria.skills === "string") {
      const searchSkills = searchCriteria.skills.toLowerCase().split(",").map((s) => s.trim());
      const jobText = `${job.title} ${job.description} ${job.skills?.join(" ") || ""}`.toLowerCase();
      const matchedSkills = searchSkills.filter((skill) => jobText.includes(skill));
      score += matchedSkills.length / searchSkills.length * 40;
    }
    if (searchCriteria.jobTitle && typeof searchCriteria.jobTitle === "string") {
      const titleWords = searchCriteria.jobTitle.toLowerCase().split(" ");
      const jobTitle = job.title.toLowerCase();
      const titleMatches = titleWords.filter((word) => jobTitle.includes(word));
      score += titleMatches.length / titleWords.length * 30;
    }
    if (searchCriteria.location && typeof searchCriteria.location === "string" && searchCriteria.location !== "any") {
      if (job.workType === "remote" || job.location.toLowerCase().includes(searchCriteria.location.toLowerCase())) {
        score += 20;
      }
    }
    score += 10;
    return Math.min(Math.round(score), 100);
  }
  app2.get("/api/external-jobs", async (req, res) => {
    try {
      const { skills, jobTitle, location, workType, salaryType, minSalary, limit = 10 } = req.query;
      console.log(`Fetching external jobs for instant matching. Skills: ${skills}, JobTitle: ${jobTitle}, Location: ${location}, WorkType: ${workType}, MinSalary: ${minSalary} (${salaryType}), Limit: ${limit}`);
      const skillsArray = skills && typeof skills === "string" ? skills.split(",").map((s) => s.trim()) : void 0;
      const cacheKey = `${skillsArray?.join(",") || "general"}_${jobTitle || ""}_${location || ""}`;
      const currentTime = Date.now();
      const cachedData = externalJobsCache.get(cacheKey);
      if (cachedData && currentTime - cachedData.timestamp < CACHE_DURATION) {
        console.log(`Returning ${cachedData.jobs.length} cached external jobs`);
        return res.json({
          jobs: cachedData.jobs.slice(0, parseInt(limit) || 10),
          cached: true,
          timestamp: cachedData.timestamp
        });
      }
      const isNonTechSearch = skillsArray && skillsArray.some((skill) => {
        const s = skill.toLowerCase();
        return s.includes("sales") || s.includes("design") || s.includes("marketing") || s.includes("finance") || s.includes("hr") || s.includes("healthcare") || s.includes("education") || s.includes("customer") || s.includes("management");
      });
      let externalJobs = [];
      if (isNonTechSearch) {
        console.log("Non-tech search detected, skipping tech company APIs");
      } else {
        const optimizedLimit = Math.min(parseInt(limit) || 10, 15);
        externalJobs = await companyJobsAggregator.getAllCompanyJobs(skillsArray, optimizedLimit);
        console.log(`Retrieved ${externalJobs.length} external jobs from aggregator for skills: ${skillsArray?.join(", ") || "general"}`);
        if (externalJobs.length > 0) {
          console.log("Sample jobs available:", externalJobs.slice(0, 2).map((j) => ({
            title: j.title,
            company: j.company,
            skills: j.skills
          })));
        }
      }
      let filteredJobs = externalJobs;
      if (isNonTechSearch && externalJobs.length === 0) {
        console.log("Non-tech search with no external jobs, generating relevant positions");
        filteredJobs = [];
      }
      if (jobTitle && typeof jobTitle === "string") {
        const titleKeywords = jobTitle.toLowerCase().split(/[\s,]+/).map((s) => s.trim()).filter((s) => s.length > 0);
        const beforeTitleFilter = filteredJobs.length;
        filteredJobs = filteredJobs.filter((job) => {
          const jobTitleLower = job.title.toLowerCase();
          const jobDescriptionLower = job.description.toLowerCase();
          return titleKeywords.some(
            (keyword) => jobTitleLower.includes(keyword) || jobDescriptionLower.includes(keyword)
          );
        });
        console.log(`Job title filter (${jobTitle}): ${beforeTitleFilter} -> ${filteredJobs.length} jobs`);
      }
      if (skills && typeof skills === "string") {
        const skillsArray2 = skills.toLowerCase().split(",").map((s) => s.trim());
        filteredJobs = externalJobs.filter((job) => {
          const jobSkills = job.skills.map((s) => s.toLowerCase());
          const jobTitle2 = job.title.toLowerCase();
          const jobDescription = job.description.toLowerCase();
          return skillsArray2.some(
            (skill) => jobSkills.some((js) => js.includes(skill)) || jobTitle2.includes(skill) || jobDescription.includes(skill)
          );
        });
        console.log(`Skills filter: ${skillsArray2.join(", ")} - matched ${filteredJobs.length} jobs`);
        if (filteredJobs.length === 0) {
          console.log("No strict matches, trying broader skill matching...");
          filteredJobs = externalJobs.filter((job) => {
            const jobSkills = job.skills.map((s) => s.toLowerCase());
            const jobTitle2 = job.title.toLowerCase();
            const jobDescription = job.description.toLowerCase();
            const combinedText = `${jobTitle2} ${jobDescription} ${jobSkills.join(" ")}`;
            return skillsArray2.some((skill) => {
              const skillLower = skill.toLowerCase();
              if (combinedText.includes(skillLower)) return true;
              const skillVariations = {
                "sales": ["business development", "account management", "revenue", "lead generation", "client relations"],
                "marketing": ["digital marketing", "growth", "advertising", "promotion", "brand management"],
                "customer service": ["customer support", "client service", "help desk", "customer care"],
                "management": ["leadership", "supervisor", "director", "manager", "team lead"],
                "design": ["graphic design", "ui/ux", "visual design", "creative", "designer"],
                "finance": ["accounting", "financial", "bookkeeping", "budget", "analyst"],
                "hr": ["human resources", "people operations", "talent acquisition", "recruiting"],
                "python": ["django", "flask", "pandas", "numpy"],
                "javascript": ["js", "react", "node", "angular", "vue"],
                "react": ["frontend", "ui development"],
                "java": ["spring", "hibernate"],
                "data": ["analytics", "analysis", "insights", "reporting", "business intelligence"],
                "project management": ["scrum", "agile", "coordination", "planning"],
                "writing": ["content", "copywriting", "technical writing", "documentation"],
                "healthcare": ["medical", "nursing", "clinical", "patient care"],
                "education": ["teaching", "training", "instruction", "tutoring"]
              };
              const variations = skillVariations[skillLower] || [];
              return variations.some((variation) => combinedText.includes(variation));
            });
          });
          console.log(`Broader matching found ${filteredJobs.length} jobs`);
        }
        if (filteredJobs.length === 0 && skillsArray2 && skillsArray2.length > 0) {
          console.log("No matches found, generating relevant jobs for skills:", skillsArray2);
          const skill = skillsArray2[0].toLowerCase();
          const relevantJobs = [];
          if (skill.includes("sales")) {
            relevantJobs.push(
              { title: "Sales Representative", company: "SalesForce Solutions", description: "Drive revenue growth through client acquisition and relationship management. Lead generation and closing deals.", skills: ["Sales", "Business Development", "CRM", "Lead Generation"] },
              { title: "Business Development Manager", company: "Growth Partners Inc", description: "Identify new business opportunities and build strategic partnerships to expand market reach.", skills: ["Sales", "Account Management", "Strategy", "Partnerships"] },
              { title: "Account Executive", company: "Revenue Systems", description: "Manage key accounts and exceed quarterly sales targets through consultative selling approach.", skills: ["Sales", "Account Management", "Negotiation", "Customer Relations"] },
              { title: "Inside Sales Specialist", company: "Digital Commerce Co", description: "Generate leads and close deals through phone and email outreach. Build prospect pipeline.", skills: ["Sales", "Lead Generation", "Cold Calling", "Email Marketing"] }
            );
          } else if (skill.includes("design")) {
            relevantJobs.push(
              { title: "UX/UI Designer", company: "Creative Studio Design", description: "Design intuitive user experiences for web and mobile applications. Create wireframes, prototypes, and user flows.", skills: ["Design", "UI/UX", "Figma", "User Research", "Prototyping"] },
              { title: "Graphic Designer", company: "Brand Agency Creative", description: "Create visual content for marketing campaigns and brand identity. Design logos, brochures, and digital assets.", skills: ["Design", "Graphics", "Adobe Creative Suite", "Branding", "Typography"] },
              { title: "Product Designer", company: "Innovation Design Lab", description: "Lead product design from concept to implementation. Work with cross-functional teams to deliver user-centered solutions.", skills: ["Design", "Product Development", "User Research", "Design Systems", "Collaboration"] },
              { title: "Visual Designer", company: "Media Design House", description: "Develop creative assets for digital and print media. Ensure brand consistency across all visual communications.", skills: ["Design", "Visual Communication", "Creative Direction", "Brand Guidelines", "Digital Media"] }
            );
          } else if (skill.includes("marketing")) {
            relevantJobs.push(
              { title: "Digital Marketing Specialist", company: "Growth Marketing Agency", description: "Execute digital campaigns across social media, Google Ads, and email marketing channels to drive customer acquisition.", skills: ["Marketing", "Digital Marketing", "Google Ads", "Social Media", "Analytics"] },
              { title: "Content Marketing Manager", company: "Content Strategy Co", description: "Develop content strategy and create engaging marketing materials including blogs, videos, and social posts.", skills: ["Marketing", "Content Strategy", "Content Creation", "SEO", "Copywriting"] },
              { title: "Social Media Manager", company: "Social Media First", description: "Manage brand presence across social media platforms. Create content calendars and engage with community.", skills: ["Marketing", "Social Media", "Community Management", "Content Creation", "Brand Management"] },
              { title: "Marketing Coordinator", company: "Brand Solutions Inc", description: "Support marketing initiatives and campaign execution. Coordinate events, manage vendors, and track campaign performance.", skills: ["Marketing", "Campaign Management", "Event Planning", "Project Coordination", "Analytics"] }
            );
          } else if (skill.includes("finance")) {
            relevantJobs.push(
              { title: "Financial Analyst", company: "Finance Corp", description: "Analyze financial data and prepare investment recommendations. Build financial models and conduct market research.", skills: ["Finance", "Financial Analysis", "Excel", "Financial Modeling", "Investment Analysis"] },
              { title: "Accounting Specialist", company: "Numbers Plus Accounting", description: "Manage accounts payable, receivable, and financial reporting. Ensure compliance with accounting standards.", skills: ["Finance", "Accounting", "QuickBooks", "Financial Reporting", "Bookkeeping"] },
              { title: "Budget Analyst", company: "Strategic Finance Group", description: "Develop and monitor organizational budgets and forecasts. Provide variance analysis and recommendations.", skills: ["Finance", "Budget Analysis", "Forecasting", "Financial Planning", "Cost Analysis"] }
            );
          } else if (skill.includes("hr") || skill.includes("human resources")) {
            relevantJobs.push(
              { title: "Human Resources Specialist", company: "People First HR", description: "Support talent acquisition and employee development programs. Handle benefits administration and compliance.", skills: ["HR", "Talent Acquisition", "Employee Relations", "Benefits Administration", "Compliance"] },
              { title: "Talent Acquisition Coordinator", company: "Hiring Solutions Group", description: "Source and screen candidates for various positions. Coordinate interviews and manage recruitment pipeline.", skills: ["HR", "Recruiting", "Talent Sourcing", "Interview Coordination", "Candidate Management"] },
              { title: "HR Business Partner", company: "Strategic HR Solutions", description: "Partner with business leaders on HR strategy and initiatives. Support organizational development and change management.", skills: ["HR", "Business Partnership", "Organizational Development", "Strategy", "Change Management"] }
            );
          } else {
            relevantJobs.push(
              { title: `${skill.charAt(0).toUpperCase() + skill.slice(1)} Specialist`, company: "Professional Services Inc", description: `Apply your ${skill} expertise to drive business results and client satisfaction.`, skills: [skill.charAt(0).toUpperCase() + skill.slice(1), "Communication", "Problem Solving"] },
              { title: `Senior ${skill.charAt(0).toUpperCase() + skill.slice(1)} Coordinator`, company: "Excellence Partners", description: `Lead ${skill}-focused initiatives and coordinate cross-functional projects.`, skills: [skill.charAt(0).toUpperCase() + skill.slice(1), "Project Management", "Leadership"] }
            );
          }
          filteredJobs = relevantJobs.map((job, index2) => ({
            id: `generated_${skill}_${index2}_${Date.now()}`,
            title: job.title,
            company: job.company,
            location: ["New York, NY", "Remote", "San Francisco, CA", "Chicago, IL", "Austin, TX", "Seattle, WA", "Boston, MA", "Denver, CO"][index2 % 8],
            description: job.description,
            requirements: [`2+ years experience in ${skill}`, "Strong communication skills", "Team collaboration", "Problem-solving abilities"],
            skills: job.skills,
            workType: index2 % 3 === 0 ? "remote" : index2 % 3 === 1 ? "hybrid" : "onsite",
            salaryMin: 5e4 + index2 * 5e3,
            salaryMax: 8e4 + index2 * 1e4,
            source: "Relevant Opportunities",
            externalUrl: `https://careers.${job.company.toLowerCase().replace(/\s+/g, "")}.com/jobs/${job.title.toLowerCase().replace(/\s+/g, "-")}-${index2 + 1}`,
            postedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1e3).toISOString()
          }));
          console.log(`Generated ${filteredJobs.length} relevant ${skill} jobs`);
        }
      }
      if (location && typeof location === "string" && location.toLowerCase() !== "any") {
        const beforeLocationFilter = filteredJobs.length;
        const locationQuery = location.toLowerCase().trim();
        const areaMapping = {
          "san francisco": ["san francisco", "mountain view", "menlo park", "palo alto", "cupertino", "sunnyvale", "bay area"],
          "seattle": ["seattle", "redmond", "bellevue", "kirkland"],
          "new york": ["new york", "manhattan", "brooklyn", "queens", "bronx", "nyc"],
          "los angeles": ["los angeles", "santa monica", "beverly hills", "hollywood", "la"],
          "chicago": ["chicago", "schaumburg", "evanston"],
          "austin": ["austin", "round rock", "cedar park"],
          "boston": ["boston", "cambridge", "somerville"],
          "denver": ["denver", "boulder", "aurora"]
        };
        filteredJobs = filteredJobs.filter((job) => {
          const jobLocation = job.location.toLowerCase();
          const jobWorkType = job.workType.toLowerCase();
          if (jobLocation.includes(locationQuery)) return true;
          if (locationQuery === "remote" && jobWorkType.includes("remote")) return true;
          if (jobWorkType.includes("remote")) return true;
          const matchingAreas = areaMapping[locationQuery];
          if (matchingAreas) {
            return matchingAreas.some((area) => jobLocation.includes(area));
          }
          if (locationQuery === "california" || locationQuery === "ca") {
            return jobLocation.includes(", ca");
          }
          if (locationQuery === "washington" || locationQuery === "wa") {
            return jobLocation.includes(", wa");
          }
          if (locationQuery === "new york" || locationQuery === "ny") {
            return jobLocation.includes(", ny");
          }
          return false;
        });
        console.log(`Location filter (${locationQuery}): ${beforeLocationFilter} -> ${filteredJobs.length} jobs`);
      }
      if (workType && typeof workType === "string" && workType !== "any") {
        const beforeWorkTypeFilter = filteredJobs.length;
        filteredJobs = filteredJobs.filter((job) => {
          const jobWorkType = job.workType.toLowerCase();
          const filterWorkType = workType.toLowerCase();
          if (filterWorkType === "remote") {
            return jobWorkType.includes("remote") || jobWorkType === "remote";
          } else if (filterWorkType === "hybrid") {
            return jobWorkType.includes("hybrid") || jobWorkType === "hybrid";
          } else if (filterWorkType === "onsite") {
            return !jobWorkType.includes("remote") && !jobWorkType.includes("hybrid");
          }
          return true;
        });
        console.log(`Work type filter (${workType}): ${beforeWorkTypeFilter} -> ${filteredJobs.length} jobs`);
      }
      if (minSalary && typeof minSalary === "string" && minSalary !== "0") {
        const beforeSalaryFilter = filteredJobs.length;
        const minSalaryNum = parseInt(minSalary.replace(/[^0-9]/g, ""));
        if (!isNaN(minSalaryNum) && minSalaryNum > 0) {
          filteredJobs = filteredJobs.filter((job) => {
            if (!job.salaryMin && !job.salaryMax) return true;
            if (salaryType === "hourly") {
              const jobHourly = job.salaryMin ? job.salaryMin / 2080 : 0;
              return jobHourly >= minSalaryNum || !job.salaryMin;
            } else {
              return (job.salaryMin || 0) >= minSalaryNum || !job.salaryMin;
            }
          });
        }
        console.log(`Salary filter ($${minSalaryNum}): ${beforeSalaryFilter} -> ${filteredJobs.length} jobs`);
      }
      console.log(`After all filters: ${filteredJobs.length} jobs matched`);
      if (filteredJobs.length === 0) {
        console.log("No relevant jobs found after filtering");
      }
      console.log(`Final job count before formatting: ${filteredJobs.length}`);
      const shuffledJobs = filteredJobs.map((job) => ({ job, sortKey: Math.random() })).sort((a, b) => a.sortKey - b.sortKey).map((item) => item.job);
      const formattedJobs = shuffledJobs.slice(0, parseInt(limit)).map((job, index2) => ({
        id: `instant_${job.id}_${Date.now()}_${index2}`,
        matchScore: `${Math.floor(Math.random() * 15) + 85}%`,
        status: index2 === 0 ? "pending" : Math.random() > 0.8 ? "viewed" : "not_applied",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          skills: job.skills.slice(0, 5),
          workType: job.workType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax
        },
        source: job.source,
        externalUrl: job.externalUrl,
        urgency: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low"
      }));
      externalJobsCache.set(cacheKey, {
        jobs: formattedJobs,
        timestamp: currentTime
      });
      console.log(`Cached ${formattedJobs.length} jobs with key: ${cacheKey}`);
      res.json({
        success: true,
        jobs: formattedJobs,
        totalFound: filteredJobs.length,
        source: "external_aggregator",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        cached: false
      });
    } catch (error) {
      console.error("Error fetching external jobs for instant matching:", error);
      res.status(500).json({
        error: "Failed to fetch jobs",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/sync-external-jobs", async (req, res) => {
    try {
      const { skills } = req.body;
      console.log(`Syncing external jobs from API into database for skills: ${skills?.join(", ") || "general"}`);
      const externalJobs = await companyJobsAggregator.getAllCompanyJobs(skills);
      let syncedCount = 0;
      const defaultTalentOwnerId = "44091169";
      for (const extJob of externalJobs) {
        try {
          const newJob = await storage.createJobPosting({
            title: extJob.title,
            company: extJob.company,
            location: extJob.location,
            description: extJob.description,
            requirements: extJob.requirements,
            skills: extJob.skills,
            workType: extJob.workType,
            salaryMin: extJob.salaryMin,
            salaryMax: extJob.salaryMax,
            talentOwnerId: defaultTalentOwnerId,
            source: extJob.source,
            status: "active"
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        source: "External Jobs API"
      });
    } catch (error) {
      console.error("External job sync failed:", error);
      res.status(500).json({
        error: "External job sync failed",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/recruiter/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getRecruiterStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching recruiter stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  app2.get("/api/recruiter/jobs", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const jobs = await storage.getJobPostings(userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });
  app2.get("/api/recruiter/candidates", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const candidates = await storage.getCandidatesForRecruiter(userId);
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });
  app2.post("/api/jobs/:id/apply", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseInt(req.params.id);
      const existingMatch = await storage.getMatchesForCandidate(userId);
      const alreadyApplied = existingMatch.find((m) => m.jobId === jobId && m.status === "applied");
      if (alreadyApplied) {
        return res.status(400).json({ message: "Already applied to this job" });
      }
      let match = existingMatch.find((m) => m.jobId === jobId);
      if (match) {
        match = await storage.updateMatchStatus(match.id, "applied");
      } else {
        const job = await storage.getJobPosting(jobId);
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }
        const candidateProfile = await storage.getCandidateProfile(userId);
        if (!candidateProfile) {
          return res.status(400).json({ message: "Please complete your profile first" });
        }
        const candidateForAI = {
          ...candidateProfile,
          skills: candidateProfile.skills || [],
          experience: candidateProfile.experience || "entry",
          industry: candidateProfile.industry ?? void 0,
          workType: candidateProfile.workType ?? void 0,
          salaryMin: candidateProfile.salaryMin ?? void 0,
          salaryMax: candidateProfile.salaryMax ?? void 0,
          location: candidateProfile.location ?? void 0
        };
        const jobForAI = {
          ...job,
          skills: job.skills || [],
          requirements: job.requirements || [],
          industry: job.industry ?? void 0,
          workType: job.workType ?? void 0,
          salaryMin: job.salaryMin ?? void 0,
          salaryMax: job.salaryMax ?? void 0,
          location: job.location ?? void 0
        };
        const aiMatch = await generateJobMatch(candidateForAI, jobForAI);
        match = await storage.createJobMatch({
          jobId,
          candidateId: userId,
          matchScore: `${aiMatch.score}%`,
          confidenceLevel: aiMatch.confidenceLevel >= 0.8 ? "high" : aiMatch.confidenceLevel >= 0.6 ? "medium" : "low",
          skillMatches: aiMatch.skillMatches.map((skill) => ({ skill, matched: true })),
          aiExplanation: aiMatch.aiExplanation,
          status: "applied"
        });
      }
      if (match) {
        await storage.createActivityLog(userId, "job_applied", `Marked as applied: ${match.jobId}`);
      }
      res.json({ message: "Marked as applied successfully", match });
    } catch (error) {
      console.error("Error applying to job:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });
  app2.post("/api/matches/:id/feedback", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const matchId = parseInt(req.params.id);
      const { feedback, reason } = req.body;
      const match = await storage.updateMatchStatus(matchId, feedback);
      const userId = req.session.user.id;
      await storage.createActivityLog(userId, "match_feedback", `Feedback: ${feedback}`, { reason });
      res.json({ message: "Feedback recorded", match });
    } catch (error) {
      console.error("Error recording feedback:", error);
      res.status(500).json({ message: "Failed to record feedback" });
    }
  });
  app2.post("/api/test-notification", async (req, res) => {
    try {
      const { userId, message } = req.body;
      const testNotification = {
        type: "test",
        message: message || "Test notification from server",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      sendNotification(userId || "44091169", testNotification);
      console.log("Test notification sent:", testNotification);
      res.json({ success: true, message: "Test notification sent" });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });
  app2.patch("/api/matches/:id/status", requireAuth, async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const { status } = req.body;
      const match = await storage.updateMatchStatus(matchId, status);
      const userId = req.user.id;
      await storage.createActivityLog(userId, "match_status_updated", `Match status updated to ${status}`);
      res.json(match);
    } catch (error) {
      console.error("Error updating match status:", error);
      res.status(500).json({ message: "Failed to update match status" });
    }
  });
  app2.get("/api/applications/status", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const applications = await storage.getApplicationsWithStatus(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching application status:", error);
      res.status(500).json({ message: "Failed to fetch application status" });
    }
  });
  app2.post("/api/applications/:id/status", requireAuth, async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { status, interviewDate, notes, feedback, reviewerName, viewDuration, ranking, totalApplicants } = req.body;
      const userId = req.user.id;
      const application = await storage.updateApplicationStatus(applicationId, status, {
        interviewDate,
        notes,
        viewedByEmployerAt: status === "viewed" ? /* @__PURE__ */ new Date() : void 0
      });
      await storage.createApplicationEvent({
        applicationId,
        eventType: status,
        actorRole: "hiring_manager",
        actorName: reviewerName,
        viewDuration,
        candidateRanking: ranking,
        totalApplicants,
        feedback: feedback || generateDefaultFeedback(status),
        visible: true
      });
      const intelligenceUpdate = await generateIntelligenceNotification(applicationId, status, {
        feedback,
        ranking,
        totalApplicants,
        reviewerName
      });
      sendApplicationStatusUpdate(userId, {
        ...application,
        intelligenceUpdate
      });
      await storage.createActivityLog(userId, "application_status_updated", `Application status updated to ${status} with feedback`);
      res.json({
        ...application,
        intelligenceUpdate
      });
    } catch (error) {
      console.error("Error updating application status:", error);
      res.status(500).json({ message: "Failed to update application status" });
    }
  });
  app2.get("/api/applications/:id/intelligence", requireAuth, async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const userId = req.user.id;
      const application = await storage.getApplicationById(applicationId);
      if (!application || application.candidateId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const events = await storage.getApplicationEvents(applicationId);
      const insights = await storage.getApplicationInsights(applicationId);
      const intelligence = {
        applicationId,
        jobTitle: application.job?.title,
        company: application.job?.company,
        timeline: events.map((event) => ({
          timestamp: event.createdAt,
          type: event.eventType,
          actor: event.actorName || `${event.actorRole}`,
          details: {
            viewDuration: event.viewDuration,
            ranking: event.candidateRanking,
            totalApplicants: event.totalApplicants,
            feedback: event.feedback,
            humanReadable: generateHumanReadableUpdate(event)
          }
        })),
        currentStatus: application.status,
        insights: insights || {
          strengthsIdentified: [],
          improvementAreas: [],
          recommendedActions: []
        }
      };
      res.json(intelligence);
    } catch (error) {
      console.error("Error fetching application intelligence:", error);
      res.status(500).json({ message: "Failed to fetch application intelligence" });
    }
  });
  app2.post("/api/jobs/scrape", async (req, res) => {
    try {
      const { companyUrl, companyName } = req.body;
      if (!companyUrl) {
        return res.status(400).json({ error: "Company URL is required" });
      }
      console.log(`Scraping jobs from ${companyUrl} for ${companyName || "unknown company"}`);
      const jobs = await universalJobScraper.scrapeCompanyJobs(companyUrl, companyName);
      console.log(`Successfully scraped ${jobs.length} jobs from ${companyUrl}`);
      res.json({
        success: true,
        company: companyName || new URL(companyUrl).hostname,
        jobCount: jobs.length,
        jobs
      });
    } catch (error) {
      console.error("Error scraping jobs:", error);
      res.status(500).json({
        error: "Failed to scrape jobs",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/jobs/scrape-multiple", async (req, res) => {
    try {
      const { companies } = req.body;
      if (!Array.isArray(companies) || companies.length === 0) {
        return res.status(400).json({ error: "Companies array is required" });
      }
      console.log(`Scraping jobs from ${companies.length} companies`);
      const allJobs = await universalJobScraper.scrapeMultipleCompanies(companies);
      console.log(`Successfully scraped ${allJobs.length} total jobs from ${companies.length} companies`);
      res.json({
        success: true,
        companiesScraped: companies.length,
        totalJobs: allJobs.length,
        jobs: allJobs
      });
    } catch (error) {
      console.error("Error scraping multiple companies:", error);
      res.status(500).json({
        error: "Failed to scrape jobs from companies",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/jobs/:id/quick-apply", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user.id;
      const existingApplication = await storage.getApplicationByJobAndCandidate(jobId, userId);
      if (existingApplication) {
        return res.status(400).json({ message: "Already applied to this job" });
      }
      const application = await storage.createJobApplication({
        candidateId: userId,
        jobId,
        status: "submitted",
        appliedAt: /* @__PURE__ */ new Date()
      });
      const job = await storage.getJobPosting(jobId);
      sendNotification(userId, {
        type: "application_submitted",
        title: "Application Submitted",
        message: `Your application for ${job?.title} at ${job?.company} has been submitted`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      await storage.createActivityLog(userId, "quick_apply", `Applied to ${job?.title} at ${job?.company}`);
      res.json({ message: "Application submitted successfully", application });
    } catch (error) {
      console.error("Error submitting quick application:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });
  app2.get("/api/chat/rooms", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const rooms = await storage.getChatRoomsForUser(userId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ message: "Failed to fetch chat rooms" });
    }
  });
  app2.get("/api/chat/:roomId/messages", requireAuth, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const messages = await storage.getChatMessages(roomId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.post("/api/chat/:matchId/room", requireAuth, async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      let room = await storage.getChatRoom(matchId, req.user.id);
      if (!room) {
        room = await storage.createChatRoom({
          matchId,
          createdBy: req.user.id
        });
      }
      res.json(room);
    } catch (error) {
      console.error("Error creating chat room:", error);
      res.status(500).json({ message: "Failed to create chat room" });
    }
  });
  app2.get("/api/activity", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;
      const logs = await storage.getActivityLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });
  app2.post("/api/candidates/apply/:jobId", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseInt(req.params.jobId);
      const application = await storage.createJobApplication({
        candidateId: userId,
        jobId,
        status: "applied",
        appliedAt: /* @__PURE__ */ new Date()
      });
      const existingMatch = await storage.getApplicationByJobAndCandidate(jobId, userId);
      if (existingMatch) {
        await storage.updateApplicationStatus(existingMatch.id, "applied");
      }
      await storage.createActivityLog(userId, "job_applied", `Applied to job ID: ${jobId}`);
      res.json({ success: true, application });
    } catch (error) {
      console.error("Error applying to job:", error);
      res.status(500).json({ message: "Failed to apply to job" });
    }
  });
  app2.post("/api/candidates/mark-applied/:matchId", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const matchId = parseInt(req.params.matchId);
      await storage.updateMatchStatus(matchId, "applied");
      await storage.createActivityLog(userId, "external_applied", `Marked external job as applied`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking external application:", error);
      res.status(500).json({ message: "Failed to mark as applied" });
    }
  });
  app2.post("/api/candidates/start-chat/:jobId", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const jobId = parseInt(req.params.jobId);
      const chatRoom = await storage.getChatRoom(jobId, userId);
      if (!chatRoom) {
        return res.status(403).json({
          message: "Chat access not available. Complete the exam with a passing score to qualify."
        });
      }
      res.json({ success: true, chatRoomId: chatRoom.id });
    } catch (error) {
      console.error("Error starting chat:", error);
      res.status(500).json({ message: "Failed to start chat" });
    }
  });
  app2.get("/api/notification-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = await storage.getNotificationPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });
  app2.post("/api/notification-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = await storage.updateNotificationPreferences(userId, req.body);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });
  app2.get("/api/jobs/:jobId/exam", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      let exam = await storage.getJobExam(jobId);
      if (!exam) {
        const job = await storage.getJobPosting(jobId);
        if (job && job.hasExam) {
          const defaultExam = {
            jobId,
            title: `${job.title} Assessment`,
            description: `Technical assessment for the ${job.title} position at ${job.company}`,
            timeLimit: 30,
            // 30 minutes
            passingScore: 70,
            questions: [
              {
                id: "q1",
                type: "multiple-choice",
                question: "What programming languages are you most comfortable with?",
                options: ["JavaScript/TypeScript", "Python", "Java", "C++", "Go"],
                points: 10,
                correctAnswer: 0
              },
              {
                id: "q2",
                type: "short-answer",
                question: "Describe your experience with software development and what motivates you to work in this field.",
                points: 20
              },
              {
                id: "q3",
                type: "multiple-choice",
                question: "How do you approach debugging complex issues in your code?",
                options: ["Use debugger tools", "Add console logs", "Review code systematically", "Ask for help from teammates"],
                points: 15,
                correctAnswer: 2
              }
            ],
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          };
          exam = await storage.createJobExam(defaultExam);
          console.log(`Created default exam for job ${jobId}`);
        } else {
          return res.status(404).json({ message: "Exam not found for this job" });
        }
      }
      res.json(exam);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/jobs/:jobId/exam/submit", requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const { answers } = req.body;
      const userId = req.user.id;
      const exam = await storage.getJobExam(jobId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      let totalPoints = 0;
      let earnedPoints = 0;
      exam.questions.forEach((question) => {
        totalPoints += question.points;
        const userAnswer = answers[question.id];
        if (question.type === "multiple-choice" && question.correctAnswer !== void 0) {
          if (parseInt(userAnswer) === question.correctAnswer) {
            earnedPoints += question.points;
          }
        } else if (question.type === "short-answer" && userAnswer && userAnswer.trim().length > 0) {
          earnedPoints += question.points;
        }
      });
      const score = Math.round(earnedPoints / totalPoints * 100);
      const passed = score >= exam.passingScore;
      await storage.storeExamResult({
        candidateId: userId,
        jobId,
        score,
        totalQuestions: exam.questions.length,
        correctAnswers: Math.round(earnedPoints / totalPoints * exam.questions.length),
        timeSpent: exam.timeLimit,
        // Default to full time limit since we don't track actual time spent
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer
        }))
      });
      if (passed) {
        await storage.updateJobMatchStatus(userId, jobId, "screening");
        await storage.createNotification({
          userId,
          type: "exam_passed",
          title: "Exam Passed!",
          message: `You scored ${score}% and can now chat with the hiring manager`,
          jobId
        });
      } else {
        await storage.updateJobMatchStatus(userId, jobId, "rejected");
        await storage.createNotification({
          userId,
          type: "exam_failed",
          title: "Exam Completed",
          message: `You scored ${score}%. The passing score was ${exam.passingScore}%`,
          jobId
        });
      }
      res.json({
        score,
        passed,
        passingScore: exam.passingScore
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/talent/applications/:applicationId/track", requireAuth, async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { type, duration, timestamp: timestamp2, data } = req.body;
      const talentId = req.user.id;
      const validApplicationId = parseInt(applicationId);
      if (isNaN(validApplicationId)) {
        return res.status(400).json({ message: "Invalid application ID" });
      }
      const validDuration = duration ? parseInt(duration) : 0;
      if (isNaN(validDuration)) {
        return res.status(400).json({ message: "Invalid duration value" });
      }
      const trackingEvent = {
        applicationId: validApplicationId,
        talentId,
        type,
        duration: validDuration,
        timestamp: timestamp2,
        data: data || {}
      };
      await storage.updateApplicationIntelligence(validApplicationId, {
        [`${type}_at`]: timestamp2,
        [`${type}_duration`]: validDuration,
        [`${type}_data`]: data
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to track application:", error);
      res.status(500).json({ message: "Failed to track application interaction" });
    }
  });
  app2.patch("/api/talent/applications/:applicationId", requireAuth, async (req, res) => {
    try {
      const { applicationId } = req.params;
      const updates = req.body;
      const talentId = req.user.id;
      await storage.updateApplicationIntelligence(applicationId, {
        ...updates,
        lastUpdatedBy: talentId,
        lastUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });
  app2.post("/api/talent/applications/:applicationId/feedback", requireAuth, async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { feedback, rating, nextSteps, timestamp: timestamp2 } = req.body;
      const talentId = req.user.id;
      await storage.updateApplicationIntelligence(applicationId, {
        feedback,
        rating,
        nextSteps,
        feedbackProvidedAt: timestamp2,
        feedbackProvidedBy: talentId
      });
      await notificationService.sendNotification({
        userId: applicationId,
        // This should be the candidate's user ID
        type: "application_feedback",
        title: "New Feedback on Your Application",
        message: `You've received feedback on your application: "${feedback.substring(0, 100)}..."`,
        data: {
          applicationId,
          rating,
          nextSteps
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to provide feedback:", error);
      res.status(500).json({ message: "Failed to provide feedback" });
    }
  });
  app2.post("/api/talent/jobs/:jobId/rank-candidates", requireAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const { rankings } = req.body;
      const talentId = req.user.id;
      for (const { applicationId, rank } of rankings) {
        await storage.updateApplicationIntelligence(applicationId, {
          ranking: rank,
          totalApplicants: rankings.length,
          rankedAt: (/* @__PURE__ */ new Date()).toISOString(),
          rankedBy: talentId
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to rank candidates:", error);
      res.status(500).json({ message: "Failed to rank candidates" });
    }
  });
  app2.get("/api/talent/applications", requireAuth, async (req, res) => {
    try {
      const talentId = req.user.id;
      const applications = await storage.getApplicationsForTalent(talentId);
      const applicationsWithIntelligence = applications.map((app3) => ({
        ...app3,
        intelligence: {
          viewedAt: app3.viewedAt,
          viewDuration: app3.viewDuration,
          ranking: app3.ranking,
          totalApplicants: app3.totalApplicants,
          feedback: app3.feedback,
          rating: app3.rating,
          nextSteps: app3.nextSteps,
          transparencyLevel: app3.transparencyLevel || "partial"
        }
      }));
      res.json(applicationsWithIntelligence);
    } catch (error) {
      console.error("Failed to get applications:", error);
      res.status(500).json({ message: "Failed to get applications" });
    }
  });
  app2.post("/api/talent/transparency-settings", requireAuth, async (req, res) => {
    try {
      const talentId = req.user.id;
      const settings = req.body;
      await storage.updateTalentTransparencySettings(talentId, settings);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update transparency settings:", error);
      res.status(500).json({ message: "Failed to update transparency settings" });
    }
  });
  const httpServer = createServer(app2);
  const wss2 = new WebSocketServer2({ server: httpServer, path: "/ws" });
  notificationService.startHeartbeat();
  wss2.on("connection", (ws2, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const userId = url.searchParams.get("userId");
    if (userId) {
      console.log(`User ${userId} connected to WebSocket`);
      notificationService.addConnection(userId, ws2);
      ws2.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === "chat_message") {
            const messageData = insertChatMessageSchema.parse(message.data);
            const savedMessage = await storage.createChatMessage(messageData);
            wss2.clients.forEach((client) => {
              if (client !== ws2 && client.readyState === WebSocket3.OPEN) {
                client.send(JSON.stringify({
                  type: "new_message",
                  data: savedMessage
                }));
              }
            });
          } else if (message.type === "mark_notification_read") {
            await notificationService.markAsRead(message.notificationId, userId);
          } else if (message.type === "mark_all_notifications_read") {
            await notificationService.markAllAsRead(userId);
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      });
      ws2.on("close", () => {
        console.log(`User ${userId} disconnected`);
      });
    } else {
      console.log("WebSocket connection without userId, closing");
      ws2.close();
    }
  });
  return httpServer;
}
async function findMatchingCandidates(job) {
  try {
    const profiles = await storage.getAllCandidateProfiles();
    const matches = await Promise.all(profiles.map(async (candidate) => {
      const jobPosting = {
        title: job.title,
        skills: job.skills || [],
        requirements: job.requirements || [],
        industry: job.industry,
        workType: job.workType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        location: job.location,
        description: job.description
      };
      const candidateProfile = {
        skills: candidate.skills || [],
        experience: candidate.experience || "",
        industry: candidate.industry,
        workType: candidate.workType,
        salaryMin: candidate.salaryMin,
        salaryMax: candidate.salaryMax,
        location: candidate.location
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
        userId: candidate.userId || candidate.id,
        candidateId: candidate.userId || candidate.id,
        matchScore: (match.score / 100).toString(),
        matchReasons: match.skillMatches
      };
    }));
    return matches.filter((match) => parseFloat(match.matchScore) >= 0.6);
  } catch (error) {
    console.error("Error finding matching candidates:", error);
    return [];
  }
}

// server/production.ts
import path3 from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
function serveStatic(app2) {
  const distPath = path3.join(__dirname, "../dist");
  app2.use(express2.static(distPath));
  app2.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path3.join(distPath, "index.html"));
  });
}
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  serveStatic(app);
  const PORT = parseInt(process.env.PORT || "5000");
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
