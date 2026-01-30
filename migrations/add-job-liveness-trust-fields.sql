-- Migration: Add job liveness and trust scoring fields
-- PRD: Job Feed ranking system requires tracking liveness and trust scores

ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS last_liveness_check TIMESTAMP,
ADD COLUMN IF NOT EXISTS liveness_status VARCHAR(20) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50;

-- Add constraint for liveness_status enum values
ALTER TABLE job_postings
DROP CONSTRAINT IF EXISTS job_postings_liveness_status_check;

ALTER TABLE job_postings
ADD CONSTRAINT job_postings_liveness_status_check
CHECK (liveness_status IN ('active', 'stale', 'unknown'));

-- Add constraint for trust_score range (0-100)
ALTER TABLE job_postings
DROP CONSTRAINT IF EXISTS job_postings_trust_score_check;

ALTER TABLE job_postings
ADD CONSTRAINT job_postings_trust_score_check
CHECK (trust_score >= 0 AND trust_score <= 100);

-- Set internal/platform jobs to highest trust score
UPDATE job_postings
SET trust_score = 100, liveness_status = 'active', last_liveness_check = NOW()
WHERE source = 'platform' OR source IS NULL;

-- Create index for efficient querying by trust score and liveness
CREATE INDEX IF NOT EXISTS idx_job_postings_trust_score ON job_postings(trust_score);
CREATE INDEX IF NOT EXISTS idx_job_postings_liveness_status ON job_postings(liveness_status);
CREATE INDEX IF NOT EXISTS idx_job_postings_last_liveness_check ON job_postings(last_liveness_check);
