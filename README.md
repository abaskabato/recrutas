# Recrutas — Apply Here. Know Today.

> The hiring platform where every candidate gets a same-day response.

---

## What Is This

Recrutas is a candidate-first hiring platform built around one hard promise: **if you apply, you know where you stand today.**

Internal jobs (posted directly by companies on Recrutas) work like this:
1. Company posts a job with an auto-generated skills exam
2. Candidates apply and take the exam
3. Top scorers are surfaced to the hiring manager automatically
4. **Every candidate** sees their status the same day — pass, waitlist, or not a fit

External jobs (aggregated from 94 companies across Greenhouse, Lever, Workday, and direct scrapers) are shown fresh and verified — ghost jobs and dead links are filtered out automatically.

---

## Current State (February 2026)

### What's Built and Working

| Feature | Status |
|---------|--------|
| Candidate signup + resume upload + AI parsing | ✅ Production-ready |
| Job matching (semantic + skill + recency + liveness) | ✅ Production-ready |
| Internal job posting with auto-generated exams | ✅ Production-ready |
| Exam taking, scoring, auto-ranking | ✅ Production-ready |
| Candidate ↔ hiring manager chat (exam-gated) | ✅ Production-ready |
| Real-time notifications | ✅ Production-ready |
| Application status tracker | ✅ Production-ready |
| Job scraping (94 companies, 2× daily) | ✅ Running on GitHub Actions |
| Ghost job / liveness detection | ✅ Running every 6 hours |
| Stripe subscriptions (talent owner tiers) | ✅ Production-ready |
| Mobile responsive (375px tested) | ✅ Production-ready |
| E2E test suite | ✅ 87/87 passing |

### Test Coverage

```
e2e/comprehensive-mvp.spec.ts   61/61  — core MVP flows
e2e/uncovered-flows.spec.ts     26/26  — exam, chat, mobile, resume upload
─────────────────────────────────────
Total                           87/87
```

### Recent Bug Fixes (Feb 2026)

All caught by the E2E suite — these would have silently broken real users:

- **Chat room creation always returned 403** — `req.user.role` is never populated by Supabase JWT middleware; fixed with a DB lookup to verify the role
- **Exam submit crashed with NOT NULL error** — `grantChatAccess` created a notification missing the required `title` field
- **Chat messages returned garbled data** — Drizzle ORM 0.39 nested join bug; fixed with raw SQL (same workaround used elsewhere)
- **Bad resume uploads returned 500** — Multer errors weren't caught; fixed to return proper 400 (wrong type) / 413 (too large)

---

## Go-To-Market Strategy

### The Core Wedge

The ATS black hole is the most hated thing in hiring. Candidates send applications and hear nothing. This isn't a data problem — it's a **commitment problem**. Companies don't commit to responding.

Recrutas forces the commitment structurally: the exam filters automatically, so there's no backlog for recruiters to ignore. Every candidate gets a status the same day because the system decides it, not a person.

### Phase 1 — Prove the Promise (Now → 100 candidates)

**Target**: 3–5 early-stage startups (Series A or earlier) with active engineering or ops hiring.

**Why startups, not enterprises**:
- No procurement process — hire a tool in a day
- Hiring managers ARE the decision makers; you don't deal with HR
- They hate ATS overhead
- They move fast enough to validate the promise within weeks

**Acquisition**:
- Direct outreach to hiring managers and founders at YC alumni companies
- Pitch: "Post one job, run an exam, every candidate gets a response today. We handle the filtering."
- Don't pitch HR. Pitch the person who's actively frustrated by their screening process.

**Success metric**: 1 company posts a real job, 10+ candidates apply, all get same-day responses.

### Phase 2 — Build Both Sides (100 → 1,000 candidates)

**Candidate supply**:
- Partner with 1–2 coding bootcamps (grads are motivated, time-sensitive job seekers — exactly who benefits most from same-day responses)
- Offer bootcamp a co-branded job board with guaranteed response times
- Each bootcamp cohort = 50–100 warm candidates

**Company supply**:
- Use the first 3–5 companies as case studies
- The story: "Posted on Recrutas, hired in 5 days, every candidate knew their status within 24 hours"
- Publish that story on LinkedIn and target hiring managers in adjacent companies

### Phase 3 — Word of Mouth Flywheel (1,000+ candidates)

The moat is the **candidate experience story**. Nobody talks about getting hired. Everybody talks about being treated with respect during a job search.

When candidates share "I applied to 10 jobs today, only Recrutas told me where I stood by end of day" — that's your acquisition channel. No ad spend needed.

