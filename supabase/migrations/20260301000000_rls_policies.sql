-- =============================================================
-- Row Level Security Policies — Recrutas
-- Applied: 2026-03-01
--
-- Architecture note:
--   The Express server uses service_role key → bypasses ALL RLS.
--   These policies protect against direct anon/authenticated
--   client access (e.g. someone querying Supabase directly
--   with the public anon key).
--
-- Convention:
--   DROP POLICY IF EXISTS before CREATE — idempotent, safe to re-run.
-- =============================================================

-- ── Enable RLS on every table ──────────────────────────────

ALTER TABLE public.users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_owner_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_exams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_matches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_updates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_insights     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_feedback           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_status        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovered_companies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_answers        ENABLE ROW LEVEL SECURITY;


-- ── users ──────────────────────────────────────────────────
-- Users can only read and update their own record.

DROP POLICY IF EXISTS "users: own read"   ON public.users;
DROP POLICY IF EXISTS "users: own update" ON public.users;

CREATE POLICY "users: own read"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: own update"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);


-- ── talent_owner_profiles ───────────────────────────────────

DROP POLICY IF EXISTS "talent_profiles: own" ON public.talent_owner_profiles;

CREATE POLICY "talent_profiles: own"
  ON public.talent_owner_profiles FOR ALL
  USING (auth.uid() = user_id);


-- ── candidate_users ─────────────────────────────────────────

DROP POLICY IF EXISTS "candidate_profiles: own" ON public.candidate_users;

CREATE POLICY "candidate_profiles: own"
  ON public.candidate_users FOR ALL
  USING (auth.uid() = user_id);


-- ── job_postings ────────────────────────────────────────────
-- Active jobs are readable by everyone (public job board).
-- Talent owners can manage their own postings.

DROP POLICY IF EXISTS "job_postings: public read"  ON public.job_postings;
DROP POLICY IF EXISTS "job_postings: owner manage" ON public.job_postings;

CREATE POLICY "job_postings: public read"
  ON public.job_postings FOR SELECT
  USING (status = 'active');

CREATE POLICY "job_postings: owner manage"
  ON public.job_postings FOR ALL
  USING (auth.uid() = talent_owner_id);


-- ── job_exams ───────────────────────────────────────────────
-- Authenticated users can read exams (to take them).
-- Talent owners can manage exams for their own jobs.

DROP POLICY IF EXISTS "job_exams: auth read"    ON public.job_exams;
DROP POLICY IF EXISTS "job_exams: owner manage" ON public.job_exams;

CREATE POLICY "job_exams: auth read"
  ON public.job_exams FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "job_exams: owner manage"
  ON public.job_exams FOR ALL
  USING (
    auth.uid() IN (
      SELECT talent_owner_id FROM public.job_postings WHERE id = job_id
    )
  );


-- ── exam_attempts ────────────────────────────────────────────
-- Candidates own their attempts.

DROP POLICY IF EXISTS "exam_attempts: own" ON public.exam_attempts;

CREATE POLICY "exam_attempts: own"
  ON public.exam_attempts FOR ALL
  USING (auth.uid() = candidate_id);


-- ── job_matches ──────────────────────────────────────────────
-- Candidates see their own matches and can update feedback.

DROP POLICY IF EXISTS "job_matches: own" ON public.job_matches;

CREATE POLICY "job_matches: own"
  ON public.job_matches FOR ALL
  USING (auth.uid() = candidate_id);


-- ── chat_rooms ───────────────────────────────────────────────
-- Both the candidate and hiring manager in the room can access it.

DROP POLICY IF EXISTS "chat_rooms: participant" ON public.chat_rooms;

CREATE POLICY "chat_rooms: participant"
  ON public.chat_rooms FOR SELECT
  USING (auth.uid() = candidate_id OR auth.uid() = hiring_manager_id);


-- ── chat_messages ────────────────────────────────────────────
-- Only users in the associated chat room can read or send messages.

DROP POLICY IF EXISTS "chat_messages: participant read"  ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages: participant insert" ON public.chat_messages;

CREATE POLICY "chat_messages: participant read"
  ON public.chat_messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT candidate_id     FROM public.chat_rooms WHERE id = chat_room_id
      UNION
      SELECT hiring_manager_id FROM public.chat_rooms WHERE id = chat_room_id
    )
  );

CREATE POLICY "chat_messages: participant insert"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() IN (
      SELECT candidate_id     FROM public.chat_rooms WHERE id = chat_room_id
      UNION
      SELECT hiring_manager_id FROM public.chat_rooms WHERE id = chat_room_id
    )
  );


-- ── job_applications ─────────────────────────────────────────

DROP POLICY IF EXISTS "applications: own" ON public.job_applications;

CREATE POLICY "applications: own"
  ON public.job_applications FOR ALL
  USING (auth.uid() = candidate_id);


-- ── application_updates ──────────────────────────────────────

DROP POLICY IF EXISTS "app_updates: own read" ON public.application_updates;

CREATE POLICY "app_updates: own read"
  ON public.application_updates FOR SELECT
  USING (
    application_id IN (
      SELECT id FROM public.job_applications WHERE candidate_id = auth.uid()
    )
  );


