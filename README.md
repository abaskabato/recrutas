<p align="center">
  <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iMyIgZmlsbD0iIzEwMjk4MSIgLz48cmVjdCB4PSI3IiB5PSI1IiB3aWR0aD0iNSIgaGVpZ2h0PSIyMiIgZmlsbD0id2hpdGUiIC8+PHJlY3QgeD0iMTIiIHk9IjUiIHdpZHRoPSI5IiBoZWlnaHQ9IjUiIGZpbGw9IndoaXRlIiAvPjxyZWN0IHg9IjE5IiB5PSI1IiB3aWR0aD0iNSIgaGVpZ2h0PSIxMSIgZmlsbD0id2hpdGUiIC8+PHJlY3QgeD0iMTIiIHk9IjExIiB3aWR0aD0iNyIgaGVpZ2h0PSI1IiBmaWxsPSJ3aGl0ZSIgLz48cmVjdCB4PSIxNCIgeT0iOCIgd2lkdGg9IjMiIGhlaWdodD0iNSIgZmlsbD0iIzEwMjk4MSIgLz48cmVjdCB4PSIxNSIgeT0iMTYiIHdpZHRoPSI1IiBoZWlnaHQ9IjUiIGZpbGw9IndoaXRlIiAvPjxyZWN0IHg9IjE5IiB5PSIyMSIgd2lkdGg9IjUiIGhlaWdodD0iNiIgZmlsbD0id2hpdGUiIC8+PC9zdmc+" width="120" alt="Recrutas Logo" />
</p>

# Recrutas - AI-Powered Hiring Platform

Recrutas is a full-stack recruitment platform that connects job seekers with opportunities through AI-powered matching, resume parsing, and intelligent job aggregation. The platform targets two user personas:

- **Candidates**: Job seekers who want personalized job recommendations, easy applications, and transparency into application status
- **Talent Owners**: Recruiters and hiring managers who need to post jobs, screen candidates, and manage applicants

**Mission**: "Apply here, know where you stand today"

## Quick Start

### Prerequisites
- Node.js 20.x
- npm 10+
- Supabase account (PostgreSQL + Auth)
- Optional: Groq API key (for AI resume parsing)

### Installation
```bash
git clone <repository-url>
cd recrutas
npm install
```

### Environment Setup
```bash
cp .env.example .env
```

Required variables in `.env`:
```
# Database (from Supabase dashboard)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase Auth
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# App URLs
FRONTEND_URL=http://localhost:5173
PORT=5000

# Security (generate with: openssl rand -base64 32)
DEV_SECRET=your-dev-secret
ADMIN_SECRET=your-admin-secret
CRON_SECRET=your-cron-secret
```

Optional (for AI features):
```
GROQ_API_KEY=your-groq-key
OPENAI_API_KEY=your-openai-key
```

### Database Setup
```bash
npm run db:push
```

### Running the Application

**Development (both frontend + backend):**
```bash
npm run dev:all
```

**Frontend only:**
```bash
npm run dev
```

**Backend only:**
```bash
npm run dev:server
```

**Seed database with test data:**
```bash
curl -X POST http://localhost:5000/api/dev/seed -H "x-dev-secret: your-dev-secret"
```

Access the app at `http://localhost:5173`

Test credentials (after seeding):
- Candidate: `john.dev@email.com`
- Recruiter: `recruiter@techcorp.com`

---

## Architecture Overview

### High-Level System Diagram