**Monetization** (talent owners pay, candidates free forever):
- Starter $49/mo — 3 active job postings
- Growth $149/mo — 10 postings + candidate discovery
- Enterprise $299/mo — unlimited + priority support

---

## What You Should Do Next

This is ordered by impact. Do these in sequence.

### This Week

**1. Find your first company.**
Go to the YC company directory. Filter for companies that raised in 2023–2024 (actively growing, actively hiring). Find the ones posting engineering jobs on LinkedIn or Greenhouse right now. Message the founder or engineering lead directly on LinkedIn:

> "I built a hiring tool that guarantees every candidate gets a response the same day they apply — the exam filters automatically so you don't have to. Would you test it with one open role? Free for the first 90 days."

You need 1 yes. Not 5. Just 1.

**2. Prepare a live demo.**
Create a demo job with a real exam. Walk a founder through: post job → exam auto-generates → apply as a candidate → get scored → see results. The demo sells itself if the timing is right.

### Next Two Weeks

**3. Talk to a bootcamp.**
Lambda School, App Academy, Flatiron, or any local coding bootcamp. Don't pitch the platform — pitch the outcome: "Your grads apply to jobs and get ghosted. On Recrutas, they'll know where they stand the same day." Ask to run a pilot with their next graduating cohort.

**4. Get one real candidate story.**
Someone goes through: apply → exam → same-day response. Document it. Quote it. Post it. This is your most powerful piece of marketing content.

**5. Post on indie hacker / Product Hunt / LinkedIn.**
Once you have even one company and one real candidate story, post the "problem → solution → early results" narrative. The promise is differentiated enough to get traction.

### What NOT to do right now

- Don't add more features before you have paying companies
- Don't pitch enterprises or agencies
- Don't spend money on ads before you have the story proven organically
- Don't work on the "Matched For You" external jobs side — that's a commodity. Your moat is the internal jobs + same-day response promise

---

## Future Scalability Plans

### Near-Term (0 → 1,000 active users)

Everything needed for this scale is already built. No engineering required — just distribution.

| Area | Current | Needed for 1,000 users |
|------|---------|----------------------|
| DB | Supabase (free tier) | Supabase Pro ($25/mo) |
| Hosting | Vercel Hobby | Vercel Pro ($20/mo) |
| Job scraping | GitHub Actions (free) | Same |
| Email | Resend (free tier) | Same or Resend paid |
| AI parsing | Groq (free tier) | Same |

Monthly infrastructure cost at 1,000 users: **~$50–100/mo**. One paying company covers it.

### Medium-Term (1,000 → 10,000 users)

| Area | Change | Why |
|------|--------|-----|
| Vector search | Migrate from in-memory to `pgvector` in Supabase | Persistent, no cold-start on serverless |
| Background workers | Move from in-process to Railway or Render worker | Serverless can't run long background tasks |
| Job scraping | Expand from 94 → 300+ companies | Tier 3 (custom scrapers) is most fragile; use browser automation (Playwright) |
| Exam generation | Add more question types (code challenges, case studies) | Deeper filtering for technical roles |
| Resume parsing | Fine-tune on hiring data for better skill extraction | Accuracy matters at scale |

### Long-Term (10,000+ users)

| Feature | Description |
|---------|-------------|
| ATS integrations | Sync with Greenhouse/Lever so companies don't change workflow |
| Video exam responses | Short async video answers for culture-fit screening |
| Salary benchmarking | Real-time salary data surfaced to candidates on application |
| Candidate referral graph | "You know someone at this company" matching |
| Employer branding pages | Company profiles with response-rate and time-to-decision metrics (public) |
| pgvector + RAG matching | Full retrieval-augmented matching using structured resume + JD embeddings |

The platform moat compounds over time: more exam submissions → better auto-ranking models → more accurate same-day decisions → more candidates trust the platform → more companies want to be on it.

---

## Quick Start

### Prerequisites
- Node.js 20.x
- npm 10+
- Supabase account (PostgreSQL + Auth)
- Optional: Groq API key (AI resume parsing), Resend API key (email)

### Installation
```bash
git clone https://github.com/abaskabato/recrutas.git
cd recrutas
npm install
```

### Environment Setup
```bash
cp .env.example .env
```

Required variables:
```
# Database (Supabase dashboard → Settings → Database)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase Auth
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# App
FRONTEND_URL=http://localhost:5173
PORT=5000

# Security (generate: openssl rand -base64 32)
DEV_SECRET=your-dev-secret
ADMIN_SECRET=your-admin-secret
CRON_SECRET=your-cron-secret
```

