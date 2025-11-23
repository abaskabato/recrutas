-- Complete Recrutas Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- =============================================================================
-- AUTHENTICATION & USER MANAGEMENT (Supabase Auth)
-- =============================================================================

-- Users table is managed by Supabase Auth.
-- We will create a profiles table to store user-specific data.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  phone_number text,
  role text,
  profile_complete boolean DEFAULT false,
  profile_image_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================================
-- PLATFORM CORE TABLES
-- =============================================================================

-- Extended user profiles for candidates
CREATE TABLE IF NOT EXISTS public.candidate_users (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  email text,
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
CREATE TABLE IF NOT EXISTS public.talent_owners (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.jobs (
  id serial PRIMARY KEY,
  talent_owner_id integer NOT NULL REFERENCES public.talent_owners(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.applications (
  id serial PRIMARY KEY,
  candidate_id integer NOT NULL REFERENCES public.candidate_users(id) ON DELETE CASCADE,
  job_id integer NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.exams (
  id serial PRIMARY KEY,
  job_id integer NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  questions jsonb NOT NULL,
  passing_score integer DEFAULT 70,
  time_limit_minutes integer DEFAULT 60,
  is_active boolean DEFAULT true,
  created_by integer NOT NULL REFERENCES public.talent_owners(id),
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- Exam submissions
CREATE TABLE IF NOT EXISTS public.exam_submissions (
  id serial PRIMARY KEY,
  exam_id integer NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  candidate_id integer NOT NULL REFERENCES public.candidate_users(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS public.conversations (
  id serial PRIMARY KEY,
  application_id integer NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  participant_ids uuid[] NOT NULL,
  last_message_at timestamp DEFAULT NOW(),
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.messages (
  id serial PRIMARY KEY,
  conversation_id integer NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type varchar(20) DEFAULT 'text',
  attachments jsonb,
  read_by uuid[] DEFAULT '{}',
  sent_at timestamp DEFAULT NOW(),
  edited_at timestamp,
  deleted_at timestamp
);

-- =============================================================================
-- PLATFORM FEATURES
-- =============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type varchar(50) NOT NULL,
  title varchar(255) NOT NULL,
  content text NOT NULL,
  data jsonb,
  read boolean DEFAULT false,
  action_url text,
  created_at timestamp DEFAULT NOW()
);

-- Saved jobs
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id serial PRIMARY KEY,
  candidate_id integer NOT NULL REFERENCES public.candidate_users(id) ON DELETE CASCADE,
  job_id integer NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  saved_at timestamp DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

-- Platform analytics
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
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
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);

-- Job matching optimization
CREATE INDEX IF NOT EXISTS idx_jobs_active ON public.jobs(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON public.jobs USING GIN(skills_required);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_salary ON public.jobs(salary_min, salary_max);

-- Application tracking
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON public.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

-- Communication
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events(created_at);

-- =============================================================================
-- COMPLETE!
-- =============================================================================

-- Your Recrutas database is now ready with:
-- ✅ Supabase Auth authentication system
-- ✅ Job posting and matching infrastructure
-- ✅ Application tracking with transparency
-- ✅ Real-time communication system
-- ✅ Exam/assessment functionality
-- ✅ Analytics and notifications
-- ✅ Optimized indexes for performance

SELECT 'Database schema created successfully! Your Recrutas platform is ready.' as status;
