-- Trigram GIN index on job_postings.title for fast case-insensitive regex
-- matching (title ~* '\yword\y'). Without it, the keyword-retrieval title
-- clauses force a sequential scan over all active rows (~1.1s); with it the
-- full keyword query drops from ~7.7s to ~0.5s.
--
-- Requires the pg_trgm extension. Built CONCURRENTLY in prod to avoid locking
-- writes; the IF NOT EXISTS form is safe to re-run.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_job_postings_title_trgm
ON job_postings USING gin (title gin_trgm_ops);