```
                                    +------------------+
                                    |   PostgreSQL     |
                                    |  (Supabase)      |
                                    +--------+---------+
                                             |
                                    +--------v---------+
                                    |  Express API    |
                                    |  (server/index) |
                                    +--------+--------+
                                             |
        +----------------+                    |                    +----------------+
        | GitHub Actions |                    |                    |   Vercel       |
        | (Scraper)      |--------------------+                    |   (Frontend)   |
        +----------------+                                         +--------+--------+
               |                                                           |
               | 6AM/6PM UTC                                             |
               v                                                           v
+-------------+-------------+                     +-------------------+-------------------+
|  Tier 1: Greenhouse   |                     |                   |                   |
|  (29 companies)       |                     |   Browser         |   WebSocket       |
|  Tier 2: Lever/Workday|                     |   (React SPA)     |   Notifications   |
|  (22 companies)       |-------------------->|   wouter         |   Real-time       |
|  Tier 3: Custom       |                     |   TanStack Query |                   |
|  (21 companies)       |                     |                   |                   |
+-----------------------+                     +-------------------+-------------------+
                                                      |
                                                      v
                                        +---------------------------+
                                        |    Vite Dev Proxy        |
                                        |  (proxies /api to 5000)  |
                                        +---------------------------+
```

### Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | SPA with Vite bundler |
| Routing | wouter | Lightweight React router |
| State | TanStack Query | Server state management |
| Styling | Tailwind CSS + shadcn/ui | Component library |
| Backend | Express + TypeScript | REST API |
| Database | PostgreSQL (Supabase) | Primary data store |
| ORM | Drizzle | Type-safe database queries |
| Auth | Supabase Auth | JWT-based authentication |
| Real-time | WebSockets | Live notifications |
| AI/ML | Groq + Transformers | Resume parsing, job matching |
| ML Embeddings | @xenova/transformers | Local sentence embeddings (SOTA) |
| Learn-to-Rank | Custom (10 features) | Job ranking with online learning |
| Payments | Stripe | Subscription management |
| Scrape | GitHub Actions + Custom | Job aggregation |

### SOTA ML Architecture

Recrutas uses **state-of-the-art open-source ML** for job matching:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SOTA Job Matching Pipeline                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Embeddings: @xenova/transformers (all-MiniLM-L6-v2)           │
│     - 384-dim sentence embeddings                                   │
│     - Runs locally (no external API needed)                         │
│     - Pre-computed nightly via GitHub Actions                       │
│                                                                      │
│  2. Vector Search: In-memory (default) or Pinecone/Weaviate        │
│     - Cosine similarity for semantic matching                       │
│     - Hybrid search (dense + keyword) optional                     │
│                                                                      │
│  3. Learn-to-Rank: 10-feature ranking model                         │
│     - Semantic similarity, skill match, experience, location,       │
│       work type, salary, company trust, recency, engagement         │
│     - Online learning from candidate interactions                   │
│                                                                      │
│  4. Fast Match: Pre-computed embeddings in PostgreSQL              │
│     - Cosine similarity only (no ML inference at runtime)           │
│     - Instant responses                                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**100% Free** - No paid external APIs required for MVP.

---

## Project Structure

