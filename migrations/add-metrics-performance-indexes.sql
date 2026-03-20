-- Migration: Add performance indexes for metrics dashboard
-- Fixes slow /api/admin/metrics/pitch endpoint

-- Index on users.createdAt for growth queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users("createdAt");

-- Index on users.role for filtering candidates/employers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);

-- Index on job_matches.created_at for match quality queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_matches_created_at ON job_matches(created_at);

-- Index on job_matches.match_score for percentile calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_matches_match_score ON job_matches(match_score);

-- Index on exam_attempts for SLA queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_completed_at ON exam_attempts(completed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_passed ON exam_attempts(passed_exam) WHERE passed_exam = true;

-- Index on job_applications.applied_at for growth queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_applied_at ON job_applications(applied_at);

-- Index on job_postings for source/status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_source_status ON job_postings(source, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_created_at ON job_postings(created_at);

-- Index on chat_rooms for candidate/job lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_rooms_candidate_id ON chat_rooms(candidate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_rooms_job_id ON chat_rooms(job_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_rooms_access_granted ON chat_rooms(access_granted_at);

-- Composite index for SLA JOIN optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_attempts_sla 
ON exam_attempts(candidate_id, job_id, completed_at, passed_exam, response_deadline_at) 
WHERE passed_exam = true;
