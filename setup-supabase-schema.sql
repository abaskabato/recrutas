-- Complete Recrutas Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- =============================================================================
-- AUTHENTICATION & USER MANAGEMENT (Better Auth Required)
-- =============================================================================

-- Users table (Better Auth compatible)
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image text,
  "createdAt" timestamp NOT NULL DEFAULT NOW(),
  "updatedAt" timestamp NOT NULL DEFAULT NOW(),
  -- Custom fields for our platform
  first_name varchar,
  last_name varchar,
  phone_number varchar,
  role varchar,
  profile_complete boolean DEFAULT false,
  profile_image_url varchar
);

-- Sessions table (Better Auth required)
CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  "expiresAt" timestamp NOT NULL,
  token text NOT NULL UNIQUE,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Accounts table (Better Auth required for OAuth)
CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  scope text,
  password text,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Verifications table (Better Auth required)
CREATE TABLE IF NOT EXISTS verifications (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- =============================================================================
-- PLATFORM CORE TABLES
-- =============================================================================

-- Extended user profiles for candidates
CREATE TABLE IF NOT EXISTS candidates (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skills text[] DEFAULT '{}',
  experience_level varchar(20),
  location varchar(255),
  resume_url text,
  resume_text text,
  ai_summary text,
  salary_expectation_min integer,
  salary_expectation_max integer,
  work_type varchar(20) DEFAULT 'remote',
  industry varchar(100),
  available_start_date timestamp,
  profile_completed boolean DEFAULT false,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- Talent owners (hiring managers/companies)
CREATE TABLE IF NOT EXISTS talent_owners (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name varchar(255) NOT NULL,
  company_size varchar(50),
  industry varchar(100),
  company_website text,
  company_description text,
  logo_url text,
  verified boolean DEFAULT false,
  subscription_tier varchar(20) DEFAULT 'free',
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- Job postings
CREATE TABLE IF NOT EXISTS jobs (
  id serial PRIMARY KEY,
  talent_owner_id integer NOT NULL REFERENCES talent_owners(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text NOT NULL,
  requirements text[] DEFAULT '{}',
  skills_required text[] DEFAULT '{}',
  experience_level varchar(20),
  salary_min integer,
  salary_max integer,
  location varchar(255),
  work_type varchar(20) DEFAULT 'remote',
  industry varchar(100),
  employment_type varchar(20) DEFAULT 'full_time',
  is_active boolean DEFAULT true,
  external_url text,
  company_name varchar(255),
  posted_date timestamp DEFAULT NOW(),
  expires_at timestamp,
  views_count integer DEFAULT 0,
  applications_count integer DEFAULT 0,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- Job applications
CREATE TABLE IF NOT EXISTS applications (
  id serial PRIMARY KEY,
  candidate_id integer NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id integer NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status varchar(50) DEFAULT 'submitted',
  cover_letter text,
  exam_score numeric(5,2),
  exam_passed boolean DEFAULT false,
  match_score numeric(5,2),
  ai_analysis jsonb,
  submitted_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

-- Exams/assessments
CREATE TABLE IF NOT EXISTS exams (
  id serial PRIMARY KEY,
  job_id integer NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  questions jsonb NOT NULL,
  passing_score integer DEFAULT 70,
  time_limit_minutes integer DEFAULT 60,
  is_active boolean DEFAULT true,
  created_by integer NOT NULL REFERENCES talent_owners(id),
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- Exam submissions
CREATE TABLE IF NOT EXISTS exam_submissions (
  id serial PRIMARY KEY,
  exam_id integer NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  candidate_id integer NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  score numeric(5,2),
  passed boolean DEFAULT false,
  time_taken_minutes integer,
  submitted_at timestamp DEFAULT NOW(),
  graded_at timestamp,
  feedback text,
  UNIQUE(exam_id, candidate_id)
);

-- =============================================================================
-- COMMUNICATION SYSTEM
-- =============================================================================

-- Chat conversations
CREATE TABLE IF NOT EXISTS conversations (
  id serial PRIMARY KEY,
  application_id integer NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  participant_ids integer[] NOT NULL,
  last_message_at timestamp DEFAULT NOW(),
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  conversation_id integer NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type varchar(20) DEFAULT 'text',
  attachments jsonb,
  read_by integer[] DEFAULT '{}',
  sent_at timestamp DEFAULT NOW(),
  edited_at timestamp,
  deleted_at timestamp
);

-- =============================================================================
-- PLATFORM FEATURES
-- =============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type varchar(50) NOT NULL,
  title varchar(255) NOT NULL,
  content text NOT NULL,
  data jsonb,
  read boolean DEFAULT false,
  action_url text,
  created_at timestamp DEFAULT NOW()
);

-- Saved jobs
CREATE TABLE IF NOT EXISTS saved_jobs (
  id serial PRIMARY KEY,
  candidate_id integer NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id integer NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at timestamp DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

-- Platform analytics
CREATE TABLE IF NOT EXISTS analytics_events (
  id serial PRIMARY KEY,
  user_id text REFERENCES users(id),
  event_type varchar(100) NOT NULL,
  event_data jsonb,
  session_id text,
  ip_address inet,
  user_agent text,
  created_at timestamp DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- User lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId");
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts("userId");

-- Job matching optimization
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs USING GIN(skills_required);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_salary ON jobs(salary_min, salary_max);

-- Application tracking
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Communication
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);

-- =============================================================================
-- COMPLETE!
-- =============================================================================

-- Your Recrutas database is now ready with:
-- ✅ Complete Better Auth authentication system
-- ✅ Job posting and matching infrastructure
-- ✅ Application tracking with transparency
-- ✅ Real-time communication system
-- ✅ Exam/assessment functionality
-- ✅ Analytics and notifications
-- ✅ Optimized indexes for performance

SELECT 'Database schema created successfully! Your Recrutas platform is ready.' as status;