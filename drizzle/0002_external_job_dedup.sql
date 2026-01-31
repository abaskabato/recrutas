-- Add unique constraint on external jobs for deduplication
ALTER TABLE job_postings
  ADD CONSTRAINT job_external_unique
  UNIQUE (external_id, source);

-- Create index for faster liveness filtering
CREATE INDEX IF NOT EXISTS idx_job_liveness
  ON job_postings(liveness_status, expires_at);

-- Create index for trust score sorting
CREATE INDEX IF NOT EXISTS idx_job_trust_score
  ON job_postings(trust_score DESC);