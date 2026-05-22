<p align="center">
  <img src="public/favicon.svg" alt="Recrutas Logo" width="80" height="80" />
</p>

<h1 align="center">Recrutas</h1>

<p align="center">
  <strong>AI-powered hiring platform where every candidate gets a same-day response.</strong>
</p>

<p align="center">
  <a href="https://recrutas.ai">recrutas.ai</a> ·
  Built with React 18 · Express · Supabase (PostgreSQL) · Groq (Llama 3) ·
  TanStack Query · Tailwind CSS · shadcn/ui · Drizzle ORM · Redis · Stripe
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
- [Technical Deep Dive (Deck-Ready)](#technical-deep-dive-deck-ready)
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
- [External APIs & Startup Credits](#external-apis--startup-credits)

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

# Or run separately:
npm run dev              # Frontend only (Vite dev server)
npm run dev:server       # Backend with watch mode (tsx)
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

## Technical Deep Dive (Deck-Ready)

This section is structured as presentation content — each subsection is a slide covering one
technical area of Recrutas. Use this to explain the architecture to engineers, investors,
and technical stakeholders.

---

### Slide 1: System Architecture

```
                    ┌─────────────────────────────┐
                    │      GitHub Actions          │
                    │  (12 cron workflows)         │
                    │  Scrape 6AM/6PM UTC          │
                    │  Ghost check every 6h        │
                    │  SLA enforcement daily       │
                    │  Embedding warmup daily       │
                    └──────────┬──────────────────┘
                               │ HTTP POST + CRON_SECRET
                               ▼
┌──────────────┐    ┌──────────────────────────────────────┐    ┌──────────────┐
│   Vercel     │    │         Express API Server            │    │   Supabase   │
│  CDN/Edge    │◄──►│  standalone-server.js / api/index.js  │◄──►│  PostgreSQL  │
│  (Static)    │    │                                      │    │  + Auth      │
└──────────────┘    │  Middleware stack:                     │    │  + Storage   │
                    │    helmet → cors → rate-limit         │    └──────────────┘
                    │    → request-tracing → metrics        │         ▲
                    │    → auth (JWT HS256) → routes        │         │
                    │                                      │    ┌──────────────┐
                    │  Services layer:                       │    │   Upstash    │
                    │    exam · resume · stripe · agent     │◄──►│    Redis     │
                    │    job-ingestion · embedding · ats    │    │  (Rate lim,  │
                    │                                      │    │   cache)     │
                    │  AI layer:                             │    └──────────────┘
                    │    Groq (Llama 3) · Gemini fallback    │
                    │    @xenova/transformers (embeddings)   │
                    │    Tesseract OCR · Skill Intelligence  │
                    └──────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
          ┌──────────────────┐  ┌──────────────────┐
          │   WebSocket      │  │   External APIs   │
          │   (ws://host/ws)  │  │   Greenhouse      │
          │   Notifications  │  │   Lever · Ashby   │
          │   Chat messages  │  │   Workday · JSearch│
          └──────────────────┘  └──────────────────┘
```

**Key design decisions:**
- **Monorepo, single Express process** — simplifies deployment, keeps latency low
- **Serverless-ready** — `api/index.js` wraps Express for Vercel; background services auto-disable on serverless
- **No external LLM on hot path** — all job scoring is synchronous application code (no API calls during page load)
- **Multi-layered AI fallback** — every AI feature degrades gracefully (Groq → Gemini → rule-based)

---

### Slide 2: Frontend Architecture

**Stack:** React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + shadcn/ui + wouter + TanStack Query v5

**Routing (wouter — 2KB alternative to React Router):**
| Path | Component | Guard |
|------|-----------|-------|
| `/` | Landing (YC-style) | None |
| `/candidate-dashboard` | Tabs: Jobs / Saved / Applications / Profile | `role=candidate` |
| `/talent-dashboard` | Sub-modules: Overview / Jobs / Candidates / Analytics | `role=talent_owner` |
| `/exam/:jobId` | Exam taking with timer | Candidate only |
| `/admin` | Unified panel: Overview / Metrics / Errors / Invites | Password-gated |
| `/chat` | Real-time messaging | Authenticated |

**State management pattern — no Redux/Zustand:**
- **Server state:** TanStack Query v5 — all server data cached, auto-refetched
- **UI state:** React `useState` / `useReducer` — form state, UI toggles
- **Auth state:** `useSessionContext()` from Supabase (not `useSession()` — avoids false loading redirects)
- **Cache discipline:** `removeQueries` for destructive operations (skill clear, logout), `invalidateQueries` for normal sync

**Key client-side optimization:**
- Job feed fetches all matches once, filters in `useMemo` — zero network calls on filter change
- Auto-retry with exponential backoff when matches return empty (backend still computing embeddings)
- 5-minute background refetch interval (staleTime: 0, refetchInterval: 300000)
- Metrics tab lazy-loaded via `React.lazy()` + `Suspense`
- Idle watcher auto-logs out after 30 min inactivity with 60s warning modal

**Profile wizard flow (multi-step controlled by step state):**
1. Upload resume → server parses with Groq → returns extracted data
2. Review extracted skills → confirm or edit inline
3. Set job preferences (location, work type, salary range)
4. "Clear all" button wipes skills and returns to step 1

---

### Slide 3: Backend Architecture

**Entry points:**
- **Dev:** `standalone-server.js` → `server/index.ts` → Express + WebSocket on port 5000
- **Production:** `api/index.js` → Vercel serverless handler wrapping same Express app
- **Docker:** Multi-stage build (`node:22-alpine`), health check on `/api/health`

**Request lifecycle:**
```
Incoming request
  → Helmet security headers
  → CORS check (FRONTEND_URL, *.vercel.app, chrome-extension://)
  → express-rate-limit (100 req/15min global, 10 req/15min auth)
  → Stripe webhook raw body parser (conditional on path)
  → JSON/URL-encoded body parsers (1MB limit)
  → Cookie parser
  → Sentry request tracing
  → Metrics sampling (20% → request_metrics table)
  → Auth middleware (JWT HS256 verification)
  → Route handler → storage layer → response
  → Error handler (fingerprint → error_events table)
```

**The routes file** (`server/routes.ts`, 3034 lines) registers all API routes. Every route delegates to the storage layer (`server/storage.ts`, 3048 lines) which implements the `IStorage` interface — a repository pattern with 80+ methods for all database operations. Routes never use Drizzle directly.

**Storage layer pattern:**
```typescript
interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getJobRecommendations(userId: string): Promise<JobMatch[]>;
  // ... 80+ methods
}
class DatabaseStorage implements IStorage { /* Drizzle queries */ }
export const storage = new DatabaseStorage();
```

---

### Slide 4: Database Schema (35 Tables)

**Source of truth:** `shared/schema.ts` (1004 lines)

**Core entities and their relationships:**
```
users (1) ──→ (1) candidate_users         # Extended candidate profile
users (1) ──→ (1) talent_owner_profiles   # Company profile
users (1) ──→ (*) job_applications        # Applications with status lifecycle
users (1) ──→ (*) job_matches              # AI match records with scores
users (1) ──→ (*) exam_attempts            # Exam results with rankings
users (1) ──→ (*) notifications            # In-app + email notifications
users (1) ──→ (*) saved_jobs / hidden_jobs # Bookmarks and dismissals
users (1) ──→ (*) agent_tasks             # Agent Apply job queue

job_postings (1) ──→ (1) job_exams         # Auto-generated exams
job_postings (1) ──→ (*) job_applications
job_postings (1) ──→ (*) job_matches
job_postings (1) ──→ (*) chat_rooms        # Exam-gated messaging
```

**Key schema features:**
- **pgvector extension** — native 384-dim vector column for ANN retrieval on both `candidate_users` and `job_postings`
- **Composite unique constraints** — deduplicates external jobs (`externalId + source`) and prevents duplicate applications
- **Partial indexes** — `idx_job_active_feed` on `(status, source, createdAt)` for the most frequent query
- **Liveness + ghost job fields** — `livenessStatus`, `ghostJobScore`, `ghostJobStatus`, `ghostJobReasons`

**Platform operations tables:**
- `subscription_tiers` / `user_subscriptions` — Stripe billing integration
- `daily_usage_limits` — per-user rate caps (3 resume uploads, 5 job posts, 20 apps/day)
- `error_events` — in-house Sentry replacement with MD5 fingerprint dedup
- `request_metrics` — 20% sampled request performance data
- `match_signals` — candidate×job interaction data for ML feedback loop
- `scoring_weights` — persisted learned weights from the weight tuner
- `invite_codes` / `invite_code_redemptions` — invite-only signup gate
- `discovered_companies` — auto-discovered ATS companies
- `connection_status` — WebSocket connection tracking

---

### Slide 5: AI Pipeline — Resume Parsing

**Goal:** Extract structured data (name, skills, experience, education) from uploaded resumes

**4-layer fallback chain** (`server/ai-resume-parser.ts`, 1320 lines):
```
1. unpdf ──→ Fast text extraction (text-based PDFs)
       ⬇ (if text too thin or corruption detected)
2. Corruption Detection ──→ Detects broken ToUnicode CMap (first char stripping)
     Uses section markers as fingerprint → counts clean vs dropped variants
       ⬇ (if corruption confirmed)
3. Tesseract OCR ──→ Image-based extraction via tesseract.js
       ⬇ (if Groq available)
4. Groq (Llama 3) ──→ Structured JSON extraction with prompt-engineered schema
       ⬇ (if Groq fails)
5. Gemini multimodal ──→ PDF/image analysis fallback
       ⬇ (if all AI fails)
6. Skill Intelligence Engine ──→ Rule-based regex fallback (400+ skill aliases)
```

**Extraction schema:**
```typescript
interface AIExtractedData {
  personalInfo: { name, email, phone, location, linkedin, github, portfolio };
  summary: string;
  skills: { technical: string[], soft: string[], tools: string[] };
  experience: { totalYears, level, positions: [{ title, company, duration }] };
  education: [{ degree, institution, year, gpa }];
  certifications: string[];
  projects: [{ name, description, technologies }];
  languages: string[];
}
```

**Rate limiting:** Groq calls go through `groq-limiter.ts` — priority queue (critical=exam gen, high=resume parse, medium=matching, low=scraping), token bucket (5000 tokens/min), circuit breaker (60s on 429, 5min on 3 consecutive).

**Vector embeddings:** Generated via `@xenova/transformers` (all-MiniLM-L6-v2 → 384-dim) and stored in both JSON text and native pgvector columns. `batch-embedding.service.ts` handles bulk generation.

---

### Slide 6: Matching Engine — How Job Recommendations Work

**Goal:** Return personalized job recommendations for every candidate without calling external APIs

**The pipeline** (implemented in `server/storage.ts:751-1182` and `server/job-scorer.ts:760 lines`):

```
Step 1: RETRIEVE (two parallel lanes, deduped)
  ┌─ Lane A: pgvector ANN ── Top 100 by cosine distance
  │   ORDER BY embedding <=> candidate_embedding
  │   **Note:** Job embeddings not yet backfilled — this lane returns 0 currently
  │
  └─ Lane B: Keyword union ── Top 200 by:
       skills JSONB overlap  OR  title ILIKE skill  OR  title ILIKE role-keyword
     Shared filters (both lanes):
       • status = 'active' AND not expired
       • liveness_status IN ('active', 'unknown')
       • ghost_job_score < 60 OR NULL
       • created_at > now() - 90 days (or source = platform)
       • source NOT IN aggregator list (9 known aggregators)
       • external_url NOT ILIKE aggregator URL patterns

Step 2: SCORE — scoreJob() weights
  ┌──────────────────────┬───────┬──────────────────────────────┐
  │ Component            │ Weight│ Calculation                  │
  ├──────────────────────┼───────┼──────────────────────────────┤
  │ Keyword skill match  │ 25%   │ exact + 0.5 × partial match  │
  │ Semantic embedding   │ 35%   │ 1 − cosine_dist (pgvector)   │
  │ Title/role relevance │ 25%   │ title keyword match density  │
  │ Experience level     │ 15%   │ asymmetric level multiplier  │
  │ Context bonus        │ +0-8  │ location + work type match   │
  └──────────────────────┴───────┴──────────────────────────────┘
  Weights auto-refresh from DB every 10 minutes (match_signals_weights).

Step 3: FILTER — drop matches < 30

Step 4: SOFT-RANK BOOSTS (never hard-filter)
  Salary in range:   +0.10    out: −0.05
  Work type match:   +0.10    out: −0.05
  Experience level:  +0.08    out: −0.03
  Industry match:    +0.05    no penalty

Step 5: FINAL SORT
  0.70 · matchScore/100 + 0.15 · trustScore/100 + 0.10 · recencyScore + prefBoost

Step 6: CAP at 100, paginate 20/page
```

**Match tiers:**
| Tier | Score | What it means |
|------|-------|---------------|
| `great` | ≥75 | Strong skill + role alignment |
| `good` | ≥50 | Decent match, worth applying |
| `worth-a-look` | <50 | Some relevance, may develop |
| `discovery` | N/A | No skills profile — shows top 20 non-personalized |

**Hard caps (failure-mode guards):**
- No skill overlap AND no role match → cap at 25
- With semantic signal → cap at 45 (lets strong semantic matches through)

**Feedback loop:** Every apply/save/hide action records a `match_signal` with the full feature snapshot. When exam scores arrive, they join back to the signal → labeled training data → weight tuner runs grid search to minimize MAE vs exam outcomes → updates `scoring_weights` table.

---

### Slide 7: Job Pipeline — Scraping & Ghost Detection

**Tiered scraping architecture (94+ companies):**

| Tier | ATS | Count | Method |
|------|-----|-------|--------|
| 1 | Greenhouse | 29 companies | `boards-api.greenhouse.io/v1/boards/{slug}/jobs` |
| 2 | Lever | 12 | `api.lever.co/v0/postings/{slug}` |
| 2 | Ashby | 3 | `api.ashbyhq.com/posting-api/job-board/{slug}` |
| 2 | Workday | 7 | `{company}.wd5.myworkdayjobs.com/wday/cxs/{path}/jobs` |
| 3 | Custom/scraped | 21+ | Direct career page scraping + schema.org JSON-LD |

**Dynamic company discovery** (`company-discovery.service.ts`):
- Probes unknown companies against Greenhouse/Lever/Ashby APIs
- `ats-probe.ts`: 5 concurrent probes, 200ms batch delay, Redis circuit breaker (10×429→60s pause)
- Discovered companies stored in `discovered_companies` table (pending → admin approved → runtime merge)

**Ingestion pipeline:**
```
Scraper → job-ingestion.service.ts → normalize + validate + dedupe → Drizzle insert
  • Deduplication key: (externalId, source) unique constraint
  • Trust scoring: platform=100, career_page=90, ATS=85, aggregator=50-80
  • Source filtering: 9 known aggregators excluded + 9 URL patterns
```

**Ghost job detection** (two independent signals):
1. **livenessStatus** — HTTP HEAD/GET probe every 6h; flips to `stale` on 404/410; auto-hides after 3 consecutive stale checks
2. **ghostJobScore** — Content-based detector (dormant — 0/20,704 jobs scored ≥30)

**Production feed metrics (current state):**
- 83,519 jobs in DB → 35,811 active → **20,704 pass feed filters**
- 100% direct ATS, zero aggregator residue
- Source mix: Greenhouse 13,095, Lever 3,605, Ashby 3,284
- 75% of jobs < 1 day old, 98% < 3 days old

---

### Slide 8: Exam System

**Auto-generation** (`server/services/exam.service.ts`, 281 lines):
1. Talent owner posts job with `hasExam: true`
2. Job description + requirements → Groq (Llama 3) with priority: `critical`
3. AI generates 5-10 multiple-choice questions stored in `job_exams.questions` (JSON)
4. Questions served to candidates **without** `correctAnswer` (IDOR-safe — answers never reach client)

**Submission & auto-ranking:**
```
Candidate submits → server-side score calc (compare vs stored correct answers)
  → exam_attempts record (score, passedExam, ranking)
  → auto-rankCandidatesByExamScore() for this job:
       - Sorts all attempts by score descending
       - Top N (maxChatCandidates, default 5) → qualifiedForChat = true
       - Chat rooms auto-created for qualified candidates
  → AI feedback generated for failed candidates (best-effort, 8s timeout)
  → Response deadline set: passed? → completedAt + 24h (SLA enforcement)
  → All candidates notified with their status
```

**24-hour response SLA:** `enforce-response-sla.yml` cron runs daily — auto-rejects applications where `responseDeadlineAt < now()` and status is still `submitted`/`viewed`.

---

### Slide 9: Real-Time Communication

**WebSocket server** (attached to HTTP server via upgrade):
- Connection: `ws://host/ws?token=<JWT>`
- JWT verification at upgrade time (prevents unauthenticated connections)
- Heartbeat: 30-second ping/pong with stale connection cleanup (60s timeout)
- Max 5 connections per user

**Notification delivery:**
- Instant push via WebSocket when notification created
- Long-polling fallback (30s timeout) for Vercel serverless compatibility
- Channels: application updates, exam results, chat messages, interview scheduling

**Chat system** (`server/chat-routes.ts`, 182 lines):
- Exam-gated: only top-N exam scorers get chat access
- Talent owners verify role via DB lookup (not JWT claim — unreliable)
- Server-side message sanitization: HTML stripped, `javascript:` URLs removed, event handlers stripped, 5000 char limit
- Raw SQL for joins (Drizzle 0.39 nested join bug — `chat_messages` + `users` join returns garbled data with Drizzle ORM)

---

### Slide 10: Agent Apply

**Goal:** Auto-submit candidate applications to external ATS (Greenhouse) without manual form filling

**Technology:** Pure HTTP + Playwright hybrid — uses Greenhouse Boards API for question fetching + Playwright for form submission

**Flow** (`greenhouse-submit.service.ts`, 789 lines):
```
1. Parse Greenhouse URL → extract boardToken + jobId
2. GET /v1/boards/{board}/jobs/{id}?questions=true → fetch custom questions
3. Classify each question by label pattern matching:
   work_auth, sponsorship, source, linkedin, github, website,
   location, relocate, age_confirm, etc.
4. Auto-answer classified questions from candidate profile
   (Skip: salary expectations, pronouns, free-text "tell us more")
5. Download resume from Supabase Storage
6. POST /v1/boards/{board}/jobs/{id}/applications (multipart/form-data)
7. Record application in DB + send email + in-app notification
```

**Question coverage:** 44-86% auto-answer rate across 7 tested companies

**Chrome extension** (MV3, 109 `host_permissions`):
- Injected on Greenhouse, Lever, Ashby, Workday, BambooHR, and 15+ other ATS domains
- Gemini 2.0 Flash vision analyzes form screenshots → returns structured fill actions
- Type, select, click_then_type, upload_resume, check — native value setters compatible with React/Angular/Vue
- Keyboard shortcut: `Alt+Shift+R`
- Cross-browser: Chrome and Firefox builds

---

### Slide 11: Rate Limiting & Abuse Prevention

**Three-layer rate limiting:**

| Layer | Implementation | Limits | Scope |
|-------|---------------|--------|-------|
| Global | `express-rate-limit` | 100 req/15min per IP | All endpoints |
| Auth | `express-rate-limit` | 10 req/15min per IP | `/api/auth/*` |
| Admin | `express-rate-limit` | 5 req/15min per IP | Admin endpoints |

**Groq API limiter** (`server/lib/groq-limiter.ts`, 214 lines):
- Priority queue: critical (exam) > high (resume) > medium (matching) > low (scraping)
- Token bucket: 5,000 tokens/min (conservative below Groq free tier's 6K)
- Request bucket: 25 req/min (conservative below 30 req/min)
- Circuit breaker: 60s on 429, 5min on 3 consecutive 429s
- LRU cache: 500 entries for summary dedup
- Redis-backed variant (`groq-limiter-redis.ts`) for multi-instance

**Per-user daily limits** (`daily_usage_limits` table):
- 3 resume uploads / day
- 5 job postings / day
- 20 applications / day
- Admin emails bypass all limits

**Security middleware chain:**
- Helmet: CSP, HSTS (production), X-Frame-Options: DENY
- CORS: FRONTEND_URL + *.vercel.app + chrome-extension://
- Timing-safe secret comparison (`crypto.timingSafeEqual`) for admin/cron auth
- Input sanitization: HTML stripped from string inputs

---

### Slide 12: Authentication & Authorization

**Auth flow:**
```
Browser → Supabase Auth (signUp/signIn) → JWT (HS256)
  → Express middleware verifies token via SUPABASE_JWT_SECRET
  → User attached to req.user { id, email, user_metadata }
```

**Middleware** (`server/middleware/auth.ts`, 68 lines):
1. Extract JWT from `Authorization: Bearer` header or `sb-access-token` cookie
2. Verify with `jsonwebtoken.verify(token, SECRET, { algorithms: ['HS256'] })`
3. Extract `sub` (user ID) from payload
4. Return 401 if missing/invalid, 500 if JWT_SECRET not configured

**Invite-only gate:**
- `POST /api/auth/sync` validates invite code against `invite_codes` table
- Enforces `max_uses`, records redemption in `invite_code_redemptions`
- Waitlist (`waitlist_entries`) collects emails for later invitation

**Role-based access:**
- Client: `<RoleGuard allowedRoles={['candidate']}>` wrapping protected pages
- Server: Role verified via DB lookup (not JWT claim — Supabase `user_metadata.role` is unreliable)
- Admin: Password-gated via `x-admin-secret` header + timing-safe comparison

---

### Slide 13: Observability & Monitoring

**Error tracking** (in-house — replaced Sentry):
```typescript
// server/middleware/error-handler.ts
fingerprint = MD5(message + first 3 stack frames)
→ Upsert into error_events:
    New fingerprint → insert with count=1
    Existing → increment count, update last_seen
```
- Levels: error, warning, fatal
- Weekly cleanup cron purges events > 30 days
- Admin UI: grouped by fingerprint, filterable by level, expandable stack traces

**Request metrics** (20% sampling):
- Records: method, path, status code, response time, user agent
- Stored in `request_metrics` table
- Admin dashboard shows p50/p95/p99 per endpoint, error rates, growth trends

**Analytics:** PostHog for product analytics (both client + server-side tracking)

**Database connection management:** Background services auto-disable on Vercel serverless to prevent pool exhaustion. `ENABLE_BACKGROUND_SERVICES=true` to override.

---

### Slide 14: Background Jobs (GitHub Actions)

**12 cron workflows — all authenticate via `CRON_SECRET` header:**

| Workflow | Schedule | What it does |
|----------|----------|-------------|
| `scrape-tech-companies.yml` | 6AM/6PM UTC | Scrape 94+ ATS companies (4 tiers) |
| `scrape-external-jobs.yml` | Twice daily | Adzuna, JSearch, etc. aggregation |
| `scrape-ats-jobs.yml` | Daily | ATS-specific scraping |
| `auto-hide-ghost-jobs.yml` | Every 6h | HTTP liveness probe → mark stale |
| `purge-old-jobs.yml` | Daily | Delete external jobs > 60 days |
| `discover-companies.yml` | Daily 2AM | Discover + probe 10 new companies |
| `batch-embeddings.yml` | Daily | Generate embeddings for new jobs |
| `enforce-response-sla.yml` | Daily | Auto-reject 24h+ unreviewed apps |
| `warm-candidate-matches.yml` | Daily | Pre-compute matches for active users |
| `retry-failed-parses.yml` | Daily | Re-parse failed resume extractions |
| `cleanup-errors.yml` | Weekly Sun | Purge error_events > 30 days |
| `resolve-adzuna-links.yml` | Weekly | Resolve Adzuna redirect chains |

**CI pipeline** (`.github/workflows/ci.yml`): On every push/PR: type-check → lint → test → integration tests

---

### Slide 15: Deployment Architecture

**Production (Vercel):**
```
vercel.json builds:
  api/index.js → @vercel/node (serverless, 60s maxDuration)
  package.json → @vercel/static-build (dist/public)

Rewrites:
  /api/* → api/index.js
  /*     → index.html (SPA catch-all)
```

**Build artifacts:**
```
dist/
├── public/          # Vite-built frontend (hashed JS/CSS bundles)
└── server/
    └── index.js     # esbuild-bundled server (ESM, --packages=external)
```

**Docker (multi-stage, 3 stages):**
```
base (node:22-alpine)
  → deps (npm ci --only=production)
  → builder (npm run build)
  → runner (dist + node_modules + standalone-server.js)
    USER recrutas (non-root)
    HEALTHCHECK /api/health every 30s
    EXPOSE 3000
```

**Environment switching:**
- `NODE_ENV=production` → Stripe webhook active, CSP enforced, HSTS enabled, no Vite middleware
- `NODE_ENV=test` → Server on port 5001, background services disabled, rate limiting relaxed for localhost
- Vercel detection: `process.env.VERCEL || AWS_LAMBDA_FUNCTION_NAME` → background services skip

---

### Slide 16: Payments & Subscription (Stripe)

**Integration** (`server/services/stripe.service.ts`):
- `POST /api/stripe/create-checkout` → Stripe Checkout Session → `success_url` redirect
- `POST /api/stripe/webhook` (raw body before JSON parser) → handles `checkout.session.completed`, `customer.subscription.*`
- `POST /api/stripe/portal` → Customer Portal for self-service management
- `GET /api/subscription/can-access/:feature` → Feature gate check

**Tiers:**
| Tier | Price | Limits |
|------|-------|--------|
| Starter | $49/mo | 3 active jobs |
| Growth | $149/mo | 10 active jobs + candidate discovery |
| Enterprise | $299/mo | Unlimited + priority support |

---

### Slide 17: Cost Profile & Scaling Plan

**Phase 1 (Current — all free tiers): $0/mo**

| Service | Tier | Purpose |
|---------|------|---------|
| Supabase | Free | PostgreSQL, Auth, Storage |
| Groq | Free | Llama 3 inference (rate-limited) |
| HuggingFace | Free Inference | BGE-M3 embeddings |
| Resend | Free (3K/mo) | Transactional email |
| Vercel | Hobby | Hosting + serverless |
| Upstash Redis | Free | Rate limiting, cache |
| Gemini | Free | PDF multimodal fallback |
| Firecrawl | Free (6 RPM) | JS-rendered scraping |

**Phase 2 (100-1K users): ~$65/mo** — Supabase Pro ($25) + Vercel Pro ($20) + Resend Pro ($20). Apply for Google for Startups ($350K) and Supabase for Startups ($25K).

**Phase 3 (1K-10K users):** Dedicated vector DB (Pinecone/Weaviate), Redis Pro, paid Groq tier.

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
│  server/index.ts → server/routes.ts (3034 lines)     │
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
|-----|-----------|---------|
| Frontend | React 18 + TypeScript | UI framework |
| Build | Vite | Fast dev/build |
| Routing | wouter | Lightweight client router |
| Server State | TanStack Query v5 | Cache, fetch, sync |
| Styling | Tailwind CSS + shadcn/ui | Design system |
| Backend | Express + TypeScript | API server |
| ORM | Drizzle ORM (v0.39) | Type-safe SQL queries |
| Vector DB | pgvector (PostgreSQL extension) | Native 384-dim ANN similarity search |
| Database | PostgreSQL (Supabase) | Primary data store |
| Auth | Supabase Auth + JWT | Session management |
| File Storage | Supabase Storage | Resume PDFs |
| Cache | Upstash Redis | Rate limits, match cache |
| AI — Parsing | Groq (Llama 3) | Resume → structured data |
| AI — Embeddings | `@xenova/transformers` (all-MiniLM-L6-v2) | Semantic matching |
| AI — Fallback | Gemini 2.0 Flash (Google) | PDF multimodal parsing + extension vision-based form fill |
| AI — Local | Ollama | Local LLM fallback (dev only) |
| PDF Extraction | unpdf + mammoth | Text extraction from PDF and DOCX files |
| Analytics | PostHog | Product analytics, session recording |
| Payments | Stripe (v20) | Subscription billing, Checkout, webhooks |
| Browser Extension | Chrome MV3 + Firefox | Auto-fill job applications across 20+ ATS platforms |
| Browser Automation | rebrowser-playwright | Greenhouse embed form submission (Agent Apply) |
| OCR | Tesseract.js | Resume image text extraction fallback |
| Email | Resend | Transactional email |
| Real-time | WebSocket (ws) | Notifications, chat |
| Background Jobs | Inngest + GitHub Actions | Async job processing + 12 cron workflows |
| Dev Environment | Docker Compose | PostgreSQL + Redis + App containers |
| Testing | Jest + Vitest + Playwright + Supertest | Unit, integration, E2E + API testing |
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
│   │   ├── useRoleBasedAuth.ts         # Role check utility
│   │   ├── use-idle-timeout.ts         # Idle detection for auto-logout
│   │   └── use-auth-redirect.ts        # Post-login redirect logic
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
│   ├── routes.ts                       # ALL API routes (3034 lines) — the main file
│   ├── chat-routes.ts                  # Chat-specific routes
│   ├── storage.ts                      # IStorage interface + DatabaseStorage (3048 lines)
│   ├── job-scorer.ts                   # Match scoring algorithm (weights, tiers, soft-rank boosts)
│   ├── db.ts                           # Drizzle ORM instance
│   ├── ai-service.ts                   # Legacy matching (skill cosine similarity)
│   ├── ai-resume-parser.ts             # Groq-powered resume → JSON extraction (with Gemini fallback + PDF corruption detection)
│   ├── skill-intelligence.ts           # Deterministic zero-cost fallback parser (400+ skill aliases)
│   ├── skill-normalizer.ts             # 400+ skill alias taxonomy for normalization
│   ├── resume-parser.ts                # Basic PDF/DOCX parser (mammoth + pdf-parse)
│   ├── ml-matching.ts                  # ML semantic matching (all-MiniLM-L6-v2, cosine similarity)
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
│   │   ├── candidate-embedding.service.ts # Generate candidate vector embeddings
│   │   ├── company-discovery.service.ts # Auto-discover companies with ATS
│   │   ├── apollo-discovery.service.ts  # Apollo.io company discovery (10K/mo credits)
│   │   ├── ats-detection.service.ts    # Detect which ATS a company uses
│   │   ├── sota-scraper.service.ts     # State-of-the-art scraper patterns
│   │   ├── job-refresh.service.ts      # Refresh stale job data
│   │   ├── match-signals.service.ts    # Matching weight configuration
│   │   ├── we-work-remotely.service.ts # WeWorkRemotely scraper
│   │   ├── external-jobs-scheduler.ts  # Cron scheduling logic
│   │   ├── job.service.ts              # Job CRUD operations wrapper
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

### `server/routes.ts` — All API Routes (3034 lines)

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

### `server/storage.ts` — Data Access Layer (3048 lines)

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
| `/signup/talent-owner` | Talent owner registration | No |
| `/forgot-password` | Password reset request | No |
| `/reset-password` | New password entry | No |
| `/early-access` | Early access signup | No |
| `/role-selection` | Role picker after signup | Yes |
| `/guided-setup` | Multi-step onboarding wizard | Yes |
| `/candidate-dashboard` | Candidate main page | Yes (candidate) |
| `/talent-dashboard` | Recruiter main page | Yes (talent_owner) |
| `/exam/:jobId` | Exam taking | Yes (candidate) |
| `/chat` | Messaging | Yes |
| `/admin` | Unified admin panel (Overview, Metrics, Errors, Invites tabs) | Password-gated |
| `/admin/metrics` | System metrics dashboard | Password-gated |
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

### Idle Session Management

File: `client/src/components/idle-watcher.tsx`

Automatically logs out users after 30 minutes of inactivity:
- Triggers warning modal 60 seconds before logout
- Uses `useIdleTimeout` hook for detection
- Configurable timeout and warning period

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

### Guided Setup (`guided-setup.tsx`)

Expanded onboarding flow with role-specific steps:

**For Candidates:**
- Role selection (candidate vs talent owner)
- Basic info (name, location)
- Resume upload with AI parsing
- Skills review and confirmation
- Job preferences (location, work type, salary)

**For Talent Owners:**
- Role selection
- Company profile (name, website, size, industry)
- Job posting wizard
- Pricing plan selection

Files: `client/src/components/guided-setup/`

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

Primary files: `server/storage.ts` (`fetchScoredJobs`, ~lines 751–1182) and `server/job-scorer.ts` (scoring formula, ~lines 305–510).

The `/api/ai-matches` endpoint calls `storage.getJobRecommendations` → `fetchScoredJobs`. Hybrid retrieval, multi-signal scoring, soft-preference ranking — no remote LLM calls on the hot path, all scoring is synchronous in application code.

### Pipeline

```
Candidate (skills, experience_level, location, work_type, vector_embedding, prior_titles)
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│ 1. RETRIEVE — two parallel lanes                          │
│    A. pgvector ANN — top 100 by cosine distance           │
│       (ORDER BY embedding <=> candidate_embedding)        │
│    B. Keyword union — top 200                             │
│       skills jsonb match  OR                              │
│       title LIKE skill    OR                              │
│       title LIKE role-keyword                             │
│    Merge & dedupe → up to ~300 unique jobs                │
│                                                           │
│    Shared filters (both lanes):                           │
│      status = 'active' AND not expired                    │
│      liveness_status IN ('active','unknown')              │
│      ghost_job_score < 60 OR NULL                         │
│      created_at > now() - 90 days   (or source=platform)  │
│      source NOT IN aggregator list                        │
│      external_url NOT LIKE aggregator URL patterns        │
│                                                           │
│ 2. SCORE — server/job-scorer.ts: scoreJob()               │
│    Keyword    25%   exact + 0.5·partial skill matches     │
│    Semantic   35%   1 − cosine_dist (from pgvector)       │
│    Title      25%   role/title relevance                  │
│    Experience 15%   asymmetric level multiplier           │
│    Context  +0…8    location + work-type bonus            │
│                                                           │
│    Weights load from match_signals_weights every 10 min;  │
│    fall back to the defaults above if absent.             │
│                                                           │
│    Hard caps (failure-mode guards):                       │
│      no skill overlap AND no role match → cap 25          │
│      (with semantic signal → cap 45)                      │
│                                                           │
│ 3. FILTER — drop matchScore < 30                          │
│                                                           │
│ 4. SOFT-RANK BOOSTS (from candidate.jobPreferences)       │
│    Salary in range:  +0.10  (out: −0.05)                  │
│    Work type match:  +0.10  (out: −0.05)                  │
│    Experience level: +0.08  (out: −0.03)                  │
│    Industry match:   +0.05  (no penalty)                  │
│    Soft signals — never hard-filter on preferences.       │
│                                                           │
│ 5. SORT                                                   │
│    0.70 · matchScore/100                                  │
│  + 0.15 · trustScore/100                                  │
│  + 0.10 · recencyScore                                    │
│  + prefBoost                                              │
│                                                           │
│ 6. CAP at 100. Server-paginate 20/page.                   │
└──────────────────────────────────────────────────────────┘
```

### Aggregator Filtering

Two-layer block to keep the feed direct-from-employer:

- **Source list** (`server/storage.ts:224`): `Adzuna, JSearch, Jooble, Indeed, ArbeitNow, USAJobs, RemoteOK, WeWorkRemotely, The Muse`
- **URL pattern** (`server/storage.ts:226`): `external_url ILIKE '%{pattern}%'` for 9 patterns — catches mislabeled jobs whose `source` doesn't match but whose URL points to an aggregator

### Match Tiers

| Tier | Score |
|------|-------|
| `great` | ≥75 |
| `good` | ≥50 |
| `worth-a-look` | <50 |
| `discovery` | candidate has no skills yet — non-personalized top-20 |

### Embeddings

Candidate embeddings live in `candidate_users.vector_embedding` (computed at resume-parse time). Job embeddings should live in `job_postings.embedding` (pgvector type) — generation in `services/batch-embedding.service.ts`. **As of 2026-04-28, job embeddings have not been backfilled — pgvector retrieval returns 0 rows and the keyword lane carries all retrieval.** See `docs/IMPROVEMENT_ROADMAP.md` Phase 0.1 for the activation plan.

### Legacy Path

`server/ml-matching.ts` (semantic 45 / recency 25 / liveness 20 / personalization 10 with `all-MiniLM-L6-v2` in-process) was a previous implementation approach. The current `/api/ai-matches` endpoint is served entirely by `storage.fetchScoredJobs` + `job-scorer.scoreJob`. Make changes there, not in the legacy matcher.

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

Two independent signals:

- **`livenessStatus`** — `job-liveness-service.ts` runs every 6 hours, HEAD-probes external URLs, flips to `stale` on 404/410, auto-hides after 3 consecutive stale checks.
- **`ghostJobScore`** — content-based detector in `server/ghost-job-detection.service.ts`. Feed filters out anything ≥60. **Currently dormant** (see Current State below).

### Current State (2026-04-28)

Measured snapshot of the production feed pipeline. Numbers from a single Supabase query against `job_postings`.

**Pool sizes**

- 83,519 jobs in DB total
- 35,811 active (`status='active'`, not expired)
- **20,704 pass all feed filters** — this is the candidate-facing eligible pool

**Source mix of eligible pool — 100% direct ATS, zero aggregator residue**

| Source | Count |
|---|---|
| ATS:greenhouse | 13,095 |
| ATS:lever | 3,605 |
| ATS:ashby | 3,284 |
| greenhouse | 437 |
| ATS:recruitee | 200 |
| ashby | 60 |
| lever | 14 |
| career_page | 9 |

**Filter pressure**

- Aggregator source filter strips **54,445** jobs
- Aggregator URL pattern strips another **10,341**
- Inactive `status` removes 47,708
- Dead `liveness_status` removes 44,706

**Recency**

- 75% < 1 day old
- 98% < 3 days old
- 99% < 7 days old

**Known dormant capabilities** — tracked as Phase 0 in `docs/IMPROVEMENT_ROADMAP.md` and mirrored in the Notion Bug Tracker (Recrutas OS):

| Issue | State | Severity |
|---|---|---|
| Job embeddings not populated (pgvector lane returns 0) | 0 / 20,704 jobs have embeddings | Critical |
| Ghost-job-score detector not running | 0 / 20,704 jobs scored ≥30 | High |
| Ingest cadence is bursty | 4/27 = 20,187 jobs; other days ≤ 76 | High |
| Trust-score banding is binary | 451 ≥90, **0** in 75–89, 20,302 in 50–74 | Medium |
| Keyword retrieval lacks word boundaries | 'ServiceNow' substring-hits 'Customer Service' | Low |

The current feed quality is delivered by aggregator filtering + keyword retrieval + the 30% match-score floor. The semantic retrieval lane and ghost-score detector are coded but inactive — activating them is what closes the gap between the architecture quality and the delivered experience.

---

## Resume Parsing

### Multi-Layer Architecture

The resume parser uses a 4-layer fallback chain:

1. **unpdf** — Extracts text from PDF (fast, good for text-based PDFs)
2. **Corruption Detection** — Detects broken ToUnicode CMap that strips first char from words ("Databricks" → "atabricks", "EXPERIENCE" → "XPERIENCE"). Uses section markers as fingerprint — counts clean vs dropped variants.
3. **Tesseract OCR** — Falls back to OCR when corruption detected or thin content
4. **Skill Intelligence Engine** — Rule-based fallback (400+ skill aliases, n-gram tokenization, negation detection, experience level inference)

### AI Extraction

File: `server/ai-resume-parser.ts`

- Primary: Groq (Llama 3) for structured JSON extraction
- Fallback: Gemini multimodal for PDF parsing
- Rate-limited via `groq-limiter.ts` (priority: high)

### Scripts

- `scripts/retry-failed-parses.ts` — Retries up to 3 failed parses per run using Gemini multimodal
- `scripts/check-corruption-detector.ts` — Validates corruption detection logic against live data

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
| `scrape-external-jobs.yml` | Twice daily | Cron endpoint | External job aggregation (Adzuna, JSearch, etc.) |
| `scrape-ats-jobs.yml` | Daily | Cron endpoint | ATS-specific job scraping (Greenhouse, Lever, Ashby) |
| `auto-hide-ghost-jobs.yml` | Every 6h | Cron endpoint | HTTP probe external job URLs, mark stale |
| `purge-old-jobs.yml` | Daily | Cron endpoint | Delete external jobs > 60 days old |
| `discover-companies.yml` | Daily 2AM | Cron endpoint | Discover + ATS-probe 10 new companies |
| `batch-embeddings.yml` | Daily | Cron endpoint | Generate embeddings for new jobs |
| `enforce-response-sla.yml` | Daily | Cron endpoint | Auto-reject 24h+ unreviewed applications |
| `warm-candidate-matches.yml` | Daily | Cron endpoint | Pre-compute matches for active users |
| `retry-failed-parses.yml` | Daily | Cron endpoint | Re-parse resumes that failed AI extraction |
| `cleanup-errors.yml` | Weekly Sun 6AM | Cron endpoint | Purge error_events > 30 days |
| `resolve-adzuna-searxng.yml` | Weekly | Cron endpoint | Fix Adzuna broken search links |
| `resolve-adzuna-links.yml` | Weekly | Cron endpoint | Resolve Adzuna redirect links |
| `run-migration.yml` | On demand | Drizzle | Run database migrations |
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
| `ADMIN_EMAILS` | `routes.ts` | Comma-separated admin emails (bypass daily limits) |

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
| `npm run dev:server:start` | Start backend server (persistent) |
| `npm run dev:server:stop` | Stop backend server |
| `npm run dev:server-no-watch` | Run backend without watch (for testing) |
| `npm run build` | Full production build (client + server + API handler) |
| `npm run build:server` | esbuild server bundle |
| `npm run build:api` | Generate Vercel serverless handler |
| `npm start` | Production server |
| `npm run lint` | ESLint (flat config, v9) |
| `npm run type-check` | TypeScript noEmit check |
| `npm run check` | type-check + lint |
| `npm test` | Run main test suite |
| `npm run test:all` | Run all test suites (unit + integration + frontend + e2e) |
| `npm run test:unit:backend` | Backend Jest unit tests |
| `npm run test:integration:backend` | Backend integration tests |
| `npm run test:frontend` | Frontend Vitest tests |
| `npm run test:e2e` | E2E test runner |
| `npm run test:playwright` | Playwright tests directly |
| `npm run test:playwright:ui` | Playwright UI mode |
| `npm run test:playwright:headed` | Playwright headed mode |
| `npm run test:coverage` | Test coverage report |
| `npm run db:push` | Push Drizzle schema to database |
| `npm run weekly-numbers` | Generate weekly analytics report |

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

## External APIs & Startup Credits

Recrutas consumes several external APIs. As the platform scales, startup credit programs can offset costs significantly.

### API Inventory

#### Critical Path (app breaks without these)

| Service | Purpose | Env Var | Current Tier | Monthly Cost (est.) |
|---------|---------|---------|-------------|-------------------|
| **Supabase** | Database, Auth, Storage | `SUPABASE_*`, `POSTGRES_URL` | Free | $0 (free tier) |
| **Groq** | Resume parsing, exam generation (Llama 3) | `GROQ_API_KEY` | Free | $0 (rate-limited) |
| **HuggingFace** | Semantic embeddings (BGE-M3) | `HF_API_KEY` | Free Inference API | $0 |
| **Resend** | Transactional email | `RESEND_API_KEY` | Free (3K emails/mo) | $0 |
| **Vercel** | Hosting & serverless | — | Hobby | $0 |

#### High Priority (degraded experience without these)

| Service | Purpose | Env Var | Current Tier | Monthly Cost (est.) |
|---------|---------|---------|-------------|-------------------|
| **Gemini** | PDF multimodal parsing, AI fallback | `GEMINI_API_KEY` | Free (v1beta) | $0 |
| **Firecrawl** | JS-rendered career page scraping | `FIRECRAWL_API_KEY` | Free (6 RPM) | $0 |
| **JSearch (RapidAPI)** | External job aggregation | `RAPIDAPI_KEY` | Free | $0 |
| **Upstash Redis** | Distributed rate limiting, cache | `UPSTASH_REDIS_*` | Free | $0 |
| **Inngest** | Background jobs (match warming, SLA) | `INNGEST_EVENT_KEY` | Free (50K exec/mo) | $0 |
| **Apollo.io** | Company discovery (10K credits/mo) | `APOLLO_API_KEY` | Free | $0 |

#### Job Sources (no API key needed)

| Source | Type | Trust Score |
|--------|------|-------------|
| Greenhouse boards API | ATS scraper | 90 |
| Lever postings API | ATS scraper | 85 |
| Ashby jobs API | ATS scraper | 85 |
| Workable widget API | ATS scraper | 80 |
| Recruitee offers API | ATS scraper | 80 |
| RemoteOK | Public API | 65 |
| The Muse | Public API | 70 |
| WeWorkRemotely | RSS/scraping | 80 |

#### Optional / Future

| Service | Purpose | Env Var | Status |
|---------|---------|---------|--------|
| **Stripe** | Payments & subscriptions | `STRIPE_SECRET_KEY` | Wired but disabled |
| **PostHog** | Product analytics | `POSTHOG_API_KEY` | Active |
| **Pinecone** | Vector DB for embeddings at scale | `PINECONE_*` | Not active |
| **Weaviate** | Alternative vector DB | `WEAVIATE_*` | Not active |
| **Ollama** | Local LLM fallback | `OLLAMA_URL` | Dev only |

### Startup Credit Programs

Programs to apply for as the platform scales. Sorted by estimated value.

| Program | Credits | Requirements | Apply |
|---------|---------|-------------|-------|
| **Google for Startups (AI)** | Up to $350K over 2yr | AI-first startup, GCP account, business email | [cloud.google.com/startup/apply](https://cloud.google.com/startup/apply) |
| **Cloudflare for Startups** | Up to $250K | Startup | [cloudflare.com/forstartups](https://www.cloudflare.com/forstartups/) |
| **Microsoft Founders Hub** | $5K–$150K Azure | No application for $5K; investor-backed for $150K | [microsoft.com/startups](https://www.microsoft.com/en-us/startups) |
| **AWS Activate** | $1K–$100K | Pre-Series B, company website | [aws.amazon.com/startups/credits](https://aws.amazon.com/startups/credits) |
| **Supabase for Startups** | Up to $25K | Via partner channels (Mercury, AWS Activate) | [supabase.com/solutions/startups](https://supabase.com/solutions/startups) |
| **Groq Partner Program** | $10K inference credits | Hand-selected; 90-day expiry | [groq.com/groq-partner-program](https://groq.com/groq-partner-program) |
| **Pinecone for Startups** | $5K + Standard tier | Business email, company website | [pinecone.io/startup-program](https://www.pinecone.io/startup-program/) |
| **Vercel OSS Program** | $3,600/yr | Open-source project (reopens Apr 2026) | [vercel.com/open-source-program](https://vercel.com/open-source-program) |
| **Stripe Atlas** | $2.5K Stripe + $50K partner perks | $500 incorporation fee | [stripe.com/atlas](https://stripe.com/atlas) |
| **Firecrawl Creator/OSS** | Free Standard plan | Creators & OSS maintainers; 24-48hr review | [firecrawl.dev/creator-oss-program](https://www.firecrawl.dev/creator-oss-program) |
| **Upstash OSS Program** | $1K/mo covered | Open-source project using Upstash | [upstash.com/open-source](https://upstash.com/open-source) |
| **GetAIPerks** | Up to $7M across 200+ tools | Startup | [getaiperks.com](https://www.getaiperks.com/en) |

### Scaling Plan

**Phase 1 (Current — Free tiers):** All services on free/hobby tiers. Total cost: $0/mo.

**Phase 2 (100–1K users):** Supabase Pro ($25/mo), Vercel Pro ($20/mo), Resend Pro ($20/mo). Apply for Google for Startups ($350K) and Supabase for Startups ($25K) before this phase.

**Phase 3 (1K–10K users):** Dedicated vector DB (Pinecone/Weaviate), Redis Pro, paid Groq tier. Apply for AWS Activate and Firecrawl OSS program. Consider Stripe Atlas for incorporation + partner perks.

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