```
recrutas/
├── api/                          # Vercel serverless function
│   ├── index.js                  # Entry point for Vercel
│   └── cron/
│       └── scrape-external-jobs.ts
├── client/                       # React frontend
│   ├── src/
│   │   ├── components/          # Feature components + shadcn/ui
│   │   │   ├── ui/             # shadcn/ui primitives (don't modify)
│   │   │   └── *.tsx           # Feature components
│   │   ├── contexts/           # React Context providers
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities (auth, API client, utils)
│   │   ├── pages/              # Route pages
│   │   ├── types/              # TypeScript type definitions
│   │   ├── App.tsx            # Root component with routing
│   │   └── main.tsx           # Entry point
│   ├── public/                 # Static assets
│   └── vite.config.ts          # Vite configuration
├── server/                       # Express backend
│   ├── index.ts                # Express app configuration
│   ├── routes.ts               # All API routes
│   ├── storage.ts              # Database storage layer (IStorage interface)
│   ├── db.ts                   # Drizzle database instance
│   ├── middleware/
│   │   └── auth.ts             # JWT authentication middleware
│   ├── services/               # Business logic services
│   │   ├── resume.service.ts   # Resume upload + AI parsing
│   │   ├── exam.service.ts     # Job exam management
│   │   ├── stripe.service.ts   # Payment processing
│   │   ├── job.service.ts      # Job CRUD operations
│   │   ├── batch-embedding.service.ts  # Pre-compute job embeddings
│   │   └── external-jobs-scheduler.ts
│   ├── notification-service.ts # Real-time notifications
│   ├── advanced-matching-engine.ts  # SOTA matching with LTR
│   ├── ml-matching.ts          # @xenova/transformers embeddings
│   ├── vector-search.ts        # Vector DB (Pinecone/Weaviate/in-memory)
│   ├── learn-to-rank.ts        # 10-feature ranking model
│   ├── ai-service.ts           # AI job matching
│   ├── ai-resume-parser.ts     # Resume parsing with Groq
│   ├── company-jobs-aggregator.ts
│   ├── job-aggregator.ts       # Job aggregation (RemoteOK, etc.)
│   └── scraper-v2/             # Job scraping infrastructure
├── shared/                      # Shared code between frontend/backend
│   └── schema.ts              # Drizzle ORM schema + Zod schemas
├── scripts/                     # Build and utility scripts
│   └── scrape-tier.ts          # Tiered company scraper
├── drizzle/                     # Drizzle migrations
├── .github/
│   └── workflows/
│       ├── scrape-tech-companies.yml  # Job scraping (2x/day)
│       └── batch-embeddings.yml      # Embedding computation (daily)
├── standalone-server.js         # Dev/Docker server entry point
├── api/index.js                 # Vercel serverless handler
├── vercel.json                  # Vercel configuration
├── Dockerfile                   # Multi-stage Docker build
└── package.json                 # Root package.json (workspaces)
```

---

## Server Deep Dive

### Entry Points

**1. standalone-server.js** (Development + Docker)
- Loads environment from `.env`
- Calls `configureApp()` from `server/index.ts`
- Creates HTTP server with WebSocket support for notifications
- Graceful shutdown handling
- Listens on port 5000 (or 5001 for tests)

**2. api/index.js** (Vercel serverless)
- Imports compiled Express app from `dist/server/index.js`
- Wraps Express in Vercel serverless handler
- 50-second timeout for long-running requests

### Startup Sequence

When `configureApp()` runs (`server/index.ts:96`):

1. **Configure CORS** - Allow Vercel deployments, localhost, configured FRONTEND_URL
2. **Setup rate limiting** - 100 req/15min general, 10 req/15min auth
3. **Stripe webhook** - Raw body handler before express.json()
4. **Express body parsers** - JSON + URL-encoded
5. **Request tracing** - Sentry middleware for error tracking
6. **Logging middleware** - Log API requests
7. **Initialize Supabase storage** - Ensure 'resumes' bucket exists
8. **Register routes** - Call `registerRoutes(app)` from `routes.ts`
9. **Register chat routes** - WebSocket chat functionality
10. **Start background services** (if not serverless) - Company discovery, liveness, refresh
11. **Error handler** - Final error middleware

### Authentication Flow

```
Client (browser)
     |
     | 1. Supabase Auth (email/password, OAuth)
     v
Supabase Auth Service
     |
     | 2. Returns JWT access_token
     v
Client stores token in session
     |
     | 3. GET /api/auth/user
     |    Authorization: Bearer <token>
     v
server/middleware/auth.ts:isAuthenticated()
     |
     | - Extract token from Authorization header or cookies
     | - Verify JWT signature using SUPABASE_JWT_SECRET
     | - Decode payload, extract user.id (sub)
     v
     |
     | 4. Attach user to req.user
     v
Express route handler receives req.user
```

### API Route Map