Optional:
```
GROQ_API_KEY=...       # Resume AI parsing (Llama 3)
RESEND_API_KEY=...     # Transactional email
STRIPE_SECRET_KEY=...  # Payments
```

### Run

```bash
# Both frontend + backend
npm run dev:all

# Backend only
npm run dev:server

# Frontend only
npm run dev
```

Frontend: `http://localhost:5173` · API: `http://localhost:5000`

### Seed test data
```bash
curl -X POST http://localhost:5000/api/dev/seed -H "x-dev-secret: your-dev-secret"
```

---

## Architecture Overview

```
                              +------------------+
                              |   PostgreSQL     |
                              |  (Supabase)      |
                              +--------+---------+
                                       |
                              +--------v---------+
                              |  Express API     |
                              |  standalone-     |
                              |  server.js       |
                              +--------+--------+
                                       |
   +----------------+                  |                  +----------------+
   | GitHub Actions |                  |                  |   Vercel       |
   | Scraper 6AM/6PM|------------------+                  |   (Frontend)   |
   +----------------+                                     +--------+-------+
          |                                                        |
          v                                                        v
   +-----------------------+                    +----------------------------------+
   | Tier 1: Greenhouse    |                    |  React SPA (Vite)               |
   | (29 companies, API)   |                    |  wouter routing                 |
   | Tier 2: Lever/Workday |                    |  TanStack Query                 |
   | (22 companies, API)   |                    |  Tailwind + shadcn/ui           |
   | Tier 3: Custom        |                    |  WebSocket notifications        |
   | (21 companies)        |                    +----------------------------------+
   +-----------------------+
```

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript, Vite |
| Routing | wouter |
| State | TanStack Query |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Express + TypeScript |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| Auth | Supabase JWT |
| Real-time | WebSockets |
| AI/ML | Groq (resume parsing) + @xenova/transformers (embeddings) |
| Payments | Stripe |
| Email | Resend |
| Scraping | GitHub Actions + custom ATS API adapters |

---

## Matching Engine

The advanced matching engine (`server/advanced-matching-engine.ts`) scores every job against a candidate's profile using four weighted dimensions:

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Semantic similarity | 45% | all-MiniLM-L6-v2 embeddings (cosine) |
| Recency | 25% | How recently the job was posted |
| Liveness | 20% | Whether the job URL still resolves (ghost-job filter) |
| Personalization | 10% | Candidate's past interactions (saves, applies) |

Jobs are split into two feeds:
- **Apply & Know Today** — internal jobs with exams (same-day response guaranteed)
- **Matched For You** — external jobs (quality-filtered, fresh)

Minimum match threshold: 40%.

---

## Job Pipeline

```
GitHub Actions (6AM + 6PM UTC)
  └─ Tier 1: 29 Greenhouse companies (API)
  └─ Tier 2: 22 Lever/Workday companies (API)
  └─ Tier 3: 21 custom career pages
       │
       ▼
job-ingestion.service.ts
  └─ Normalize fields
  └─ Deduplicate (unique on externalId + source)
  └─ Coerce nulls, validate required fields
       │
       ▼
PostgreSQL (job_postings)
  └─ liveness check every 6h (job-liveness-service.ts)
  └─ ghost detection on stale jobs
       │
       ▼
/api/ai-matches → candidate feed
```

---

## Exam Flow

```
Talent owner posts job with hasExam: true
  └─ exam.service.ts auto-generates questions via Groq
       │
       ▼
Candidate applies → sees exam
  └─ Questions served without correctAnswer field (IDOR-safe)
       │
       ▼
Candidate submits answers
  └─ Scored immediately
  └─ rankCandidatesByExamScore() runs automatically
  └─ Top scorers granted chat access
  └─ All applicants notified of their status same day
```

---

## Chat System

Chat rooms are exam-gated:
- Only talent owners can create rooms (verified via DB lookup, not JWT claim)
- Candidates are granted access based on exam score ranking
- Messages sanitized server-side (HTML tags stripped, 5,000 char limit)
- Messages stored flat via raw SQL (Drizzle 0.39 nested join workaround)

---

## Project Structure

