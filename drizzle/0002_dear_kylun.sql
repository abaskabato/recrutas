ALTER TABLE "activity_logs" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "application_insights" ALTER COLUMN "candidate_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "candidate_users" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "sender_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "chat_rooms" ALTER COLUMN "candidate_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "chat_rooms" ALTER COLUMN "hiring_manager_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "connection_status" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "exam_attempts" ALTER COLUMN "candidate_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "hidden_jobs" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "candidate_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "interviewer_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "candidate_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "job_matches" ALTER COLUMN "candidate_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "job_postings" ALTER COLUMN "talent_owner_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "job_postings" ALTER COLUMN "hiring_manager_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "match_feedback" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "notification_preferences" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "saved_jobs" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "talent_owner_profiles" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "usage_tracking" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "candidate_users" ADD COLUMN "resume_parsing_data" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "candidate_users" ADD COLUMN "experience_level" varchar;--> statement-breakpoint
ALTER TABLE "candidate_users" ADD COLUMN "parsed_at" timestamp;--> statement-breakpoint
ALTER TABLE "candidate_users" ADD COLUMN "job_preferences" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
CREATE INDEX "idx_job_liveness" ON "job_postings" USING btree ("liveness_status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_job_trust_score" ON "job_postings" USING btree ("trust_score");--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_external_unique" UNIQUE("external_id","source");