#### Authentication
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/user` | GET | Required | Get current user |
| `/api/auth/role` | POST | Required | Set user role (candidate/talent_owner) |

#### Candidate Operations
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/candidate/profile` | GET | Required | Get candidate profile |
| `/api/candidate/profile` | POST | Required | Create/update profile |
| `/api/candidate/resume` | POST | Required | Upload resume (multipart) |
| `/api/candidate/stats` | GET | Required | Application statistics |
| `/api/candidate/applications` | GET | Required | List applications |
| `/api/candidate/saved-jobs` | GET/POST/DELETE | Required | Save/unsave jobs |
| `/api/candidate/apply/:jobId` | POST | Required | Apply to job |

#### Talent Owner Operations
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/talent-owner/jobs` | GET | Required | List own job postings |
| `/api/talent-owner/profile` | GET | Required | Get talent owner profile |
| `/api/talent-owner/profile/complete` | POST | Required | Complete onboarding |
| `/api/jobs` | POST | Required | Create job posting |
| `/api/jobs/:jobId` | PUT/PATCH/DELETE | Required | Manage job |
| `/api/jobs/:jobId/applicants` | GET | Required | List applicants |
| `/api/jobs/:jobId/discovery` | GET | Required | Find matching candidates |

#### Job Discovery & Matching
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ai-matches` | GET | Required | Personalized job feed |
| `/api/advanced-matches/:candidateId` | GET | Required | Advanced matching |
| `/api/external-jobs` | GET | Public | Aggregated external jobs |

#### Exams & Screening
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/jobs/:jobId/exam` | GET | Required | Get exam for job |
| `/api/jobs/:jobId/exam/submit` | POST | Required | Submit exam answers |
| `/api/jobs/:jobId/screening-questions` | GET/POST | Required | Manage questions |

#### Interviews
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/interviews/schedule` | POST | Required | Schedule interview |

#### Notifications
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/notifications` | GET | Required | List notifications |
| `/api/notifications/count` | GET | Required | Unread count |
| `/api/notifications/:id/read` | POST | Required | Mark as read |
| `/api/notifications/poll` | GET | Required | Long-polling endpoint |
| `/ws` | WebSocket | Required | Real-time notifications |

#### Payments (Stripe)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/subscription/status` | GET | Required | Get subscription |
| `/api/subscription/tiers` | GET | Public | List pricing tiers |
| `/api/stripe/create-checkout` | POST | Required | Create checkout session |
| `/api/stripe/portal` | POST | Required | Customer portal |
| `/api/stripe/webhook` | POST | None | Stripe webhooks |

#### AI Features
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ai/screening-questions` | POST | Required | Generate AI questions |

#### Admin
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/dev/seed` | POST | Dev only | Seed database |
| `/api/admin/init-subscription-tiers` | POST | Admin | Initialize Stripe tiers |
| `/api/cron/scrape-external-jobs` | POST | Cron | Trigger scraping |
| `/api/admin/run-ghost-job-detection` | POST | Admin | Run ghost job detection |

### Storage Layer Pattern

The storage layer follows the **Repository Pattern** with an interface:

**Interface** (`server/storage.ts:72+-100`):
```typescript
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // ... many more methods
}
```

**Implementation** (`server/storage.ts`):
- Uses Drizzle ORM for type-safe queries
- All methods are async/Promise-based
- Exports singleton `storage` instance

**Usage in routes**:
```typescript
import { storage } from './storage';

app.get('/api/jobs/:id', async (req, res) => {
  const job = await storage.getJobPosting(parseInt(req.params.id));
  res.json(job);
});
```

### Services Breakdown

