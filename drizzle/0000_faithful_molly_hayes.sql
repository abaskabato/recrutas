CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"event_type" varchar NOT NULL,
	"actor_role" varchar NOT NULL,
	"actor_name" varchar,
	"actor_title" varchar,
	"view_duration" integer,
	"candidate_score" integer,
	"candidate_ranking" integer,
	"total_applicants" integer,
	"feedback" text,
	"next_steps" text,
	"competitor_profile" text,
	"visible" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" varchar NOT NULL,
	"application_id" integer NOT NULL,
	"strengths_identified" jsonb DEFAULT '[]'::jsonb,
	"improvement_areas" jsonb DEFAULT '[]'::jsonb,
	"benchmark_view_time" integer,
	"actual_view_time" integer,
	"benchmark_score" integer,
	"actual_score" integer,
	"similar_successful_profiles" jsonb DEFAULT '[]'::jsonb,
	"recommended_actions" jsonb DEFAULT '[]'::jsonb,
	"success_probability" integer,
	"supportive_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"previous_status" varchar,
	"new_status" varchar NOT NULL,
	"message" text,
	"updated_by" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "candidate_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"email" varchar,
	"resume_url" text,
	"linkedin_url" text,
	"github_url" text,
	"portfolio_url" text,
	"personal_website" text,
	"behance_url" text,
	"dribbble_url" text,
	"stack_overflow_url" text,
	"medium_url" text,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"experience" text,
	"location" varchar,
	"salary_min" integer,
	"salary_max" integer,
	"work_type" varchar,
	"industry" varchar,
	"bio" text,
	"summary" text,
	"resume_text" text,
	"profile_strength" integer DEFAULT 0,
	"profile_views" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "candidate_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_room_id" integer NOT NULL,
	"sender_id" varchar NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"candidate_id" varchar NOT NULL,
	"hiring_manager_id" varchar NOT NULL,
	"exam_attempt_id" integer,
	"status" varchar DEFAULT 'active',
	"candidate_ranking" integer,
	"access_granted_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "connection_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"is_online" boolean DEFAULT false,
	"last_seen" timestamp DEFAULT now(),
	"socket_id" varchar,
	"device_info" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "connection_status_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "exam_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"candidate_id" varchar NOT NULL,
	"job_id" integer NOT NULL,
	"score" integer,
	"total_questions" integer,
	"correct_answers" integer,
	"time_spent" integer,
	"answers" jsonb DEFAULT '[]'::jsonb,
	"status" varchar DEFAULT 'in_progress',
	"passed_exam" boolean DEFAULT false,
	"qualified_for_chat" boolean DEFAULT false,
	"ranking" integer,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" varchar NOT NULL,
	"interviewer_id" varchar NOT NULL,
	"job_id" integer NOT NULL,
	"application_id" integer NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"platform" varchar DEFAULT 'zoom' NOT NULL,
	"meeting_url" text,
	"meeting_id" varchar,
	"password" varchar,
	"notes" text,
	"status" varchar DEFAULT 'scheduled' NOT NULL,
	"feedback" text,
	"rating" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" varchar NOT NULL,
	"job_id" integer NOT NULL,
	"match_id" integer,
	"status" varchar DEFAULT 'submitted',
	"applied_at" timestamp DEFAULT now(),
	"viewed_by_employer_at" timestamp,
	"last_status_update" timestamp DEFAULT now(),
	"interview_link" varchar,
	"notes" text,
	"auto_filled" boolean DEFAULT false,
	"resume_url" varchar,
	"cover_letter" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"time_limit" integer DEFAULT 30,
	"passing_score" integer DEFAULT 70,
	"is_active" boolean DEFAULT true,
	"questions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"candidate_id" varchar NOT NULL,
	"match_score" varchar NOT NULL,
	"confidence_level" varchar DEFAULT 'medium',
	"match_reasons" jsonb DEFAULT '[]'::jsonb,
	"skill_matches" jsonb DEFAULT '[]'::jsonb,
	"ai_explanation" text,
	"status" varchar DEFAULT 'pending',
	"user_feedback" integer,
	"feedback_reason" text,
	"viewed_at" timestamp,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_postings" (
	"id" serial PRIMARY KEY NOT NULL,
	"talent_owner_id" varchar NOT NULL,
	"hiring_manager_id" varchar,
	"title" varchar NOT NULL,
	"company" varchar NOT NULL,
	"description" text NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"location" varchar,
	"salary_min" integer,
	"salary_max" integer,
	"work_type" varchar,
	"industry" varchar,
	"status" varchar DEFAULT 'active',
	"source" varchar DEFAULT 'platform',
	"external_id" varchar,
	"external_url" varchar,
	"career_page_url" varchar,
	"company_logo_url" varchar,
	"application_url" varchar,
	"urgency" varchar DEFAULT 'medium',
	"view_count" integer DEFAULT 0,
	"application_count" integer DEFAULT 0,
	"has_exam" boolean DEFAULT true,
	"exam_passing_score" integer DEFAULT 70,
	"auto_rank_candidates" boolean DEFAULT true,
	"max_chat_candidates" integer DEFAULT 5,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "match_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"match_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"feedback_type" varchar,
	"comment" text,
	"improvement_suggestions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"in_app_notifications" boolean DEFAULT true,
	"email_notifications" boolean DEFAULT true,
	"push_notifications" boolean DEFAULT false,
	"application_updates" boolean DEFAULT true,
	"exam_alerts" boolean DEFAULT true,
	"message_notifications" boolean DEFAULT true,
	"high_priority_only" boolean DEFAULT false,
	"quiet_hours" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"read" boolean DEFAULT false,
	"priority" varchar DEFAULT 'medium',
	"related_job_id" integer,
	"related_application_id" integer,
	"related_match_id" integer,
	"created_at" timestamp DEFAULT now(),
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	"ipAddress" text,
	"userAgent" text,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone_number" text,
	"profile_image_url" text,
	"role" text,
	"profile_complete" boolean DEFAULT false,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_insights" ADD CONSTRAINT "application_insights_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_insights" ADD CONSTRAINT "application_insights_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_updates" ADD CONSTRAINT "application_updates_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_users" ADD CONSTRAINT "candidate_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_room_id_chat_rooms_id_fk" FOREIGN KEY ("chat_room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_hiring_manager_id_users_id_fk" FOREIGN KEY ("hiring_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_exam_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("exam_attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_status" ADD CONSTRAINT "connection_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_job_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."job_exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_match_id_job_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."job_matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_exams" ADD CONSTRAINT "job_exams_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_talent_owner_id_users_id_fk" FOREIGN KEY ("talent_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_hiring_manager_id_users_id_fk" FOREIGN KEY ("hiring_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_feedback" ADD CONSTRAINT "match_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_feedback" ADD CONSTRAINT "match_feedback_match_id_job_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."job_matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_job_id_job_postings_id_fk" FOREIGN KEY ("related_job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_application_id_job_applications_id_fk" FOREIGN KEY ("related_application_id") REFERENCES "public"."job_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_match_id_job_matches_id_fk" FOREIGN KEY ("related_match_id") REFERENCES "public"."job_matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;