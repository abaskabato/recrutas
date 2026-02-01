-- Add job_preferences column to candidate_users table
ALTER TABLE candidate_users
ADD COLUMN IF NOT EXISTS job_preferences JSONB DEFAULT '{}'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_candidate_users_job_preferences
ON candidate_users USING gin(job_preferences);