| Service | File | Purpose | Key Methods |
|---------|------|---------|--------------|
| Resume | `services/resume.service.ts` | Upload, parse, store resumes | `uploadAndProcessResume()` |
| Exam | `services/exam.service.ts` | Create/submit job exams | `submitExam()` |
| Stripe | `services/stripe.service.ts` | Subscriptions, checkout | `createCheckoutSession()`, `handleWebhook()` |
| Job | `services/job.service.ts` | Job CRUD with validation | `createJob()`, `updateJob()` |
| External Jobs | `services/external-jobs-scheduler.ts` | Background scraping | `triggerScrape()` |
| Notification | `notification-service.ts` | Real-time + polling | `createNotification()`, `pollNotifications()` |
| AI | `ai-service.ts` | Job matching, screening | `generateJobMatch()` |
| Resume Parser | `ai-resume-parser.ts` | Extract info from resumes | `parseResume()` |
| Matching | `advanced-matching-engine.ts` | Personalized recommendations | `getPersonalizedJobFeed()` |

---

## Client Deep Dive

### Routing (wouter)

Routes defined in `client/src/App.tsx:26-65`:

```typescript
<Switch>
  <Route path="/" component={Landing} />
  <Route path="/auth" component={AuthPage} />
  <Route path="/signup/candidate" component={SignUpCandidatePage} />
  <Route path="/signup/talent-owner" component={SignUpTalentPage} />
  <Route path="/role-selection">
    <AuthGuard><GuidedSetup /></AuthGuard>
  </Route>
  <Route path="/candidate-dashboard">
    <RoleGuard allowedRoles={['candidate']}><CandidateDashboard /></RoleGuard>
  </Route>
  <Route path="/talent-dashboard">
    <RoleGuard allowedRoles={['talent_owner']}><TalentDashboard /></RoleGuard>
  </Route>
  <Route path="/exam/:id">
    <RoleGuard><ExamPage /></RoleGuard>
  </Route>
  <Route path="/chat/:id">
    <RoleGuard><Chat /></RoleGuard>
  </Route>
</Switch>
```

**Route Guards**:
- `AuthGuard` - Requires authentication
- `RoleGuard` - Requires specific role(s)

### Auth Flow (Client)

```
1. User signs up/login via Supabase Auth
   - Uses @supabase/auth-helpers-react SessionContextProvider
   - Stores session in browser

2. API requests include JWT token:
   client/src/lib/queryClient.ts:apiRequest()
   
   const { data: { session } } = await supabase.auth.getSession();
   headers['Authorization'] = `Bearer ${session?.access_token}`;

3. Server validates token in middleware/auth.ts
   - Returns 401 if missing/invalid
   - Attaches req.user for route handlers
```

### State Management

**Server State** (TanStack Query):
- `useQuery` for data fetching with caching
- `useMutation` for data mutations with cache invalidation
- Query keys: `['jobs', filters]`, `['candidate', 'profile']`, etc.

**UI State**:
- `useState` for local component state
- React Context for cross-component state:
  - `GuidedSetupContext` - Onboarding flow state
  - `AppProviders` - Query client, theme, etc.

### API Call Pattern

Use `apiRequest` helper from `client/src/lib/queryClient.ts`:

```typescript
import { apilib/queryClient';

//Request } from '@/ GET request
const response = await apiRequest('GET', '/api/candidate/profile');
const profile = await response.json();

// POST request
const response = await apiRequest('POST', '/api/jobs', jobData);
const job = await response.json();

// FormData (file upload)
const formData = new FormData();
formData.append('resume', file);
const response = await apiRequest('POST', '/api/candidate/resume', formData);
```

### Component Architecture

**Layer 1: Pages** (`client/src/pages/`)
- Full-page components
- Compose feature components
- Handle routing logic

**Layer 2: Feature Components** (`client/src/components/`)
- Domain-specific UI blocks
- Examples: `job-card.tsx`, `chat-interface.tsx`, `application-tracker.tsx`

**Layer 3: shadcn/ui Primitives** (`client/src/components/ui/`)
- Low-level components (Button, Dialog, Card, etc.)
- Built on Radix UI primitives
- Styled with Tailwind CSS

---

## Database

### Drizzle ORM Schema

Single source of truth: `shared/schema.ts`

