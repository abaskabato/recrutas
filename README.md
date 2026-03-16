<p align="center">
  <img src="public/favicon.svg" alt="Recrutas Logo" width="80" height="80" />
</p>

<h1 align="center">Recrutas</h1>

<p align="center">
  <strong>AI-powered hiring platform where every candidate gets a same-day response.</strong>
</p>

<p align="center">
  <a href="https://recrutas.ai">recrutas.ai</a> ·
  Built with React + Express + Supabase + Groq
</p>

---

## What This Is

Recrutas is a candidate-first hiring platform built around one hard promise: **if you apply, you know where you stand today.**

**Internal jobs** (posted by companies on Recrutas):
1. Company posts a job with an auto-generated skills exam
2. Candidates apply and take the exam
3. Top scorers are surfaced to the hiring manager automatically
4. Every candidate sees their status the same day — pass, waitlist, or not a fit

**External jobs** (aggregated from 94+ companies via Greenhouse, Lever, Workday, Ashby, and custom scrapers):
- Scraped 2× daily via GitHub Actions
- Ghost jobs and dead links filtered out automatically every 6 hours
- Quality-scored and matched to candidate profiles using ML embeddings

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Server Architecture](#server-architecture)
- [Client Architecture](#client-architecture)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Matching Engine](#matching-engine)
- [Job Pipeline](#job-pipeline)
- [Exam System](#exam-system)
- [Chat System](#chat-system)
- [Agent Apply](#agent-apply)
- [Background Jobs (GitHub Actions)](#background-jobs-github-actions)
- [Admin Panel](#admin-panel)
- [Middleware](#middleware)
- [Rate Limiting](#rate-limiting)
- [Payments (Stripe)](#payments-stripe)
- [Real-Time (WebSocket)](#real-time-websocket)
- [Environment Variables](#environment-variables)
- [npm Scripts](#npm-scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Key Gotchas & Lessons Learned](#key-gotchas--lessons-learned)

---

## Quick Start

### Prerequisites
- Node.js 20.x
- npm 10+
- Supabase project (PostgreSQL + Auth + Storage)
- Groq API key (resume parsing via Llama 3)

### Install & Run

```bash
git clone https://github.com/abaskabato/recrutas.git
cd recrutas
npm install

# Copy env and fill in values (see Environment Variables section)
cp .env.example .env

# Run both frontend + backend
npm run dev:all
```

Frontend: `http://localhost:5173` · API: `http://localhost:5000`

### Seed Test Data

```bash
curl -X POST http://localhost:5000/api/dev/seed -H "x-dev-secret: <your-dev-secret>"
```

Test accounts after seeding:
| Role | Email | Password |
|------|-------|----------|
| Candidate | `abaskabato@gmail.com` | `123456` |
| Talent Owner | `rainierit@proton.me` | `rainierit08` |

---

## Architecture Overview

```
┌─────────────────────┐     ┌──────────────────────────┐
│   GitHub Actions     │     │     Vercel (Production)   │
│   (12 cron jobs)     │     │   Frontend: Vite static   │
│   Scrape 6AM/6PM     │     │   Backend: Serverless fn  │
│   Ghost check 6h     │     └────────────┬─────────────┘
│   SLA enforce daily  │                  │
└─────────┬───────────┘                  │
          │                              │
          ▼                              ▼
┌──────────────────────────────────────────────────────┐
│                 Express API Server                    │
│  server/index.ts → server/routes.ts (3063 lines)     │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Middleware   │  │  Services    │  │    Lib       │ │
│  │ auth.ts     │  │ exam         │  │ redis.ts     │ │
│  │ security.ts │  │ resume       │  │ groq-limiter │ │
│  │ metrics.ts  │  │ stripe       │  │ ats-probe    │ │
│  │ error-hndlr │  │ job-ingest   │  │ supabase     │ │
│  └─────────────┘  │ agent-apply  │  │ email        │ │
│                    │ greenhouse   │  └─────────────┘ │
│                    └──────────────┘                   │
└───────────────────────┬──────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
┌──────────────┐ ┌────────────┐ ┌──────────────┐
│  PostgreSQL  │ │  Supabase  │ │    Redis     │
│  (Drizzle)   │ │  Auth +    │ │  (Upstash)   │
│  35+ tables  │ │  Storage   │ │  Rate limits │
└──────────────┘ └────────────┘ │  Match cache │
                                └──────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript | UI framework |
| Build | Vite | Fast dev/build |
| Routing | wouter | Lightweight client router |
| Server State | TanStack Query v5 | Cache, fetch, sync |
| Styling | Tailwind CSS + shadcn/ui | Design system |
| Backend | Express + TypeScript | API server |
| ORM | Drizzle ORM | Type-safe SQL |
| Database | PostgreSQL (Supabase) | Primary data store |
| Auth | Supabase Auth + JWT | Session management |
| File Storage | Supabase Storage | Resume PDFs |
| Cache | Upstash Redis | Rate limits, match cache |
| AI — Parsing | Groq (Llama 3) | Resume → structured data |
| AI — Embeddings | `@xenova/transformers` (all-MiniLM-L6-v2) | Semantic matching |
| Payments | Stripe | Subscription billing |
| Email | Resend | Transactional email |
| Real-time | WebSocket (ws) | Notifications, chat |
| CI/CD | GitHub Actions + Vercel | Build, test, cron, deploy |

---

## Project Structure

```
recrutas/
├── client/src/
│   ├── pages/                          # Route-level pages
│   │   ├── landing-responsive.tsx      # Public landing page (YC-style)
│   │   ├── auth-page.tsx               # Login/signup
│   │   ├── signup-candidate.tsx        # Candidate registration
│   │   ├── signup-talent.tsx           # Talent owner registration
│   │   ├── candidate-dashboard-streamlined.tsx  # Main candidate page (tabs: Jobs, Saved, Applications, Profile)
│   │   ├── talent-dashboard/           # Recruiter dashboard (split into sub-modules)
│   │   │   ├── index.tsx               # Orchestrator — state, hooks, dialogs
│   │   │   ├── types.ts               # Shared TypeScript types
│   │   │   ├── OverviewTab.tsx        # Platform overview
│   │   │   ├── JobsTab.tsx            # Job management
│   │   │   ├── CandidatesTab.tsx      # Applicant pipeline
│   │   │   └── AnalyticsTab.tsx       # Hiring analytics
│   │   ├── talent-dashboard.tsx        # Re-export shim → talent-dashboard/index
│   │   ├── exam-page.tsx               # Exam taking page
│   │   ├── chat.tsx                    # Real-time messaging
│   │   ├── admin-dashboard.tsx         # Unified admin panel with 4 tabs (/admin)
│   │   ├── metrics-dashboard.tsx       # System metrics (lazy-loaded into admin panel)
│   │   ├── pricing.tsx                 # Stripe pricing tiers
│   │   ├── guided-setup.tsx            # New user onboarding wizard
│   │   ├── privacy.tsx / terms.tsx     # Legal pages
│   │   └── not-found.tsx               # 404
│   │
│   ├── components/
│   │   ├── ai-job-feed.tsx             # THE main job feed — fetch, filter, display, agent apply
│   │   ├── profile-wizard.tsx          # Multi-step profile setup (upload → review → preferences)
│   │   ├── profile-completion-modal.tsx # Quick-edit profile modal
│   │   ├── profile-upload.tsx          # Resume upload + parsing
│   │   ├── job-exam.tsx                # Exam UI (questions, timer, submit)
│   │   ├── job-posting-wizard.tsx      # Create/edit job posting
│   │   ├── chat-interface.tsx          # Chat room UI
│   │   ├── application-tracker.tsx     # Application status list
│   │   ├── candidate-ranking-engine.tsx # Rank candidates by exam score
│   │   ├── AIMatchBreakdownModal.tsx   # Match score explanation modal
│   │   ├── FeedbackButton.tsx          # Floating feedback widget
│   │   ├── role-guard.tsx              # Route protection by role
│   │   ├── auth-guard.tsx              # Session check wrapper
│   │   ├── page-meta.tsx              # Per-route SEO meta tags
│   │   ├── error-boundary.tsx          # React error boundary
│   │   ├── recrutas-logo.tsx           # SVG logo (icon, compact wordmark, simple)
│   │   ├── smart-logo.tsx              # Context-aware logo (routes to correct dashboard)
│   │   ├── theme-provider.tsx          # Dark/light mode provider
│   │   ├── AppProviders.tsx            # Root provider tree (Supabase, Query, Theme)
│   │   ├── guided-setup/              # Onboarding step components
│   │   │   └── ResumeUploadStep.tsx
│   │   └── ui/                         # shadcn/ui primitives (button, dialog, card, etc.)
│   │
│   ├── hooks/
│   │   ├── use-auth.ts                 # User session + profile merging
│   │   ├── use-toast.ts                # Toast notification hook
│   │   ├── use-mobile.tsx              # Responsive breakpoint detection
│   │   ├── use-websocket-notifications.ts  # WebSocket notification listener
│   │   ├── useWebSocket.ts             # Raw WebSocket hook
│   │   └── useRoleBasedAuth.ts         # Role check utility
│   │
│   ├── lib/
│   │   ├── queryClient.ts             # TanStack Query client + apiRequest helper
│   │   ├── supabase-client.ts         # Supabase browser client
│   │   ├── auth-client.ts             # Auth helper functions
│   │   ├── authUtils.ts               # Token utilities
│   │   ├── matching.ts                # Client-side match scoring (backup)
│   │   ├── dashboard-utils.ts         # Formatting helpers for dashboards
│   │   └── utils.ts                   # cn() Tailwind merge helper
│   │
│   └── utils/                          # Pure utility functions
│       ├── validation.utils.ts         # Input validation
│       ├── format.utils.ts             # Display formatting
│       ├── transform.utils.ts          # Data transformation
│       └── storage.utils.ts            # Type-safe storage helpers
│
├── server/
│   ├── index.ts                        # Express app setup, middleware registration, Vite/static
│   ├── routes.ts                       # ALL API routes (3063 lines) — the main file
│   ├── chat-routes.ts                  # Chat-specific routes
│   ├── storage.ts                      # IStorage interface + DatabaseStorage (2694 lines)
│   ├── db.ts                           # Drizzle ORM instance
│   ├── ai-service.ts                   # Legacy matching (skill cosine similarity)
│   ├── ai-resume-parser.ts             # Groq-powered resume → JSON extraction
│   ├── advanced-matching-engine.ts     # ML semantic matching (all-MiniLM-L6-v2)
│   ├── notification-service.ts         # Push notifications + WebSocket + email
│   ├── career-page-scraper.ts          # Greenhouse/Lever/Ashby/Workday scrapers
│   ├── job-aggregator.ts               # RemoteOK + WeWorkRemotely + JSearch
│   ├── job-liveness-service.ts         # Ghost job HTTP probe (HEAD/GET check)
│   ├── company-jobs-aggregator.ts      # Cached company career page fetcher
│   ├── email-service.ts                # Resend email wrapper
│   ├── skill-intelligence-engine.ts    # NLP-based skill extraction from text
│   ├── inngest-service.ts              # Inngest background function definitions
│   │
│   ├── middleware/
│   │   ├── auth.ts                     # JWT verification (Supabase HS256)
│   │   ├── security.ts                 # Helmet, CORS, rate limiting, input size limits
│   │   ├── metrics.ts                  # Request metrics sampling (20%)
│   │   └── error-handler.ts            # Global error handler → error_events table
│   │
│   ├── services/
│   │   ├── resume.service.ts           # Upload to Supabase Storage + trigger AI parse
│   │   ├── exam.service.ts             # Auto-generate exam via Groq, score, rank
│   │   ├── job-ingestion.service.ts    # Normalize + dedupe scraped jobs → DB
│   │   ├── stripe.service.ts           # Checkout, portal, webhook, tier management
│   │   ├── greenhouse-submit.service.ts # Greenhouse Boards API submission
│   │   ├── agent-apply.service.ts      # Agent Apply orchestration
│   │   ├── batch-embedding.service.ts  # Bulk embedding generation
│   │   ├── company-discovery.service.ts # Auto-discover companies with ATS
│   │   ├── ats-detection.service.ts    # Detect which ATS a company uses
│   │   ├── sota-scraper.service.ts     # State-of-the-art scraper patterns
│   │   ├── job-refresh.service.ts      # Refresh stale job data
│   │   ├── we-work-remotely.service.ts # WeWorkRemotely scraper
│   │   ├── external-jobs-scheduler.ts  # Cron scheduling logic
│   │   └── index.ts                    # Service barrel export
│   │
│   ├── lib/
│   │   ├── redis.ts                    # Upstash Redis adapter (Map fallback when no env)
│   │   ├── groq-limiter.ts             # Priority queue rate limiter for Groq API
│   │   ├── groq-limiter-redis.ts       # Distributed rate limiter (Redis-backed)
│   │   ├── ats-probe.ts               # Probe company slugs for ATS (Greenhouse/Lever/Ashby)
│   │   ├── supabase-admin.ts           # Supabase admin client (service role key)
│   │   ├── supabase-client.ts          # Supabase client factory
│   │   ├── ai-client.ts               # AI provider abstraction
│   │   └── email.ts                    # Email transport
│   │
│   └── routes/
│       └── metrics-api.ts              # Admin metrics endpoints
│
├── shared/
│   └── schema.ts                       # Drizzle schema — THE source of truth (958 lines, 35 tables)
│
├── scripts/
│   ├── scrape-tier.ts                  # CLI scraper for tiered company lists
│   ├── generate-api-handler.js         # Build Vercel serverless handler
│   └── wait-for-server.js             # Startup health check
│
├── e2e/                                # Playwright E2E tests
│   ├── comprehensive-mvp.spec.ts       # 61 tests — core MVP flows
│   └── uncovered-flows.spec.ts         # 26 tests — exam, chat, mobile, resume
│
├── extension/                          # Chrome MV3 extension (auto-fill career pages)
│   ├── manifest.json
│   ├── background.js                   # Service worker (auth, API)
│   ├── content.js                      # DOM injection (button + form fill)
│   ├── popup.html / popup.js / popup.css
│   └── icons/
│
├── public/                             # Static assets
│   ├── favicon.svg / favicon.png       # Brand icon (emerald green blocky "R")
│   ├── og-image.png                    # 1200×630 social card
│   ├── icon-192.png / icon-512.png     # PWA icons
│   ├── robots.txt / sitemap.xml        # SEO
│   └── manifest.json                   # PWA manifest
│
├── .github/workflows/                  # 12 GitHub Actions workflows
├── standalone-server.js                # Dev entry point
├── api/index.js                        # Vercel serverless entry point
├── vercel.json                         # Vercel routing config
├── vite.config.ts                      # Vite build config
├── tailwind.config.ts                  # Tailwind theme config
├── drizzle.config.ts                   # Drizzle migration config
├── tsconfig.json                       # TypeScript config
├── eslint.config.js                    # ESLint v9 flat config
└── package.json
```

---

## Database Schema

Source of truth: `shared/schema.ts` (958 lines, 35 tables)

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Base auth record | `id` (UUID from Supabase), `email`, `role` (candidate/talent_owner), `profile_complete` |
| `candidate_users` | Candidate profile | `skills` (JSON array), `experience`, `resumeUrl`, `bio`, `location`, `linkedinUrl`, `githubUrl` |
| `talent_owner_profiles` | Company profile | `companyName`, `companySize`, `industry`, `website` |
| `job_postings` | Internal + external jobs | `title`, `company`, `skills`, `hasExam`, `examPassingScore`, `maxChatCandidates`, `externalSource`, `externalUrl`, `livenessStatus`, `trustScore` |
| `job_matches` | AI match records | `userId`, `jobId`, `matchScore`, `skillMatches`, `aiExplanation`, `confidenceLevel` |
| `job_applications` | Application status | `status` (submitted→viewed→screening→interview→offer/rejected), `appliedAt`, `statusHistory` |

### Exam & Chat Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `job_exams` | Auto-generated exams | `jobId`, `questions` (JSON), `passingScore` |
| `exam_attempts` | Exam results | `userId`, `examId`, `score`, `passedExam`, `qualifiedForChat`, `ranking` |
| `chat_rooms` | Messaging rooms | `jobId`, `candidateId`, `talentOwnerId`, `status` |
| `chat_messages` | Messages | `roomId`, `senderId`, `content`, `createdAt` |

### Notifications & Activity

| Table | Purpose |
|-------|---------|
| `notifications` | In-app + email notifications |
| `notification_preferences` | Per-user notification settings |
| `activity_logs` | User activity audit trail |
| `application_events` | Application lifecycle events |
| `application_updates` | Status change history |

### External Jobs & Discovery

| Table | Purpose |
|-------|---------|
| `discovered_companies` | Auto-discovered companies with ATS (status: pending/approved/rejected) |
| `saved_jobs` / `hidden_jobs` | User job bookmarks and dismissals |

### Platform Operations

| Table | Purpose |
|-------|---------|
| `subscription_tiers` | Stripe pricing tiers (Starter/Growth/Enterprise) |
| `user_subscriptions` | User ↔ Stripe subscription mapping |
| `usage_tracking` | Feature usage metering |
| `invite_codes` | Invite-only signup codes |
| `invite_code_redemptions` | Code usage tracking |
| `daily_usage_limits` | Per-user daily rate limits (3 resumes, 5 jobs, 20 applications) |
| `error_events` | In-house error monitoring (fingerprint dedup) |
| `request_metrics` | Sampled request performance data |
| `agent_tasks` | Agent Apply job queue |

### Relationships

```
users (1) ──→ (1) candidate_users
users (1) ──→ (1) talent_owner_profiles
users (1) ──→ (*) job_applications
users (1) ──→ (*) job_matches
users (1) ──→ (*) exam_attempts
users (1) ──→ (*) notifications
users (1) ──→ (*) saved_jobs / hidden_jobs
users (1) ──→ (*) agent_tasks

job_postings (1) ──→ (1) job_exams
job_postings (1) ──→ (*) job_applications
job_postings (1) ──→ (*) job_matches
job_postings (1) ──→ (*) chat_rooms

job_exams (1) ──→ (*) exam_attempts

chat_rooms (1) ──→ (*) chat_messages
```

---

## Server Architecture

### Entry Points

- **Dev**: `standalone-server.js` → imports `server/index.ts`
- **Production (Vercel)**: `api/index.js` → serverless handler wrapping the Express app
- **Docker**: `standalone-server.js` directly

### `server/index.ts` — App Bootstrap

Sets up Express with:
1. Security middleware (Helmet, CORS, body-parser limits)
2. Stripe webhook raw body parser (must be before JSON parser)
3. JSON + URL-encoded body parsers
4. Cookie parser
5. Request metrics sampling (20%)
6. API routes via `registerRoutes(app)` from `server/routes.ts`
7. Chat routes via `registerChatRoutes(app)` from `server/chat-routes.ts`
8. In dev: Vite dev middleware; in prod: static file serving from `dist/public`
9. WebSocket upgrade handler on the HTTP server
10. Global error handler → `error_events` table

### `server/routes.ts` — All API Routes (3063 lines)

This is the largest file. Every API endpoint is registered here. It handles:
- Auth sync (Supabase → local DB user creation)
- Candidate CRUD (profile, resume, applications, saved/hidden jobs)
- Talent owner CRUD (jobs, applicants, exam management)
- AI matching (4-source aggregation with ML scoring)
- Notifications
- Stripe billing
- Cron endpoints (authenticated with `CRON_SECRET`)
- Admin endpoints (authenticated with `ADMIN_SECRET`)
- Agent Apply orchestration

### `server/storage.ts` — Data Access Layer (2694 lines)

Implements `IStorage` interface with `DatabaseStorage` class. All database operations go through this layer. Pattern:

```typescript
interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getCandidateUser(userId: string): Promise<CandidateProfile | undefined>;
  getJobRecommendations(userId: string): Promise<JobMatch[]>;
  // ... 80+ methods
}

class DatabaseStorage implements IStorage {
  // Drizzle queries
}

export const storage = new DatabaseStorage();
```

Every route calls `storage.*` — never uses Drizzle directly.

---

## Client Architecture

### Routing (wouter)

Defined in `client/src/App.tsx`:

| Path | Page | Auth Required |
|------|------|:---:|
| `/` | Landing page | No |
| `/auth` | Login/signup | No |
| `/signup/candidate` | Candidate registration | No |
| `/signup/talent` | Talent owner registration | No |
| `/candidate-dashboard` | Candidate main page | Yes (candidate) |
| `/talent-dashboard` | Recruiter main page | Yes (talent_owner) |
| `/exam/:jobId` | Exam taking | Yes (candidate) |
| `/chat` | Messaging | Yes |
| `/admin` | Unified admin panel (Overview, Metrics, Errors, Invites tabs) | Password-gated |
| `/pricing` | Stripe tiers | No |
| `/privacy` | Privacy policy | No |
| `/terms` | Terms of service | No |

### State Management

All server state uses **TanStack Query v5**. No Redux/Zustand.

Key patterns:
- `queryClient.ts` exports a shared `QueryClient` with `apiRequest()` helper
- `apiRequest()` automatically attaches Supabase JWT from the session
- Default `staleTime` is 0 (always refetch on mount)
- `refetchOnWindowFocus: false` globally
- Mutations use `queryClient.invalidateQueries()` to bust cache

### Auth Hook (`use-auth.ts`)

```typescript
// Returns merged user (Supabase session + DB profile fields)
const { user, isLoading } = useAuth();
```

- Uses `useSessionContext()` (not `useSession()`) to get `isLoading` boolean
- Fetches `/api/candidate/profile` and merges `profile_complete`, `skills`, etc. into the user object
- `isLoading` reflects only session loading (not profile fetch) — so RoleGuard resolves in 1 roundtrip

### Job Feed (`ai-job-feed.tsx`)

The core component. Fetches `/api/ai-matches`, applies client-side filters instantly, renders a virtualized list.

Key behaviors:
- Fetches all matches once, filters in `useMemo` (no network calls on filter change)
- 5-minute background refetch interval
- Auto-retry with spinner when matches come back empty (backend may still be computing)
- Retries up to 6 times (30s) at 5-second intervals
- Skips retries if candidate has no skills (guaranteed empty)
- Uses `removeQueries` (not `invalidateQueries`) after skill clear to prevent stale data flash

### Profile Wizard (`profile-wizard.tsx`)

Multi-step onboarding:
1. Upload resume → AI extraction
2. Review extracted skills → confirm or edit
3. Set job preferences (location, work type, salary)

"Clear all" button wipes skills and returns to step 1.

---

## API Reference

### Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/auth/user` | Yes | Current user from JWT |
| POST | `/api/auth/sync` | Yes | Sync Supabase user → local DB (validates invite code on first sync) |
| POST | `/api/auth/role` | Yes | Set user role (candidate / talent_owner) |
| POST | `/api/auth/extension-login` | No | Chrome extension sign-in (returns JWT) |

### Candidate Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/candidate/profile` | Yes | Full candidate profile |
| POST | `/api/candidate/profile` | Yes | Create/update profile |
| POST | `/api/candidate/profile/complete` | Yes | Mark profile complete |
| PUT | `/api/candidate/preferences` | Yes | Update job preferences |
| POST | `/api/candidate/resume` | Yes | Upload resume (PDF/DOCX, max 4MB, multer) |
| GET | `/api/candidate/stats` | Yes | Application stats (total, pending, interviews) |
| GET | `/api/candidate/activity` | Yes | Recent activity log |
| GET | `/api/candidate/applications` | Yes | All applications with status |
| GET | `/api/candidate/saved-jobs` | Yes | Bookmarked jobs |
| POST | `/api/candidate/saved-jobs` | Yes | Save a job |
| DELETE | `/api/candidate/saved-jobs/:jobId` | Yes | Unsave a job |
| POST | `/api/candidate/hidden-jobs` | Yes | Hide a job from feed |
| GET | `/api/candidate/job-actions` | Yes | All save/hide actions (for client-side state) |
| PUT | `/api/candidate/application/:id/status` | Yes | Withdraw application |
| POST | `/api/candidate/apply/:jobId` | Yes | Apply to job |
| POST | `/api/candidate/agent-apply/:jobId` | Yes | Agent Apply (auto-submit to Greenhouse) |
| GET | `/api/candidate/agent-tasks` | Yes | Agent Apply task history |
| DELETE | `/api/candidate/agent-tasks/:taskId` | Yes | Delete task |
| GET | `/api/candidate/notification-preferences` | Yes | Notification settings |
| PUT | `/api/candidate/notification-preferences` | Yes | Update settings |

### Job Matching

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/ai-matches` | Yes | Personalized job feed (4-source aggregation + ML scoring, 45s timeout) |
| GET | `/api/advanced-matches/:candidateId` | Yes | Advanced match breakdown |
| PUT | `/api/candidate/match-preferences` | Yes | Update matching weights |
| GET | `/api/jobs/:jobId/quality-indicators` | Yes | Job trust score, liveness, company verification |

### Talent Owner / Recruiter Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/talent-owner/jobs` | Yes | All jobs posted by this owner |
| GET | `/api/talent-owner/all-applicants` | Yes | All applicants across all jobs |
| GET | `/api/talent-owner/profile` | Yes | Talent owner profile |
| POST | `/api/talent-owner/profile/complete` | Yes | Complete company profile |
| GET | `/api/recruiter/stats` | Yes | Dashboard stats |
| POST | `/api/jobs` | Yes | Create job posting (auto-generates exam if `hasExam: true`) |
| PUT | `/api/jobs/:jobId` | Yes | Update job |
| DELETE | `/api/jobs/:jobId` | Yes | Delete job |
| PATCH | `/api/jobs/:jobId/status` | Yes | Open/close/pause job |
| GET | `/api/jobs/:jobId/applicants` | Yes | Applicants with exam scores |
| GET | `/api/jobs/:jobId/exam` | Yes | Get exam (without answers for candidates, with answers for owner) |
| POST | `/api/jobs/:jobId/exam/submit` | Yes | Submit exam answers → auto-score → auto-rank |
| GET | `/api/jobs/:jobId/screening-questions` | Yes | Custom screening questions |
| POST | `/api/jobs/:jobId/screening-questions` | Yes | Add screening questions |
| POST | `/api/applications/:id/screening-answers` | Yes | Submit screening answers |
| GET | `/api/jobs/:jobId/discovery` | Yes | Discover candidates for a job |
| PUT | `/api/applications/:id/status` | Yes | Update application status |
| POST | `/api/interviews/schedule` | Yes | Schedule interview |

### Chat Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/chat/rooms` | Yes | Rooms for current user |
| POST | `/api/chat/rooms/create` | Yes | Create room (talent owner only, verified via DB lookup) |
| GET | `/api/chat/rooms/:id/messages` | Yes | Get messages (raw SQL — Drizzle nested join bug) |
| POST | `/api/chat/rooms/:id/messages` | Yes | Send message (sanitized, 5000 char limit) |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/notifications` | Yes | All notifications |
| GET | `/api/notifications/count` | Yes | Unread count |
| POST | `/api/notifications/:id/read` | Yes | Mark one as read |
| POST | `/api/notifications/mark-all-read` | Yes | Mark all as read |
| GET | `/api/notifications/poll` | Yes | Long-poll for new notifications |
| POST | `/api/notifications/subscribe` | Yes | Subscribe to push |
| POST | `/api/notifications/unsubscribe` | Yes | Unsubscribe |
| GET | `/api/notifications/connection-status` | Yes | WebSocket health |

### Stripe / Payments

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/subscription/status` | Yes | Current subscription |
| GET | `/api/subscription/tiers` | No | Available pricing tiers |
| POST | `/api/stripe/create-checkout` | Yes | Create Stripe Checkout session |
| POST | `/api/stripe/portal` | Yes | Stripe Customer Portal link |
| GET | `/api/subscription/can-access/:feature` | Yes | Feature gate check |
| POST | `/api/admin/init-subscription-tiers` | Admin | Seed tier data |

### Cron Endpoints (require `x-cron-secret` header)

| Method | Endpoint | Schedule | Description |
|--------|----------|----------|-------------|
| POST | `/api/cron/scrape-external-jobs` | 6AM/6PM UTC | Tiered company scraping |
| POST | `/api/cron/enforce-response-sla` | Daily | 24h SLA enforcement |
| POST | `/api/cron/auto-hide-ghost-jobs` | Every 6h | Liveness probe stale jobs |
| POST | `/api/cron/purge-old-jobs` | Daily | Remove 60+ day old external jobs |
| POST | `/api/cron/discover-companies` | Daily 2AM | Discover + probe new companies |
| POST | `/api/cron/retry-failed-parses` | Daily | Re-parse failed resumes |
| POST | `/api/cron/warm-candidate-matches` | Daily | Pre-compute matches for active users |
| POST | `/api/cron/cleanup-errors` | Weekly Sun 6AM | Purge error_events > 30 days |

### Admin Endpoints (require `x-admin-secret` header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/run-ghost-job-detection` | Manual ghost job scan |
| GET | `/api/admin/ghost-job-stats` | Ghost job statistics |
| POST | `/api/admin/run-company-verification` | Manual company verification |
| GET | `/api/admin/company-verification-stats` | Verification stats |
| GET | `/api/admin/errors?level=error&limit=100` | Error event log — filter by level (`error`/`warning`/`fatal`), returns `{ errors, grouped, total }` |
| POST | `/api/admin/invite-codes` | Create invite code (single: `{code, description, role, maxUses}` or batch: `{count, prefix, description, role, maxUses}`) |
| GET | `/api/admin/invite-codes` | List all invite codes with usage stats |

### Public / Misc

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/ml-matching/status` | ML model load status |
| GET | `/api/platform/stats` | Public platform stats |
| GET | `/api/external-jobs` | External job listings |
| GET | `/api/job-stats` | Job count statistics |
| GET | `/api/news/layoffs` | Tech layoff news |
| POST | `/api/dev/seed` | Seed test data (dev only) |
| POST | `/api/feedback` | User feedback (rate-limited: 5/15min) |
| POST | `/api/ai/screening-questions` | Generate screening questions via AI |

---

## Authentication

### Flow

```
Browser                    Supabase Auth              Express API
  │                            │                          │
  ├──── signUp/signIn ────────→│                          │
  │←──── JWT (access_token) ───│                          │
  │                            │                          │
  ├──── GET /api/auth/user ───────────────────────────────→│
  │     (Bearer: access_token)                            │
  │                                    ┌──────────────────┤
  │                                    │ jwt.verify(token,│
  │                                    │ SUPABASE_JWT_    │
  │                                    │ SECRET, HS256)   │
  │                                    └──────────────────┤
  │←──── { id, email, role } ─────────────────────────────│
```

### Middleware: `server/middleware/auth.ts`

1. Extracts JWT from `Authorization: Bearer <token>` header or `sb-access-token` cookie
2. Verifies with `SUPABASE_JWT_SECRET` using HS256
3. Extracts `sub` (user ID) from payload
4. Attaches `req.user = { id, email, user_metadata, app_metadata }` to request
5. Returns 401 if no token or invalid; 500 if `JWT_SECRET` is empty

### Invite-Only Signup Gate

`POST /api/auth/sync` is called on first login. It:
1. Checks if user exists in local DB
2. If new user: validates `invite_code` from request body against `invite_codes` table
3. Creates user record + records redemption in `invite_code_redemptions`
4. Enforces `max_uses` on invite codes

### Role Guard (Client)

`role-guard.tsx` wraps protected pages:

```tsx
<RoleGuard allowedRoles={['candidate']}>
  <CandidateDashboard />
</RoleGuard>
```

Uses `useSessionContext()` (not `useSession()`) to avoid false redirects during loading.

---

## Matching Engine

File: `server/advanced-matching-engine.ts`

### Architecture

```
Candidate Profile (skills, experience, preferences)
         │
         ├──→ Generate candidate embedding (all-MiniLM-L6-v2 via @xenova/transformers)
         │
         ▼
    ┌─────────────────────────────────────────────────┐
    │              For each job:                       │
    │                                                  │
    │  1. Semantic Similarity (45%)                    │
    │     cosine(candidate_embedding, job_embedding)   │
    │                                                  │
    │  2. Recency Score (25%)                          │
    │     Exponential decay from posting date          │
    │                                                  │
    │  3. Liveness Score (20%)                         │
    │     HTTP probe: active=1.0, stale=0.3, dead=0   │
    │                                                  │
    │  4. Personalization (10%)                        │
    │     Saved jobs boost, hidden jobs penalize       │
    │                                                  │
    │  Final = weighted sum → filter ≥ 40%            │
    └─────────────────────────────────────────────────┘
```

### `/api/ai-matches` Pipeline

1. Fetch candidate profile + skills from DB
2. Fire 4 parallel data sources (each with individual timeouts):
   - **DB recommendations** (8s timeout) — pre-computed matches from `job_matches` table
   - **RemoteOK** (API, 15-min cache)
   - **WeWorkRemotely** (API, 30-min cache)
   - **Company career pages** (DB, from daily scraper output)
3. Wait for all via `Promise.allSettled` (45s global timeout)
4. If ML model loaded: re-score all jobs with semantic embeddings (batches of 3-5)
5. Deduplicate across sources (by `title|company` key)
6. Sort by match score descending
7. Split into two sections: "Apply & Know Today" (internal, has exam) vs "Matched For You" (external)

### ML Model

- `@xenova/transformers` loads `all-MiniLM-L6-v2` in-process
- First request takes 10-30s (model download + ONNX init)
- Subsequent requests ~50ms
- Falls back to simple skill overlap matching if model not loaded

### Redis Match Cache

5-minute TTL per `userId:queryHash`. Prevents re-computation on rapid page reloads.

---

## Job Pipeline

### Scraping Architecture (Tiered)

| Tier | ATS | Companies | Method |
|------|-----|-----------|--------|
| Tier 1 | Greenhouse | 29 | `boards-api.greenhouse.io/v1/boards/{slug}/jobs` (JSON) |
| Tier 2 | Lever | 12 | `api.lever.co/v0/postings/{slug}` (JSON) |
| Tier 2 | Ashby | 3 | `api.ashbyhq.com/posting-api/job-board/{slug}` (JSON) |
| Tier 2 | Workday | 7 | `{company}.wd5.myworkdayjobs.com/wday/cxs/{path}/jobs` (JSON) |
| Tier 3 | Custom | 21+ | Direct career page scraping |

### Files Involved

- `scripts/scrape-tier.ts` — CLI entry point, reads company list from `server/career-page-scraper.ts`
- `server/career-page-scraper.ts` — ATS-specific fetch + parse logic; merges hardcoded + `discovered_companies` (approved)
- `server/services/job-ingestion.service.ts` — Normalize, validate, dedupe, insert into `job_postings`
- `server/job-liveness-service.ts` — HTTP HEAD/GET probe on external URLs

### Dynamic Company Discovery

- `server/services/company-discovery.service.ts` — Discovers new companies via YC directory, LinkedIn, etc.
- `server/lib/ats-probe.ts` — Probes company slugs against Greenhouse/Lever/Ashby APIs
  - `MAX_CONCURRENT = 5`, 200ms batch delay
  - Redis circuit breaker: 10× 429 → 60s pause
- Discovered companies stored in `discovered_companies` table (status: pending → admin approves → approved)
- Approved companies are merged into the scraper list at runtime

### Ghost Job Detection

`job-liveness-service.ts` runs every 6 hours:
1. HTTP HEAD request to each external job URL
2. If 404/410 → mark `livenessStatus = 'stale'`
3. Auto-hide after 3 consecutive stale checks
4. Feed filters out stale jobs

---

## Exam System

### Auto-Generation

File: `server/services/exam.service.ts`

When a talent owner creates a job with `hasExam: true`:
1. Job description + requirements → Groq (Llama 3)
2. AI generates 5-10 multiple-choice questions
3. Stored in `job_exams` table as JSON
4. Questions served to candidates **without** `correctAnswer` field (IDOR-safe)

### Scoring & Ranking

On exam submission (`POST /api/jobs/:jobId/exam/submit`):
1. Score calculated server-side (comparing answers to stored correct answers)
2. `exam_attempts` record created with `score`, `passedExam`, `ranking`
3. `rankCandidatesByExamScore()` runs automatically:
   - Ranks all attempts for this job by score descending
   - Top N (`maxChatCandidates`, default 5) are granted `qualifiedForChat = true`
   - Chat rooms auto-created for qualified candidates
4. All candidates receive notification with their status

---

## Chat System

### Access Control

- Chat rooms are **exam-gated**: only candidates who pass the exam and rank in top N get access
- Only talent owners can create chat rooms (verified via DB lookup on `users` table — NOT via JWT `role` claim, which is unreliable)
- Messages sanitized server-side: HTML tags stripped, 5,000 character limit

### Known Drizzle Workaround

Chat messages use **raw SQL** instead of Drizzle ORM joins:

```typescript
// Drizzle 0.39 nested join bug returns garbled data
// Fixed with raw SQL query
const messages = await db.execute(sql`
  SELECT cm.*, u.email as sender_email
  FROM chat_messages cm
  JOIN users u ON cm.sender_id = u.id
  WHERE cm.room_id = ${roomId}
  ORDER BY cm.created_at ASC
`);
```

---

## Agent Apply

### What It Does

Auto-submits a candidate's application to Greenhouse job boards via their public Boards API. No browser automation — pure HTTP.

### Files

- `server/services/greenhouse-submit.service.ts` — Core submission logic
- `server/services/agent-apply.service.ts` — Orchestration
- `server/routes.ts` (~line 2860) — `POST /api/candidate/agent-apply/:jobId`

### Flow

```
Candidate clicks "Agent Apply" on a Greenhouse job
       │
       ▼
Parse Greenhouse URL → extract boardToken + jobId
       │
       ▼
Fetch custom questions from Greenhouse API
GET /v1/boards/{board}/jobs/{id}?questions=true
       │
       ▼
Classify each question (pattern matching on label)
  work_auth, sponsorship, source, linkedin, github,
  website, location, relocate, age_confirm, etc.
       │
       ▼
Auto-answer classified questions using candidate profile
  (skip: salary, pronouns, free-text fields)
       │
       ▼
Download resume from Supabase → attach as multipart file
       │
       ▼
POST /v1/boards/{board}/jobs/{id}/applications
  (multipart/form-data with resume + answers)
       │
       ▼
Record application in DB + send email + in-app notification
```

### Question Coverage

Tested against 7 real companies: 44-86% of custom questions auto-answered. Common skips: salary expectations, pronouns, free-text "tell us more" fields.

---

## Background Jobs (GitHub Actions)

All workflows in `.github/workflows/`:

| Workflow | Schedule | File | What it does |
|----------|----------|------|-------------|
| `scrape-tech-companies.yml` | 6AM/6PM UTC | `scripts/scrape-tier.ts` | Scrape 94+ companies across 4 ATS tiers |
| `auto-hide-ghost-jobs.yml` | Every 6h | Cron endpoint | HTTP probe external job URLs, mark stale |
| `purge-old-jobs.yml` | Daily | Cron endpoint | Delete external jobs > 60 days old |
| `discover-companies.yml` | Daily 2AM | Cron endpoint | Discover + ATS-probe 10 new companies |
| `batch-embeddings.yml` | Daily | Cron endpoint | Generate embeddings for new jobs |
| `enforce-response-sla.yml` | Daily | Cron endpoint | Auto-reject 24h+ unreviewed applications |
| `warm-candidate-matches.yml` | Daily | Cron endpoint | Pre-compute matches for active users |
| `retry-failed-parses.yml` | Daily | Cron endpoint | Re-parse resumes that failed AI extraction |
| `cleanup-errors.yml` | Weekly Sun 6AM | Cron endpoint | Purge error_events > 30 days |
| `agent-apply.yml` | On demand | Agent apply tasks | Process queued agent apply jobs |
| `ci.yml` | On push/PR | | Type check + lint + test |
| `push-schema-dev.yml` | Manual | `drizzle-kit push` | Push schema changes to DB |

All cron endpoints authenticate with `CRON_SECRET` header.

---

## Middleware

### `server/middleware/auth.ts`
JWT verification — see [Authentication](#authentication) section.

### `server/middleware/security.ts`
- **Helmet**: Security headers (CSP, HSTS, etc.)
- **CORS**: Configured for `FRONTEND_URL` + localhost:5173
- **Rate limiting**: express-rate-limit on sensitive endpoints
- **Body size limits**: 10MB JSON, 4MB file uploads
- **Input sanitization**: Strips HTML from string inputs

### `server/middleware/metrics.ts`
- 20% sampling of all requests
- Records: method, path, status code, response time, user agent
- Stored in `request_metrics` table
- Viewable at `/admin` → Metrics tab

### `server/middleware/error-handler.ts`
- Global Express error handler
- Generates fingerprint from error message + stack
- Deduplicates in `error_events` table (increment count on same fingerprint)
- Returns sanitized error to client (no stack traces in production)

---

## Rate Limiting

### Groq API Rate Limiter

File: `server/lib/groq-limiter.ts`

Priority queue with 4 levels:

| Priority | Used By | Description |
|----------|---------|-------------|
| `critical` | `exam.service.ts` | Exam generation — user is waiting |
| `high` | `ai-resume-parser.ts` | Resume parsing — user just uploaded |
| `medium` | `ai-service.ts` | Job matching — background compute |
| `low` | `career-page-scraper.ts` | Scraping — fully async |

Token bucket: 5,000 tokens/min, 25 requests/min.
Circuit breaker: 60s pause on 429, 5min pause on 3 consecutive 429s.
LRU cache: 500 entries for summary dedup.

### Redis-Distributed Version

`server/lib/groq-limiter-redis.ts` — same logic but backed by Upstash Redis for multi-instance deployments.

### Daily Usage Limits

Enforced in `routes.ts` per user per day:
- 3 resume uploads
- 5 job postings
- 20 job applications

Tracked in `daily_usage_limits` table.

---

## Admin Panel

File: `client/src/pages/admin-dashboard.tsx`

Single unified admin dashboard at `/admin`, password-gated via `ADMIN_SECRET` (stored in `sessionStorage`, sent as `x-admin-secret` header). All admin functionality is accessed through 4 tabs:

### Tab: Overview

Platform stats, ghost job detection, and company verification — the operational command center.

- **Platform Stats** — total jobs, users, and matches (from `/api/platform/stats`)
- **Ghost Job Detection** — run manual ghost job scans, view stats (checked, ghosts found, deactivated, last run)
- **Company Verification** — run manual company verification, view stats (total, verified, unverified, last run)

### Tab: Metrics

Lazy-loaded from `metrics-dashboard.tsx` via `React.lazy()` + `Suspense`. Displays system performance data from 7 admin metrics endpoints:

- Request latency (p50/p95/p99), error rates, endpoint breakdowns
- Match quality distribution, embedding cache hit rates
- Job feed performance, growth trends
- Data source: `request_metrics` table (20% sampling via `server/middleware/metrics.ts`)

### Tab: Errors

In-house error monitoring (replaced Sentry). Fetches from `GET /api/admin/errors`.

**How errors are captured:**
1. `server/middleware/error-handler.ts` catches all unhandled Express errors
2. Generates MD5 fingerprint from `message + first 3 stack frames`
3. Upserts into `error_events` table:
   - New fingerprint → insert with `count = 1`
   - Existing fingerprint → increment `count`, update `last_seen`
4. Weekly cleanup cron purges events > 30 days

**UI features:**
- **Level filter** — All / Error / Warning / Fatal (dropdown)
- **Grouped errors** — Top errors in last 24h by fingerprint, showing count, level badge, component, last seen time
- **Individual error list** — Scrollable list with level badge, component, timestamp, message, expandable stack trace, and metadata JSON
- API response shape: `{ errors: ErrorEvent[], grouped: { fingerprint, message, component, level, count, last_seen }[], total: number }`

### Tab: Invite Codes

Manage invite-only signup codes. Fetches from `GET /api/admin/invite-codes`, creates via `POST /api/admin/invite-codes`.

**Create modes:**
- **Single** — specify exact code (e.g., `WELCOME2026`), description, role (`any`/`candidate`/`talent_owner`), max uses
- **Batch** — generate N codes (up to 100) with a prefix (e.g., `REC-A3B7XK`), shared description, role, max uses

**Code list table columns:** Code (monospace, copyable), Role, Uses (current/max), Description, Expires

### Architecture Notes

- All tabs share a single auth gate — authenticate once, access everything
- `MetricsContent` is code-split (`React.lazy`) so the metrics bundle only loads when that tab is opened
- Tab state persists during the session (switching tabs doesn't re-authenticate)
- Horizontal tab bar scrolls on mobile (`overflow-x-auto`)

---

## Payments (Stripe)

File: `server/services/stripe.service.ts`

### Tiers

| Tier | Price | Limits |
|------|-------|--------|
| Starter | $49/mo | 3 active jobs |
| Growth | $149/mo | 10 active jobs + candidate discovery |
| Enterprise | $299/mo | Unlimited + priority support |

### Integration Points

- `POST /api/stripe/create-checkout` → Creates Stripe Checkout Session
  - `success_url` → `/talent-dashboard?subscription=success`
  - `cancel_url` → `/pricing`
- `POST /api/stripe/webhook` → Handles `checkout.session.completed`, `customer.subscription.updated/deleted`
- `POST /api/stripe/portal` → Customer Portal for self-service subscription management
- `GET /api/subscription/can-access/:feature` → Feature gate check

---

## Real-Time (WebSocket)

### Server Setup

WebSocket server attached to the HTTP server on upgrade. Connection: `ws://host/ws?userId=<userId>`

### Features

- Heartbeat: 30-second ping/pong
- Notification delivery: instant push when notification created
- Chat messages: real-time delivery to chat room participants
- Connection tracking in `connection_status` table

### Client Hook

```typescript
// client/src/hooks/use-websocket-notifications.ts
const { isConnected, lastMessage } = useWebSocketNotifications(userId);
```

---

## Environment Variables

### Required

| Variable | Where Used | Description |
|----------|-----------|-------------|
| `DATABASE_URL` | `server/db.ts` | PostgreSQL pooled connection string |
| `DIRECT_URL` | `drizzle.config.ts` | PostgreSQL direct connection (migrations) |
| `POSTGRES_URL` | `server/db.ts` | Alias for DATABASE_URL (Vercel convention) |
| `VITE_SUPABASE_URL` | Client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Supabase anon/public key |
| `SUPABASE_URL` | Server | Same as VITE_SUPABASE_URL (server-side) |
| `SUPABASE_ANON_KEY` | Server | Same as VITE_SUPABASE_ANON_KEY (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Admin operations (user management, storage) |
| `SUPABASE_JWT_SECRET` | `middleware/auth.ts` | JWT signature verification |
| `FRONTEND_URL` | `server/index.ts` | CORS origin |
| `CRON_SECRET` | `routes.ts` | Authenticate GitHub Actions cron calls |
| `ADMIN_SECRET` | `routes.ts` | Admin panel password |

### Optional (Feature-Gated)

| Variable | Feature | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | Resume parsing, exam gen | Groq API key for Llama 3 |
| `GEMINI_API_KEY` | AI fallback | Google Gemini fallback |
| `HF_API_KEY` | Embeddings | Hugging Face Inference API |
| `RESEND_API_KEY` | Email | Transactional email (Resend) |
| `STRIPE_SECRET_KEY` | Payments | Stripe secret key |
| `VITE_STRIPE_PUBLIC_KEY` | Payments (client) | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Payments | Stripe webhook signing secret |
| `FIRECRAWL_API_KEY` | Scraping | Firecrawl web scraping API |
| `DEV_SECRET` | Dev tools | Guard for `/api/dev/*` endpoints |
| `UPSTASH_REDIS_REST_URL` | Caching | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Caching | Upstash Redis auth token |

### Critical Notes

- If `SUPABASE_JWT_SECRET` is empty string → ALL authenticated routes return 500
- If `GROQ_API_KEY` missing → resume parsing falls back to Skill Intelligence Engine (regex-based)
- If `RESEND_API_KEY` missing → emails silently skip (no crash)
- If Redis env vars missing → falls back to in-process `Map` (no distributed caching)

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Frontend only (Vite dev server) |
| `npm run dev:all` | Frontend + backend concurrently |
| `npm run dev:server` | Backend with watch mode (tsx) |
| `npm run build` | Full production build (client + server + API handler) |
| `npm run build:server` | esbuild server bundle |
| `npm run build:api` | Generate Vercel serverless handler |
| `npm start` | Production server |
| `npm run lint` | ESLint (flat config, v9) |
| `npm run type-check` | TypeScript noEmit check |
| `npm run check` | type-check + lint |
| `npm test` | Run all tests |
| `npm run test:e2e` | E2E test runner |
| `npm run test:playwright` | Playwright tests directly |
| `npm run test:playwright:ui` | Playwright UI mode |
| `npm run db:push` | Push Drizzle schema to database |

---

## Testing

### E2E Tests (Playwright)

87 tests across 2 suites:

| Suite | Tests | Coverage |
|-------|:-----:|----------|
| `e2e/comprehensive-mvp.spec.ts` | 61 | Auth, dashboard, job posting, application flow, chat, notifications, admin |
| `e2e/uncovered-flows.spec.ts` | 26 | Exam taking, mobile responsive, resume upload, edge cases |

```bash
# Run all
npx playwright test

# Specific suite
npx playwright test e2e/comprehensive-mvp.spec.ts --reporter=list

# Headed mode (see browser)
npx playwright test --headed

# UI mode (interactive)
npx playwright test --ui
```

### Unit Tests

```bash
npm run test:unit:backend     # Jest unit tests
npm run test:integration:backend  # Integration tests (needs Supabase)
```

### CI Pipeline (`.github/workflows/ci.yml`)

On every push/PR:
1. `npm run type-check`
2. `npm run lint`
3. `npm test`
4. Integration tests (continue-on-error — needs Supabase creds)

---

## Deployment

### Vercel (Production)

```bash
vercel deploy --prod
```

Config in `vercel.json`:
- Frontend: static files from `dist/public`
- Backend: serverless function at `api/index.js`
- All routes except `/api/*` and static assets → rewrite to `index.html` (SPA)

### Build Artifacts

```
dist/
├── public/          # Vite-built frontend (index.html, JS/CSS bundles, assets)
└── server/
    └── index.js     # esbuild-bundled server (ESM, external node_modules)
```

### Docker

```bash
docker build -t recrutas .
docker run -p 3000:3000 --env-file .env recrutas
```

---

## Key Gotchas & Lessons Learned

These are non-obvious issues that have caused production bugs. Read before making changes.

### Drizzle ORM 0.39 Nested Join Bug
Drizzle returns garbled/nested objects when doing joins with `leftJoin`. Chat messages and applicant queries use **raw SQL** as a workaround. If you see `db.execute(sql`...)`, don't refactor to Drizzle joins — it will break.

### `useSession()` vs `useSessionContext()`
`useSession()` returns `null` for both loading and unauthenticated states. Always use `useSessionContext()` which provides `{ session, isLoading }`. Using `useSession()` causes false "Session Expired" redirects during initial load.

### JWT `role` Claim is Unreliable
Supabase JWT's `user_metadata.role` is NOT populated by the middleware. Chat room creation verifies role via DB lookup (`SELECT role FROM users WHERE id = ?`), not JWT claims. Any new role-gated logic must do the same.

### TanStack Query Cache & Empty Data Flash
When `invalidateQueries` is called, TanStack Query marks data as stale but **keeps the cached value**. This means old data briefly flashes before the refetch completes. For destructive operations (skill clear, logout), use `removeQueries` instead to wipe the cache completely.

### Groq Rate Limits
Groq's free tier has strict rate limits (25 req/min, 5000 tokens/min). The priority queue in `groq-limiter.ts` prevents cascading failures. If you add a new Groq call site, wrap it with the limiter and assign an appropriate priority level.

### `server/inngest-service.ts` Naming
This file was originally `server/inngest.ts` which collided with the `inngest` npm package name. esbuild resolved `import { Inngest } from 'inngest'` to the file itself (circular import). Always avoid naming files the same as npm packages.

### Supabase JWT Secret
If `SUPABASE_JWT_SECRET` is missing or empty, the auth middleware returns 500 for ALL authenticated routes. This is the #1 cause of "everything broke after deploy" — check Vercel env vars first.

### `build:server` External Packages
Server build uses `--packages=external` to exclude all node_modules from the bundle. If you add a dependency that needs bundling (rare), you'll need to handle it explicitly.

### Lever API Slowness
`api.lever.co` is slow/blocked from certain IPs. Works fine from Vercel production. If scraping fails locally, it's likely an IP issue, not a code bug.

### `POSTGRES_URL_NON_POOLING` vs `DIRECT_URL`
`.env` uses `POSTGRES_URL_NON_POOLING`. Drizzle config expects `DIRECT_URL`. If running `drizzle-kit push` locally, either set `DIRECT_URL` or use raw SQL via `psql`.

---

## Contributing

1. Create a feature branch from `main`
2. Make changes
3. Run `npm run check` (type-check + lint)
4. Run `npx playwright test` for E2E
5. Open a PR against `main`

### Code Style

- ESLint v9 flat config (`eslint.config.js`)
- ~1068 `no-explicit-any` warnings (accepted — not blocking)
- Prefer `any` over complex generics for Drizzle query results
- No Prettier — rely on ESLint + editor formatting

---

<p align="center">
  <sub>Built by <a href="https://github.com/abaskabato">Abas</a> in Seattle</sub>
</p>
