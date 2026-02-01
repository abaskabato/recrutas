-- Add GIN index on job_postings.skills for fast skill matching
CREATE INDEX IF NOT EXISTS idx_job_postings_skills_gin
ON job_postings USING gin(skills);

-- Add GIN index on candidate_users.skills
CREATE INDEX IF NOT EXISTS idx_candidate_users_skills_gin
ON candidate_users USING gin(skills);

-- Composite index for common query pattern (filtering active jobs by status and liveness)
CREATE INDEX IF NOT EXISTS idx_job_postings_active_jobs
ON job_postings(status, liveness_status, trust_score DESC)
WHERE status = 'active'
  AND liveness_status IN ('active', 'unknown');

-- Partial index for non-expired jobs (faster filtering on expiry)
CREATE INDEX IF NOT EXISTS idx_job_postings_active_non_expired
ON job_postings(expires_at)
WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW());
