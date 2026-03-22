-- Add vector_embedding column for semantic search embeddings
ALTER TABLE candidate_users 
ADD COLUMN IF NOT EXISTS vector_embedding TEXT;

-- Add embedding timestamp
ALTER TABLE candidate_users 
ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMP WITH TIME ZONE;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_candidate_vector_embedding 
ON candidate_users (user_id) 
WHERE vector_embedding IS NOT NULL;