-- ── application_events ───────────────────────────────────────

DROP POLICY IF EXISTS "app_events: own read" ON public.application_events;

CREATE POLICY "app_events: own read"
  ON public.application_events FOR SELECT
  USING (
    application_id IN (
      SELECT id FROM public.job_applications WHERE candidate_id = auth.uid()
    )
  );


-- ── application_insights ─────────────────────────────────────

DROP POLICY IF EXISTS "insights: own" ON public.application_insights;

CREATE POLICY "insights: own"
  ON public.application_insights FOR SELECT
  USING (auth.uid() = candidate_id);


-- ── match_feedback ───────────────────────────────────────────

DROP POLICY IF EXISTS "match_feedback: own" ON public.match_feedback;

CREATE POLICY "match_feedback: own"
  ON public.match_feedback FOR ALL
  USING (auth.uid() = user_id);


-- ── activity_logs ────────────────────────────────────────────

DROP POLICY IF EXISTS "activity_logs: own read" ON public.activity_logs;

CREATE POLICY "activity_logs: own read"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);


-- ── notifications ────────────────────────────────────────────

DROP POLICY IF EXISTS "notifications: own" ON public.notifications;

CREATE POLICY "notifications: own"
  ON public.notifications FOR ALL
  USING (auth.uid() = user_id);


-- ── notification_preferences ─────────────────────────────────

DROP POLICY IF EXISTS "notif_prefs: own" ON public.notification_preferences;

CREATE POLICY "notif_prefs: own"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id);


-- ── connection_status ────────────────────────────────────────
-- All authenticated users can read (presence indicators in UI).
-- Users can only modify their own record.

DROP POLICY IF EXISTS "connection_status: auth read"  ON public.connection_status;
DROP POLICY IF EXISTS "connection_status: own write"  ON public.connection_status;

CREATE POLICY "connection_status: auth read"
  ON public.connection_status FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "connection_status: own write"
  ON public.connection_status FOR ALL
  USING (auth.uid() = user_id);


-- ── interviews ───────────────────────────────────────────────

DROP POLICY IF EXISTS "interviews: participant" ON public.interviews;

CREATE POLICY "interviews: participant"
  ON public.interviews FOR SELECT
  USING (auth.uid() = candidate_id OR auth.uid() = interviewer_id);


-- ── saved_jobs ───────────────────────────────────────────────

DROP POLICY IF EXISTS "saved_jobs: own" ON public.saved_jobs;

CREATE POLICY "saved_jobs: own"
  ON public.saved_jobs FOR ALL
  USING (auth.uid() = user_id);


-- ── hidden_jobs ──────────────────────────────────────────────

DROP POLICY IF EXISTS "hidden_jobs: own" ON public.hidden_jobs;

CREATE POLICY "hidden_jobs: own"
  ON public.hidden_jobs FOR ALL
  USING (auth.uid() = user_id);


-- ── subscription_tiers ───────────────────────────────────────
-- Public catalog — anyone can read pricing tiers.

DROP POLICY IF EXISTS "subscription_tiers: public read" ON public.subscription_tiers;

CREATE POLICY "subscription_tiers: public read"
  ON public.subscription_tiers FOR SELECT
  USING (is_active = true);


-- ── user_subscriptions ───────────────────────────────────────

DROP POLICY IF EXISTS "user_subscriptions: own" ON public.user_subscriptions;

CREATE POLICY "user_subscriptions: own"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);


-- ── usage_tracking ───────────────────────────────────────────

DROP POLICY IF EXISTS "usage_tracking: own" ON public.usage_tracking;

CREATE POLICY "usage_tracking: own"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);


-- ── agent_tasks ──────────────────────────────────────────────

DROP POLICY IF EXISTS "agent_tasks: own" ON public.agent_tasks;

CREATE POLICY "agent_tasks: own"
  ON public.agent_tasks FOR SELECT
  USING (auth.uid() = candidate_id);


-- ── discovered_companies ─────────────────────────────────────
-- Public catalog used for company discovery display.

DROP POLICY IF EXISTS "discovered_companies: public read" ON public.discovered_companies;

CREATE POLICY "discovered_companies: public read"
  ON public.discovered_companies FOR SELECT
  USING (true);


-- ── screening_questions ──────────────────────────────────────
-- Authenticated users can read (required when taking screening).

DROP POLICY IF EXISTS "screening_questions: auth read" ON public.screening_questions;

CREATE POLICY "screening_questions: auth read"
  ON public.screening_questions FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- ── screening_answers ────────────────────────────────────────

DROP POLICY IF EXISTS "screening_answers: own read"   ON public.screening_answers;
DROP POLICY IF EXISTS "screening_answers: own insert"  ON public.screening_answers;

CREATE POLICY "screening_answers: own read"
  ON public.screening_answers FOR SELECT
  USING (
    application_id IN (
      SELECT id FROM public.job_applications WHERE candidate_id = auth.uid()
    )
  );

CREATE POLICY "screening_answers: own insert"
  ON public.screening_answers FOR INSERT
  WITH CHECK (
    application_id IN (
      SELECT id FROM public.job_applications WHERE candidate_id = auth.uid()
    )
  );
