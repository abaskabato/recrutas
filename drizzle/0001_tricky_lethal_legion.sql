CREATE TABLE "candidate_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
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
	"resume_processing_status" varchar DEFAULT 'idle',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "candidate_users_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "discovered_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"normalizedName" varchar(255) NOT NULL,
	"careerPageUrl" varchar(500),
	"discoverySource" varchar(100) NOT NULL,
	"detectedAts" varchar(50),
	"atsId" varchar(255),
	"jobCount" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'pending',
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "discovered_companies_normalizedName_unique" UNIQUE("normalizedName")
);
--> statement-breakpoint
CREATE TABLE "hidden_jobs" (
	"user_id" text NOT NULL,
	"job_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "hidden_jobs_user_id_job_id_pk" PRIMARY KEY("user_id","job_id")
);
--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"user_id" text NOT NULL,
	"job_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "saved_jobs_user_id_job_id_pk" PRIMARY KEY("user_id","job_id")
);
--> statement-breakpoint
CREATE TABLE "screening_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"answer" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "answer_unique" UNIQUE("application_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "screening_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"question" text NOT NULL,
	"question_type" varchar DEFAULT 'text',
	"options" jsonb DEFAULT '[]'::jsonb,
	"is_required" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"type" varchar NOT NULL,
	"price_monthly" integer NOT NULL,
	"price_yearly" integer,
	"features" jsonb DEFAULT '[]'::jsonb,
	"limits" jsonb DEFAULT '{}'::jsonb,
	"stripe_price_id_monthly" varchar,
	"stripe_price_id_yearly" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subscription_tiers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "talent_owner_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"job_title" text,
	"company_name" text,
	"company_website" text,
	"company_size" text,
	"industry" text,
	"company_location" text,
	"company_description" text,
	"hiring_for" jsonb,
	"current_hiring_roles" text,
	"hiring_timeline" text,
	"hiring_budget" text,
	"profile_complete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "usage_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"feature_type" varchar NOT NULL,
	"usage_count" integer DEFAULT 0,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tier_id" integer,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"status" varchar DEFAULT 'free',
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "candidate_profiles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "accounts" CASCADE;--> statement-breakpoint
DROP TABLE "candidate_profiles" CASCADE;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
DROP TABLE "verifications" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "activity_logs" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "application_insights" ALTER COLUMN "candidate_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "application_updates" ALTER COLUMN "updated_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "sender_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chat_rooms" ALTER COLUMN "candidate_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chat_rooms" ALTER COLUMN "hiring_manager_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "connection_status" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "exam_attempts" ALTER COLUMN "candidate_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "candidate_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "interviewer_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "candidate_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "job_matches" ALTER COLUMN "candidate_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "job_matches" ALTER COLUMN "match_score" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "job_postings" ALTER COLUMN "talent_owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "job_postings" ALTER COLUMN "hiring_manager_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "match_feedback" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "notification_preferences" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "application_insights" ADD COLUMN "similar_successful_users" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "last_liveness_check" timestamp;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "liveness_status" varchar DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "trust_score" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "candidate_users" ADD CONSTRAINT "candidate_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_jobs" ADD CONSTRAINT "hidden_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_jobs" ADD CONSTRAINT "hidden_jobs_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_answers" ADD CONSTRAINT "screening_answers_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_answers" ADD CONSTRAINT "screening_answers_question_id_screening_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."screening_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_questions" ADD CONSTRAINT "screening_questions_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_owner_profiles" ADD CONSTRAINT "talent_owner_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_tier_id_subscription_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_discovered_status" ON "discovered_companies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_discovered_ats" ON "discovered_companies" USING btree ("detectedAts");--> statement-breakpoint
ALTER TABLE "application_insights" DROP COLUMN "similar_successful_profiles";--> statement-breakpoint
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_room_unique" UNIQUE("job_id","candidate_id");--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_candidate_unique" UNIQUE("job_id","candidate_id");