-- Better Auth Schema Update for Supabase
-- This script updates the existing tables to match Better Auth's exact requirements

-- Update users table (already mostly correct)
-- No changes needed for users table

-- Drop and recreate sessions table with correct schema
DROP TABLE IF EXISTS sessions CASCADE;
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT
);

-- Drop and recreate accounts table with correct schema
DROP TABLE IF EXISTS accounts CASCADE;
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT
);

-- Drop and recreate verifications table with correct schema
DROP TABLE IF EXISTS verifications CASCADE;
CREATE TABLE verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_sessions_user_id ON sessions("userId");
CREATE INDEX idx_sessions_expires_at ON sessions("expiresAt");
CREATE INDEX idx_accounts_user_id ON accounts("userId");
CREATE INDEX idx_accounts_provider ON accounts(provider, "providerAccountId");
CREATE INDEX idx_verifications_identifier ON verifications(identifier);
CREATE INDEX idx_verifications_expires_at ON verifications("expiresAt");

-- Grant permissions (if needed)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;