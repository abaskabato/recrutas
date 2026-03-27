-- pgvector Migration: Enable semantic retrieval for job matching
-- Run via Supabase SQL Editor or psql using DIRECT_URL (port 5432, not pooler)
--
-- This migration:
-- 1. Enables the pgvector extension
-- 2. Adds native vector(384) columns alongside existing TEXT embedding columns
-- 3. Backfills vector columns from existing JSON text embeddings
-- 4. Creates HNSW indexes for fast cosine similarity search

-- Step 1: Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add native vector columns
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE candidate_users ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Step 3: Backfill from existing TEXT columns
-- The TEXT column stores JSON arrays like '[0.123, 0.456, ...]'
-- pgvector accepts this format when cast to ::vector
UPDATE job_postings
SET embedding = vector_embedding::vector
WHERE vector_embedding IS NOT NULL
  AND vector_embedding != ''
  AND vector_embedding != '[]'
  AND embedding IS NULL;

UPDATE candidate_users
SET embedding = vector_embedding::vector
WHERE vector_embedding IS NOT NULL
  AND vector_embedding != ''
  AND vector_embedding != '[]'
  AND embedding IS NULL;

-- Step 4: Create HNSW indexes for cosine similarity
-- HNSW: better recall than IVFFlat, no periodic rebuilds needed
-- m=16, ef_construction=64 are good defaults for <100K rows
CREATE INDEX IF NOT EXISTS idx_job_embedding_hnsw
ON job_postings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_candidate_embedding_hnsw
ON candidate_users
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Verify
SELECT 'job_postings' AS table_name, COUNT(*) AS total, COUNT(embedding) AS with_embedding FROM job_postings
UNION ALL
SELECT 'candidate_users', COUNT(*), COUNT(embedding) FROM candidate_users;