**Key Tables**:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Authentication | id (UUID), email, role, profile_complete |
| `candidate_users` | Candidate profiles | userId, skills, resumeUrl, experience |
| `talent_owner_profiles` | Recruiter profiles | userId, companyName, industry |
| `job_postings` | Job listings | talentOwnerId, title, company, status, source |
| `job_applications` | Applications | jobId, candidateId, status |
| `job_matches` | AI recommendations | jobId, candidateId, matchScore |
| `job_exams` | Screening exams | jobId, questions (JSON), timeLimit |
| `exam_attempts` | Candidate exam submissions | examId, candidateId, score |
| `chat_rooms` | Messaging | jobId, candidateId, hiringManagerId |
| `notifications` | User notifications | userId, type, read |
| `interviews` | Scheduled interviews | candidateId, jobId, scheduledAt |
| `saved_jobs` | Bookmarked jobs | userId, jobId |
| `subscription_tiers` | Pricing tiers | name, priceMonthly, features |
| `user_subscriptions` | Active subscriptions | userId, tierId, status |

**Important Constraints**:
- `job_postings`: Unique on (externalId, source) - prevents duplicate external jobs
- `job_applications`: Unique on (jobId, candidateId) - one application per job
- `chat_rooms`: Unique on (jobId, candidateId) - one chat per application

### Migration Workflow

```bash
# Make schema changes in shared/schema.ts
# Then push to database:
npm run db:push
```

Drizzle Kit handles migration generation automatically.

---

## Data Flows

### Job Pipeline

```
+----------+    +----------+    +----------+    +----------+    +----------+
| Scrape   | -> | Ingest   | -> | Dedup    | -> | Liveness | -> | Display  |
+----------+    +----------+    +----------+    +----------+    +----------+
     |               |               |               |               |
     v               v               v               v               v
GitHub Actions  job-ingestion   unique(jobId,   liveness-check   /api/ai-matches
cron/6AM+6PM   service.ts      source)         service.ts       /api/external-jobs
```

**Detailed Flow**:
1. **Scraping**: GitHub Actions runs `scripts/scrape-tier.ts` at 6AM/6PM UTC
   - Tier 1: 29 Greenhouse boards
   - Tier 2: 22 Lever/Workday boards
   - Tier 3: 21 custom career pages
   
2. **Ingestion**: `job-ingestion.service.ts` normalizes and stores jobs

3. **Deduplication**: Database unique constraint on (externalId, source)

4. **Liveness**: `job-liveness-service.ts` pings external URLs weekly

5. **Display**: Jobs appear in candidate feeds via `/api/ai-matches`

### Candidate Flow

```
+----------+    +----------+    +----------+    +----------+    +----------+
| Sign up  | -> | Resume   | -> | Profile  | -> | Matching | -> | Apply    |
+----------+    +----------+    +----------+    +----------+    +----------+
     |               |               |               |               |
     v               v               v               v               v
Supabase Auth  upload/resume    AI parses to   /api/ai-matches  /api/candidate
               .pdf/.docx      extract skills   shows relevant   apply/:jobId
                                                  jobs
```

**Detailed Flow**:
1. **Sign up**: Create Supabase Auth account, select role
2. **Resume upload**: POST to `/api/candidate/resume` with PDF/DOCX
3. **AI parsing**: Groq/Llama 3 extracts: name, email, skills, experience
4. **Profile**: Extracted data populates candidate_users table
5. **Matching**: Advanced matching engine scores jobs against skills
6. **Apply**: Creates job_applications record, notifies recruiter

### Matching Engine

The **SOTA 10-factor** weighted scoring system (`server/advanced-matching-engine.ts`):

