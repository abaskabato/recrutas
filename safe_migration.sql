CREATE TABLE IF NOT EXISTS "discovered_companies" (
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

ALTER TABLE "candidate_users" ADD COLUMN IF NOT EXISTS "resume_processing_status" varchar DEFAULT 'idle';
