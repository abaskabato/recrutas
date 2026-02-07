# Product Requirements Document (PRD)
## Job Discovery Service v1.0 (Revised)

**Author:** Architecture Discussion
**Date:** February 7, 2026
**Status:** Ready for Implementation
**Stakeholders:** Engineering Team, Product Team

---

## 1. Context & Motivation

The original PRD proposed a three-tier job discovery system but treated it as greenfield, ignoring substantial existing infrastructure. This revision:

1. Anchors every proposal to existing code (what to keep, what to extend, what's new)
2. Incorporates review decisions: GitHub Actions for scraping, real-time hiring.cafe + cache-on-read, tiered match display (40%+), two-section UX model
3. Removes redundant schema proposals (columns already exist in `shared/schema.ts`)
4. Adds the missing data transformation spec for hiring.cafe → `ExternalJobInput`
5. Fixes performance budget to reflect the parallel DB + hiring.cafe architecture
6. Reframes internal vs external as **two complementary experiences**, not a ranking competition

### 1.1 Problem Statement
Current job discovery is limited to 94 tech companies scraped via a single Vercel cron (`api/cron/scrape-external-jobs.ts`), which:
- Times out: tries to scrape 94 companies in 55s against Vercel Hobby's 60s limit
- Only serves tech workers (excludes blue-collar, hospitality, trades, healthcare)
- Lacks real-time discovery for non-tech industries
- May include stale listings (mitigated by existing `job-liveness-service.ts`)

### 1.2 Solution Overview
Implement a **two-section job discovery architecture** backed by parallel data fetching:

1. **"Apply & Know Today"** — Internal (paying employer) jobs with exam pipeline
2. **"Matched For You"** — External jobs (career page scrapes + hiring.cafe), matched to resume

### 1.3 Success Metrics
- Support any job type (not just tech)
- 100% fresh listings (≤15 days old for external, unexpired for internal)
- ≤17s response time for first-time non-tech queries; ≤2.5s for cached/tech queries
- 40%+ relevance matching threshold with tiered display
- Zero Vercel cron timeouts (scraping moved to GitHub Actions)

---

## 2. Product Positioning

### 2.1 Two Sections, Two Value Props

**Section 1: "Apply & Know Today"** — Internal (paying employer) jobs
- Employer paid to post on Recrutas → exam pipeline → score within minutes → pass/fail same day → qualified candidates get direct chat with hiring manager
- Metadata shown: `hasExam`, `examPassingScore`, `applicationCount`, `maxChatCandidates`, `expiresAt`
- CTA: "Take Exam Now" / "Apply & Get Results Today"
- **Why this is premium:** The candidate gets a definitive answer, not a black hole. The employer gets pre-screened candidates ranked by exam score. Both sides save time.

**Section 2: "Matched For You"** — External jobs (career page scrapes + hiring.cafe)
- Recrutas scraped 94+ company career pages directly, verified each job is real and active, and matched them to YOUR resume
- The candidate didn't have to search Stripe, Google, Netflix career pages themselves — Recrutas did it and found what fits
- Hiring.cafe extends coverage to any industry (hospitality, trades, healthcare) for non-tech users
- Metadata shown: source company, freshness label ("Posted 2 days ago"), verification badge ("Verified Active"), match score tier
- CTA: "Apply on Company Site"
- **Why this has value:** Real jobs from real career pages, not aggregator spam. Fresh (≤15 days). Actively verified. Matched to your specific skills.

### 2.2 No Unified Scoring Boost
Internal and external jobs are **not ranked on the same axis**. They appear in separate sections. Within each section, jobs are ranked by match score (skill overlap %) with tiered labels:

| Tier | Score Range | Display | Style |
|------|-------------|---------|-------|
| **Great Match** | 75%+ | Highlighted | Accent border/badge |
| **Good Match** | 50-74% | Normal display | Standard card |
| **Worth a Look** | 40-49% | Muted | Reduced opacity |
| Below 40% | — | Filtered out | Not shown |

---

## 3. Goals & Non-Goals

### 3.1 Goals
- [ ] Universal job coverage (tech, hospitality, trades, healthcare) via hiring.cafe
- [ ] Real-time discovery via hiring.cafe API with cache-on-read
- [ ] Strict freshness enforcement (15-day cutoff for external, expiry check for internal)
- [ ] Quality over quantity (20 highly relevant external jobs max)
- [ ] Two-section UX: internal premium + external matched
- [ ] GitHub Actions migration for long-running tech company scrapes
- [ ] Graceful degradation when hiring.cafe is unavailable

### 3.2 Non-Goals
- Real-time WebSocket updates (out of scope for v1)
- ML-based matching (use keyword/skill matching for now)
- Background job queues (use simple cache-on-read strategy)
- Unified scoring across internal and external (separate sections)

---

## 4. Technical Architecture

### 4.1 Request Flow

```
User uploads resume
       │
       ├──→ [1] Parse resume (skills, title)  ~2s
       │         └── Existing: OpenAI API, fallback to keyword extraction
       │
       ├──→ [2a] Query DB (internal + cached external jobs)  ~100ms
       │         └── Existing: storage.getJobRecommendations() (extended)
       │         └── Returns instantly, split into internal vs external
       │
       └──→ [2b] Call hiring.cafe API (2 pages, 2000 jobs)  ~10-15s
                  └── NEW: HiringCafeService
                  └── Returns discovered jobs for any industry
       │
       ▼
[3] Merge external sources + deduplicate + score + filter (40%+)  ~500ms
       │         └── Dedup by externalId + source
       │         └── Skill-overlap scoring with tier labels
       │
       ▼
[4] Cache hiring.cafe results into job_postings  (async, non-blocking)
       │         └── Existing: jobIngestionService.ingestExternalJobs()
       │         └── Next person with similar skills gets instant DB hits
       │
       ▼
[5] Return response:
    - section 1: "Apply & Know Today" (internal jobs with exam/chat metadata)
    - section 2: "Matched For You" (external jobs with freshness/source metadata)
    - match tier labels on both sections
```

- Steps 2a and 2b run **in parallel** via `Promise.all`
- Hiring.cafe results are **cached on read** into `job_postings` via `jobIngestionService` — next person with similar skills gets instant DB hits
- 15s timeout on hiring.cafe — if it fails/times out, return DB-only results (graceful degradation)

### 4.2 Fallback Strategy When Hiring.cafe Is Down
1. Return DB-only results (cached tech jobs + any previously cached hiring.cafe jobs)
2. If DB results are thin (<5 matches), also query `job-aggregator.ts` sources (JSearch, RemoteOK) as supplementary
3. Flag to user: "Showing cached results. Some sources are temporarily unavailable."

---

## 5. Existing Code Inventory

### 5.1 Reused As-Is (No Changes)

| File | What It Does | Why It Works |
|------|-------------|-------------|
| `shared/schema.ts` | `jobPostings` table definition | All needed columns exist: `source`, `externalUrl`, `expiresAt`, `trustScore`, `livenessStatus`, `hasExam`, `examPassingScore`, `maxChatCandidates`, `applicationCount`, `externalId`, `lastLivenessCheck`, `workType` |
| `server/services/job-ingestion.service.ts` | Persists external jobs with dedup by `externalId + source` | Works as-is for hiring.cafe jobs — just pass `ExternalJobInput` objects |
| `server/job-liveness-service.ts` | Background freshness validation every 6 hours | Already handles trust score management, stale detection, HTTP checks |
| `server/advanced-matching-engine.ts` | Multi-factor scoring (semantic 45%, recency 25%, liveness 20%, personalization 10%) | Used for candidate-to-job matching within each section |
| `server/job-aggregator.ts` | JSearch, RemoteOK, TheMuse, ArbeitNow fallback sources | Used as supplementary when hiring.cafe is down and DB is thin |

### 5.2 Extended (Modified)

| File | Change |
|------|--------|
| `server/storage.ts` | Extend `getJobRecommendations()` to return two-section response with match tier labels and internal job metadata |
| `server/services/sota-scraper.service.ts` | Add `scrapeSubset(tier)` method for tiered scraping from GitHub Actions |
| `vercel.json` | Repurpose single cron slot for stale job cleanup; remove scrape cron |

### 5.3 New Files

| File | Purpose |
|------|---------|
| `server/services/hiring-cafe.service.ts` | HiringCafeService: API client + data transformer for hiring.cafe |
| `.github/workflows/scrape-tech-companies.yml` | GitHub Actions workflow for tiered tech company scraping |
| `scripts/scrape-tier.ts` | CLI script invoked by GitHub Actions to scrape a specific company tier |

---

## 6. Component Specifications

### 6.1 HiringCafeService (NEW)

**File:** `server/services/hiring-cafe.service.ts`

**Purpose:** Real-time job discovery via hiring.cafe API for any industry.

**API Details:**
- Endpoint: `POST https://hiring.cafe/api/search-jobs`
- Page size: 1,000 jobs per request
- Max pages: 2 (2,000 jobs total)
- Headers: Browser-spoofed (User-Agent, Origin, Referer) — no auth required but fragile
- Request timeout: 15s total

**Request Structure:**
```json
{
  "size": 1000,
  "page": 0,
  "searchState": {
    "searchQuery": "dishwasher",
    "dateFetchedPastNDays": 15,
    "locations": [{"formatted_address": "United States"}],
    "workplaceTypes": ["Remote", "Hybrid", "Onsite"],
    "commitmentTypes": ["Full Time", "Part Time", "Contract"],
    "seniorityLevel": ["No Prior Experience Required", "Entry Level", "Mid Level"]
  }
}
```

**Response Structure:**
```json
{
  "results": [{
    "id": "job-123",
    "board_token": "company-456",
    "source": "Company Name",
    "apply_url": "https://...",
    "job_information": {
      "title": "Job Title",
      "description": "<p>HTML description...</p>"
    }
  }]
}
```

**Transformation to `ExternalJobInput`:**

| ExternalJobInput field | Source |
|----------------------|--------|
| `title` | `result.job_information.title` |
| `company` | `result.source` |
| `description` | Strip HTML from `result.job_information.description` |
| `skills` | Extract from description via keyword matching (no AI call) |
| `externalId` | `result.id` |
| `externalUrl` | `result.apply_url` |
| `source` | `'hiring-cafe'` |
| `workType` | Detect from description text ("remote", "hybrid", "on-site") |
| `location` | Extract from description or default to search location |
| `postedDate` | Current date (API pre-filters by `dateFetchedPastNDays: 15`) |
| `requirements` | Extract from description (sentence-level matching) |

**Error Handling:**
- Timeout (15s): Return empty array, let DB-only results serve the request
- API failure: Log error, return empty array (don't block other sources)
- Rate limit: Not observed yet; add exponential backoff if needed

### 6.2 SOTAScraperService Extension

**File:** `server/services/sota-scraper.service.ts` (existing)

**New Method:** `scrapeSubset(tier: 1 | 2 | 3)`

Scrapes a subset of the 94 companies based on tier:

| Tier | Companies | ATS Type | Count | Budget |
|------|-----------|----------|-------|--------|
| 1 | Greenhouse companies | API-based (fast) | 29 | 15 min |
| 2 | Lever + Workday companies | API-based + page scraping | 22 | 10 min |
| 3 | Custom career pages | AI extraction + HTML parsing | 21 | 5 min |

Uses the existing `LEGACY_COMPANIES` array, filtered by tier. Returns the same `ScrapeResult` type.

### 6.3 Storage Extension

**File:** `server/storage.ts` (existing)

**Extended Method:** `getJobRecommendations(candidateId)`

Current behavior: Returns flat array of up to 20 jobs sorted by match score.

New behavior: Returns two-section response:

```typescript
interface TwoSectionJobResponse {
  applyAndKnowToday: ScoredJob[];  // Internal jobs (source = 'platform')
  matchedForYou: ScoredJob[];       // External jobs (all other sources)
}

interface ScoredJob extends JobPosting {
  matchScore: number;
  matchTier: 'great' | 'good' | 'worth-a-look';
  skillMatches: string[];
  freshness: 'just-posted' | 'this-week' | 'recent';
  daysOld: number;
}
```

**Scoring logic:**
- Skill overlap percentage: `matchingSkills.length / max(candidateSkills.length, 1) * 100`
- Filter: only include jobs with matchScore ≥ 40
- Tier assignment: ≥75 = great, ≥50 = good, ≥40 = worth-a-look

**Freshness labels:**
- `just-posted`: ≤3 days old
- `this-week`: 4-7 days old
- `recent`: 8-15 days old

---

## 7. GitHub Actions Configuration

### 7.1 Why GitHub Actions

The existing Vercel cron (`api/cron/scrape-external-jobs.ts`) tries to scrape 94 companies in 55s and times out. Vercel Hobby plan allows **only 1 cron job** with a 60s execution limit. GitHub Actions provides:
- 30-minute timeout (vs 60s)
- Tiered execution (run companies in sequence by priority)
- Free for public repos, 2000 min/month for private

### 7.2 Workflow

**File:** `.github/workflows/scrape-tech-companies.yml`

- **Schedule:** `cron: '0 6,18 * * *'` (6 AM and 6 PM UTC)
- **Manual trigger:** `workflow_dispatch` for on-demand runs
- **Timeout:** 30 minutes
- **Steps:**
  1. Scrape Tier 1 (Greenhouse, 29 companies) — 15 min budget
  2. Scrape Tier 2 (Lever + Workday, 22 companies) — 10 min budget
  3. Scrape Tier 3 (Custom career pages, 21 companies) — 5 min budget
  4. Cleanup stale jobs (>15 days)

### 7.3 Vercel Cron Repurposed

The single Vercel cron slot is repurposed for lightweight stale job cleanup only. The `api/cron/scrape-external-jobs.ts` endpoint is kept but simplified to just expire stale jobs.

---

## 8. API Response Structure

```json
{
  "success": true,
  "data": {
    "applyAndKnowToday": {
      "jobs": [{
        "id": 123,
        "title": "Line Cook",
        "company": "Restaurant Group",
        "matchScore": 82,
        "matchTier": "great",
        "hasExam": true,
        "examPassingScore": 70,
        "applicationCount": 4,
        "maxChatCandidates": 5,
        "expiresAt": "2026-02-20T00:00:00Z",
        "source": "platform"
      }],
      "count": 3
    },
    "matchedForYou": {
      "jobs": [{
        "id": 456,
        "title": "Dishwasher",
        "company": "Hilton Hotels",
        "matchScore": 71,
        "matchTier": "good",
        "freshness": "just-posted",
        "daysOld": 2,
        "verifiedActive": true,
        "sourceDetail": "From Hilton careers page",
        "externalUrl": "https://careers.hilton.com/...",
        "source": "hiring-cafe"
      }],
      "count": 15,
      "maxShown": 20
    },
    "metadata": {
      "executionTimeMs": 12500,
      "resumeParsed": true,
      "skillsExtracted": ["food prep", "sanitation", "customer service"],
      "hiringCafeAvailable": true,
      "sourcesQueried": ["database", "hiring-cafe"]
    }
  }
}
```

---

## 9. Performance Budget

| Phase | Duration | Notes |
|-------|----------|-------|
| Resume parsing | ~2s | OpenAI API, fallback to keyword extraction |
| DB query | ~100ms | PostgreSQL, indexed by skills (jsonb), trust score |
| Hiring.cafe API (parallel) | 10-15s | 2 pages of 1000 jobs each, 15s timeout |
| Merge + score + filter | ~500ms | In-memory, split into two sections |
| Cache results (async) | non-blocking | Fire-and-forget via `jobIngestionService` |
| **Total (tech user, DB hit)** | **~2.5s** | DB has cached results from career page scrapes |
| **Total (non-tech, hiring.cafe needed)** | **~12-17s** | First query for this skill set |
| **Total (repeat non-tech query)** | **~2.5s** | Cached from previous hiring.cafe query |

---

## 10. Files to Create/Modify

### New Files
1. `server/services/hiring-cafe.service.ts` — HiringCafeService (API client + data transformer)
2. `.github/workflows/scrape-tech-companies.yml` — GitHub Actions workflow for tiered scraping
3. `scripts/scrape-tier.ts` — CLI script invoked by GH Actions to scrape a company tier

### Modified Files
1. `vercel.json` — Repurpose single cron for cleanup, remove scrape cron
2. `server/storage.ts` — Extend `getJobRecommendations()` to return two-section response with match tier labels and internal job metadata
3. `server/services/sota-scraper.service.ts` — Add `scrapeSubset(tier: 1|2|3)` method to scrape company slices

### Existing Code Reused (not changed)
- `shared/schema.ts` — All needed columns exist
- `server/services/job-ingestion.service.ts` — Works as-is for hiring.cafe jobs (dedup by `externalId + source`)
- `server/job-liveness-service.ts` — Already handles freshness validation
- `server/advanced-matching-engine.ts` — Already has multi-factor scoring (semantic 45%, recency 25%, liveness 20%, personalization 10%)
- `server/job-aggregator.ts` — JSearch/RemoteOK fallback sources already working

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Hiring.cafe API changes/breaks | Medium | High | Browser-spoofed headers, cache-on-read means prior results survive, JSearch/RemoteOK fallback |
| Hiring.cafe rate limiting | Low | Medium | 15s timeout, max 2 pages, cache results to reduce repeat calls |
| GitHub Actions secrets leak | Low | High | Use GitHub encrypted secrets for `DATABASE_URL`, never log connection strings |
| Poor match quality for non-tech | Medium | Medium | 40% threshold (not 75%), tiered labels let users self-filter |
| Stale cached hiring.cafe jobs | Low | Low | `job-liveness-service.ts` already checks freshness every 6 hours |
| Database performance with more jobs | Low | Medium | Existing jsonb GIN indexes, trust score sorting, 100-row query limit |

---

## 12. Deployment Plan

### Phase 1: Infrastructure (Week 1)
- [ ] Create `.github/workflows/scrape-tech-companies.yml`
- [ ] Create `scripts/scrape-tier.ts`
- [ ] Add `scrapeSubset(tier)` to `sota-scraper.service.ts`
- [ ] Update `vercel.json` cron to cleanup-only
- [ ] Test GitHub Actions with manual `workflow_dispatch`
- [ ] Add `DATABASE_URL` secret to GitHub repo settings

### Phase 2: Hiring.cafe Integration (Week 2)
- [ ] Create `server/services/hiring-cafe.service.ts`
- [ ] Integration test with live API (manual, non-production)
- [ ] Add `hiring-cafe` trust score to `job-ingestion.service.ts`
- [ ] Test cache-on-read flow end-to-end

### Phase 3: Two-Section UX (Week 2-3)
- [ ] Extend `storage.getJobRecommendations()` for two-section response
- [ ] Update API endpoint to return new response shape
- [ ] Update frontend to render two sections with tier badges
- [ ] Test with tech resume (should get DB hits instantly)
- [ ] Test with non-tech resume (should trigger hiring.cafe)

### Phase 4: Verification (Week 3)
- [ ] Monitor GitHub Actions for 3 days (no failures)
- [ ] Verify hiring.cafe cache-on-read reduces repeat latency
- [ ] Confirm stale job cleanup works end-to-end
- [ ] Load test: 10 concurrent resume uploads
- [ ] Verify no TypeScript compilation errors

---

## 13. Verification Checklist

After implementation:
- [ ] Two-section UX model clearly implemented with separate sections
- [ ] Every new component references existing code where applicable
- [ ] No redundant schema changes (all columns already exist)
- [ ] All open questions from original PRD resolved with decisions
- [ ] Performance budget reflects parallel architecture with realistic timings
- [ ] Hiring.cafe fragility mitigated with cache-on-read + JSearch/RemoteOK fallback
- [ ] Internal job premium (exam/chat pipeline) is a first-class concept, not a score hack
- [ ] Match tiers (great/good/worth-a-look) render correctly at 75%/50%/40% thresholds
- [ ] Freshness labels (just-posted/this-week/recent) compute correctly from `createdAt`

---

**Note:** The `examTimeMinutes` field referenced in the product positioning is not currently in the `job_postings` schema. If needed for display, it can be derived from the `job_exams` table's duration or added as a schema migration in a future iteration.