| Factor | Weight | Description |
|--------|--------|-------------|
| Semantic Similarity | 25% | ML embeddings (all-MiniLM-L6-v2) |
| Skill Match | 20% | Overlap between candidate skills and job requirements |
| Experience Alignment | 10% | Years of experience vs job level |
| Location Fit | 8% | Geographic preference match |
| Work Type Fit | 7% | Remote/hybrid/onsite preference |
| Salary Fit | 8% | Salary range alignment |
| Company Trust | 7% | Fortune 500, verified companies |
| Recency | 8% | Freshly posted jobs |
| Engagement | 4% | Application count signals |
| Personalization | 3% | User behavior & preferences |

**Learn-to-Rank**: The model adapts based on candidate interactions (views, clicks, saves, applies).

---

## Background Services & Cron

### GitHub Actions Scraper

**Schedule**: `0 6,18 * * *` (6:00 AM and 6:00 PM UTC)

**Workflow**: `.github/workflows/scrape-tech-companies.yml`

Runs as separate jobs:
1. Tier 1: Greenhouse companies (29) - 15min timeout
2. Tier 2: Lever + Workday (22) - 10min timeout
3. Tier 3: Custom career pages (21) - 5min timeout
4. Cleanup: Remove jobs older than 15 days

### Vercel Cron

**Schedule**: `0 3 * * *` (3:00 AM UTC daily)

**Endpoint**: `/api/cron/scrape-external-jobs`

Configured in `vercel.json:43-48`

Triggers external job scraping (hiring.cafe, RemoteOK)

### GitHub Actions Batch Embeddings

**Schedule**: `0 3 * * *` (3:00 AM UTC daily)

**Workflow**: `.github/workflows/batch-embeddings.yml`

- Pre-computes vector embeddings for all active jobs
- Stores embeddings in PostgreSQL (`vector_embedding` column)
- Enables fast matching (cosine similarity only, no ML inference)
- Can be manually triggered with `--force` to refresh all

```bash
# Manual trigger
npx tsx server/services/batch-embeddings.service.ts --force
```

### In-Process Services

These run when `ENABLE_BACKGROUND_SERVICES=true` (dev mode):

| Service | File | Frequency | Purpose |
|---------|------|-----------|---------|
| Company Discovery | `company-discovery.ts` | Every 6 hours | Find new companies to scrape |
| Job Liveness | `job-liveness-service.ts` | Weekly | Verify external jobs still exist |
| Job Refresh | `services/job-refresh.service.ts` | Hourly | Update existing job data |
| External Jobs | `services/external-jobs-scheduler.ts` | Hourly | Refresh external job cache |

**Note**: Background services are disabled on Vercel serverless to prevent connection pool exhaustion.

---

## ML Matching Pipeline

### How It Works

```
1. Batch Phase (GitHub Actions - nightly)
   └── Compute embeddings for all active jobs
       └── Store in PostgreSQL (vector_embedding column)

2. Request Phase (your server)
   └── Candidate uploads resume → Skills extracted
       └── Generate candidate embedding (or use pre-computed)
           └── Fast match: Cosine similarity on stored vectors
               └── Or Full match: @xenova/transformers + Learn-to-Rank
```

### Matching Modes

| Mode | Speed | Accuracy | Use Case |
|------|-------|----------|----------|
| Fast Match | ~10ms | Good | Pre-computed embeddings available |
| Full ML | ~500ms | Best | Full semantic understanding |
| Learn-to-Rank | +100ms | Best | With behavioral signals |

### Environment Variables

```
# Required for MVP (all free)
DATABASE_URL=postgresql://...
GROQ_API_KEY=your-groq-key  # Optional - for resume parsing

# Optional (for scaling)
PINECONE_API_KEY=xxx        # Vector DB (optional)
WEAVIATE_URL=xxx            # Vector DB (optional)
```

---

## External Integrations

