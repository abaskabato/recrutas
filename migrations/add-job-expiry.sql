-- Add expires_at column to job_postings table
ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Set default expiry for existing active jobs (30 days from now)
UPDATE job_postings 
SET expires_at = NOW() + INTERVAL '30 days'
WHERE expires_at IS NULL AND status = 'active';

-- Add index for better query performance when filtering by expiry
CREATE INDEX IF NOT EXISTS idx_job_postings_expires_at 
ON job_postings(expires_at)
WHERE expires_at IS NOT NULL;

-- Optionally: Close jobs that have already expired
UPDATE job_postings
SET status = 'closed'
WHERE expires_at < NOW() AND status = 'active';
