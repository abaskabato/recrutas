-- Ghost job detection and company verification columns
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "ghost_job_score" integer DEFAULT 0;
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "ghost_job_status" varchar DEFAULT 'clean';
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "ghost_job_reasons" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "last_ghost_check" timestamp;
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "company_verified" boolean DEFAULT false;
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "recruiter_email_domain" varchar;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_ghost_score" ON "job_postings" USING btree ("ghost_job_score");