```
recrutas/
├── client/src/
│   ├── pages/              # Route pages (Landing, Auth, Dashboards, Exam, Chat)
│   ├── components/         # Feature components + shadcn/ui primitives
│   ├── hooks/              # Custom React hooks
│   └── lib/                # API client, auth utils
├── server/
│   ├── index.ts            # Express app configuration
│   ├── routes.ts           # All API routes
│   ├── chat-routes.ts      # Chat API routes
│   ├── storage.ts          # Database storage layer (IStorage)
│   ├── db.ts               # Drizzle instance
│   ├── middleware/auth.ts  # JWT verification
│   ├── advanced-matching-engine.ts
│   ├── job-liveness-service.ts
│   ├── email-service.ts
│   └── services/
│       ├── resume.service.ts
│       ├── exam.service.ts
│       ├── job-ingestion.service.ts
│       └── stripe.service.ts
├── shared/schema.ts        # Drizzle schema (single source of truth)
├── e2e/                    # Playwright E2E tests (87 tests)
├── scripts/scrape-tier.ts  # Tiered company scraper
├── .github/workflows/      # GitHub Actions (scraping + embeddings)
├── standalone-server.js    # Dev / Docker entry point
├── api/index.js            # Vercel serverless handler
└── vercel.json
```

---

## API Routes

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/user` | GET | Current user |
| `/api/auth/role` | POST | Set role (candidate / talent_owner) |

### Candidate
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/candidate/profile` | GET / POST | Profile CRUD |
| `/api/candidate/resume` | POST | Upload resume (PDF/DOCX, max 4MB) |
| `/api/candidate/apply/:jobId` | POST | Apply to job |
| `/api/candidate/stats` | GET | Application stats |
| `/api/ai-matches` | GET | Personalized job feed |

### Talent Owner
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs` | POST | Create job posting |
| `/api/jobs/:jobId` | PUT / DELETE | Manage job |
| `/api/jobs/:jobId/applicants` | GET | Applicant list with exam scores |
| `/api/jobs/:jobId/exam` | GET | Fetch exam |
| `/api/jobs/:jobId/exam/submit` | POST | Submit answers + auto-rank |

### Chat
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/rooms` | GET | Rooms for current user |
| `/api/chat/rooms/create` | POST | Create room (talent owner only) |
| `/api/chat/rooms/:id/messages` | GET / POST | Read / send messages |

### Payments
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/subscription/tiers` | GET | Pricing tiers |
| `/api/stripe/create-checkout` | POST | Checkout session |
| `/api/stripe/webhook` | POST | Stripe webhook |

---

## Deployment

### Vercel (live)

```bash
vercel deploy --prod
```

- Frontend: static build in `dist/public`
- Backend: serverless at `api/index.js`
- Cron: `/api/cron/scrape-external-jobs` daily at 3AM UTC

### Docker

```bash
docker build -t recrutas .
docker run -p 3000:3000 recrutas
```

---

## Testing

```bash
# Run all E2E tests
npx playwright test

# Run specific suite
npx playwright test e2e/comprehensive-mvp.spec.ts --reporter=list
npx playwright test e2e/uncovered-flows.spec.ts --reporter=list

# Type check
npm run type-check
```

Test credentials (after seeding):
- Candidate: `abaskabato@gmail.com` / `123456`
- Talent owner: `rainierit@proton.me` / `rainierit08`

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL pooler connection |
| `DIRECT_URL` | PostgreSQL direct connection |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role |
| `SUPABASE_JWT_SECRET` | JWT verification secret |
| `FRONTEND_URL` | Frontend URL (CORS) |
| `DEV_SECRET` | Dev endpoints guard |
| `CRON_SECRET` | Cron endpoints guard |

### Optional
| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Llama 3 resume parsing |
| `RESEND_API_KEY` | Transactional email |
| `STRIPE_SECRET_KEY` | Payments |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing |

---

## Changelog

### `8bd5ece` — fix: null-guard Resend client when RESEND_API_KEY missing
- Avoids crashing when email key is not set in dev

### `27351fb` — fix: 4 production bugs found during E2E coverage expansion
- Chat room creation always returned 403 (req.user.role never set by JWT middleware)
- Exam submit crashed with NOT NULL constraint on notification title
- Chat messages returned nested Drizzle objects instead of flat rows
- Resume upload returned 500 on wrong type / oversized file

### `943dc35` — fix: 5 production bugs + 61/61 E2E tests
- Rate limiter, DB pool, getApplicantsForJob (Drizzle bug), transparency_settings schema, job ingestion null fields

### `a571777` — fix: extract RemoteOK skills from description not tags

### `83ead15` — fix: repair job matching pipeline end-to-end

### `cd9bdb1` — perf: promote Skill Intelligence Engine to primary resume parser

### `e88c54f` — feat: expand Skill Intelligence Engine to all job types

### `80711b4` — feat: replace AI resume parser fallback with Skill Intelligence Engine