| Service | Purpose | Auth Method | File Location |
|---------|---------|-------------|--------------|
| Supabase | Database + Auth | API keys + JWT | `server/lib/supabase-client.ts` |
| Groq | Resume parsing (optional) | API key (GROQ_API_KEY) | `server/ai-resume-parser.ts` |
| @xenova/transformers | ML embeddings | Local (free) | `server/ml-matching.ts` |
| Pinecone/Weaviate | Vector DB (optional) | API key | `server/vector-search.ts` |
| Stripe | Payments | API keys + Webhooks | `server/services/stripe.service.ts` |
| SendGrid | Email | API key (SENDGRID_API_KEY) | `server/email-service.ts` |
| RemoteOK | Job aggregation | Public API | `server/job-aggregator.ts` |
| Hiring.cafe | Job aggregation | Public API | `server/services/hiring-cafe.service.ts` |

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (pooler) |
| `DIRECT_URL` | PostgreSQL direct connection |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (admin) |
| `SUPABASE_JWT_SECRET` | JWT verification secret |
| `FRONTEND_URL` | Frontend URL for CORS |
| `DEV_SECRET` | Secret for dev-only endpoints |
| `ADMIN_SECRET` | Secret for admin endpoints |
| `CRON_SECRET` | Secret for cron endpoints |

### Optional (AI)

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API for Llama 3 resume parsing |
| `OPENAI_API_KEY` | OpenAI for job matching |
| `HF_API_KEY` | HuggingFace for alternative parsing |

### Optional (Payments)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret |

### Optional (Email)

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | SendGrid for transactional email |

---

## Deployment

### Vercel (Primary)

**How it works**:
- Frontend: Static build in `dist/public`
- Backend: Serverless function at `/api/index.js`
- Rewrites: All `/api/*` -> serverless, all else -> static

**Build command**: `npm run build`
- Runs Vite build for frontend
- Runs esbuild for backend
- Generates API handler

**Vercel-specific files**:
- `vercel.json` - Builds, rewrites, cron
- `api/index.js` - Serverless entry point

**Cron jobs** (in vercel.json):
- Scrape external jobs daily at 3AM UTC

### Docker (Alternative)

**Multi-stage build** (`Dockerfile`):
1. **deps**: Install production npm dependencies
2. **builder**: Build the app (frontend + backend)
3. **runner**: Run the standalone server

**Build and run**:
```bash
docker build -t recrutas .
docker run -p 3000:3000 recrutas
```

**Docker Compose** (development):
```bash
docker-compose up
```

### Railway (Alternative)

Uses `railway.toml` for configuration.

---

## Testing

### Test Commands

| Command | Framework | Scope |
|---------|-----------|-------|
| `npm run test` | Jest + Vitest | All tests |
| `npm run test:unit:backend` | Jest | Backend unit tests |
| `npm run test:integration:backend` | Jest | Backend integration tests |
| `npm run test:frontend` | Vitest | Frontend unit tests |
| `npm run test:e2e` | Playwright | End-to-end tests |
| `npm run test:playwright` | Playwright | Playwright tests |
| `npm run test:coverage` | Jest | Coverage report |

### Running Single Tests

```bash
# Backend single test
npx jest test/jobs.test.ts

# Frontend single test
npx vitest run components/job-card.test.tsx

# E2E single test
npx playwright test tests/login.spec.ts
```

### Code Quality

```bash
npm run type-check    # TypeScript type checking
npm run check         # type-check + lint
```

---

## Key Files Quick Reference

| What you need | File path |
|---------------|------------|
| Database schema | `shared/schema.ts` |
| API routes | `server/routes.ts` |
| Auth middleware | `server/middleware/auth.ts` |
| Storage layer | `server/storage.ts` |
| React routing | `client/src/App.tsx` |
| API client | `client/src/lib/queryClient.ts` |
| Environment template | `.env.example` |
| Vercel config | `vercel.json` |
| Docker config | `Dockerfile` |
| GitHub scraping workflow | `.github/workflows/scrape-tech-companies.yml` |
| Drizzle config | `drizzle.config.ts` |
| Package scripts | `package.json:9-39` |
