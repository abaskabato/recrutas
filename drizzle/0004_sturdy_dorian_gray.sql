CREATE TABLE "agent_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"candidate_id" uuid NOT NULL,
	"job_id" integer NOT NULL,
	"external_url" text NOT NULL,
	"status" varchar DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"agent_log" jsonb DEFAULT '[]'::jsonb,
	"candidate_data" jsonb NOT NULL,
	"resume_url" varchar,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_task_status" ON "agent_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_agent_task_candidate" ON "agent_tasks" USING btree ("candidate_id");