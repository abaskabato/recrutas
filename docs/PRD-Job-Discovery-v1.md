# Product Requirements Document (PRD)
## Job Discovery Service v1.0

**Author:** Architecture Discussion  
**Date:** February 7, 2026  
**Status:** Ready for Review  
**Stakeholders:** Engineering Team, Product Team

---

## 1. Executive Summary

### 1.1 Problem Statement
Current job discovery is limited to 94 tech companies scraped via Vercel cron, which:
- Times out due to 60s execution limit (Hobby plan constraint)
- Only serves tech workers (excludes blue-collar, hospitality, trades)
- Lacks real-time discovery capabilities
- May include stale job listings

### 1.2 Solution Overview
Implement a **three-tier job discovery architecture**:
1. **Internal Jobs** - Platform employers (unlimited, prioritized)
2. **Verified External** - 73 curated tech companies (cached, refreshed 2x daily)
3. **Discovery External** - Hiring.cafe API (on-demand, any job type)

### 1.3 Success Metrics
- Support any job type (not just tech)
- 100% fresh listings (≤15 days old)
- ≤20 second response time for resume matching
- 75%+ relevance matching threshold
- Zero Vercel timeouts

---

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] Universal job coverage (tech, hospitality, trades, healthcare)
- [ ] Real-time discovery via hiring.cafe API
- [ ] Strict freshness enforcement (15-day cutoff)
- [ ] Quality over quantity (20 highly relevant external jobs max)
- [ ] Internal jobs prioritized (direct platform value)
- [ ] GitHub Actions migration for long-running scrapes

### 2.2 Non-Goals
- [ ] Real-time WebSocket updates (out of scope for MVP)
- [ ] Multi-page company scraping (>2 pages per source)
- [ ] Background job queues (use simple caching strategy)
- [ ] Machine learning for matching (use keyword/skill matching)

---

## 3. Technical Architecture

### 3.1 System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER REQUEST                         │
│                    POST /api/jobs/discover                  │
│                      { resume: string }                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │   Resume Parser      │
            │   - Extract skills   │
            │   - Extract title    │
            │   - Build query      │
            └──────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌────────────┐ ┌──────────────────┐
│  INTERNAL    │ │  CACHED    │ │  HIRING.CAFE     │
│  JOBS        │ │  TECH COs  │ │  (On-Demand)     │
│              │ │            │ │                  │
│  PostgreSQL  │ │  PostgreSQL│ │  API Call        │
│  Instant     │ │  Instant   │ │  10-15s          │
└──────┬───────┘ └─────┬──────┘ └────────┬─────────┘
       │               │                  │
       └───────────────┼──────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │   Job Aggregator     │
            │   - Deduplicate      │
            │   - Score (75% min)  │
            │   - Filter (15 days) │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │   Rank & Limit       │
            │   - Score: match +   │
            │     internal boost   │
            │   - Limit: ∞ internal│
            │     + 20 external    │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │   Response           │
            │   - Jobs[]           │
            │   - Metadata         │
            │   - Source breakdown │
            └──────────────────────┘
```

### 3.2 Data Flow

1. **Parse Phase** (2s): Extract skills and current job title from resume
2. **Query Phase** (1s): Query internal jobs + cached tech companies in parallel
3. **Discovery Phase** (10-15s): Call hiring.cafe API with 2 pages (2,000 jobs)
4. **Aggregation Phase** (2s): Combine, deduplicate, score, filter, rank
5. **Response** (<20s total): Return top matches

---

## 4. Component Specifications

### 4.1 HiringCafeService
**Purpose:** Interface with hiring.cafe API for on-demand job discovery

**Interface:**
```typescript
interface HiringCafeService {
  scrapeByKeywords(
    keywords: string,      // "Senior Developer react node"
    options: {
      maxPages: number;     // 2 (max)
      signal?: AbortSignal; // For timeout handling
    }
  ): Promise<ExternalJobInput[]>;
}
```

**Implementation Details:**
- Endpoint: `POST https://hiring.cafe/api/search-jobs`
- Page size: 1,000 jobs per request
- Max pages: 2 (configurable, default 2)
- Request timeout: 30s per page
- Total timeout budget: 60s (leaves 5s buffer)

**API Request Structure:**
```json
{
  "size": 1000,
  "page": 0,
  "searchState": {
    "searchQuery": "Senior Developer react node",
    "dateFetchedPastNDays": 15,
    "locations": [{"formatted_address": "United States"}],
    "workplaceTypes": ["Remote", "Hybrid", "Onsite"]
  }
}
```

**Error Handling:**
- Timeout: Return partial results from successful pages
- API failure: Log error, return empty array (don't block other sources)
- Rate limit: Implement exponential backoff (1s, 2s, 4s)

### 4.2 JobDiscoveryService
**Purpose:** Orchestrate all job sources and return unified results

**Interface:**
```typescript
interface JobDiscoveryService {
  discoverJobs(
    resumeText: string,
    options?: DiscoveryOptions
  ): Promise<DiscoveryResult>;
}

interface DiscoveryResult {
  jobs: Job[];
  metadata: {
    internalCount: number;
    externalVerifiedCount: number;
    externalDiscoveredCount: number;
    totalMatchScore: number;
    executionTimeMs: number;
  };
}
```

**Algorithm:**
```typescript
async function discoverJobs(resumeText: string) {
  // 1. Parse resume
  const parsed = await resumeParser.parse(resumeText);
  const searchQuery = `${parsed.currentTitle} ${parsed.skills.slice(0, 3).join(' ')}`;
  
  // 2. Parallel fetch from all sources
  const [internal, cachedTech, discovered] = await Promise.all([
    internalJobService.findBySkills(parsed.skills),
    techCompanyService.findBySkills(parsed.skills), // From cached 73 companies
    hiringCafeService.scrapeByKeywords(searchQuery, { maxPages: 2 })
  ]);
  
  // 3. Combine and process
  const allJobs = [...internal, ...cachedTech, ...discovered];
  
  // 4. Filter by freshness (15 days)
  const freshJobs = allJobs.filter(job => 
    freshnessService.getDaysOld(job.postedDate) <= 15
  );
  
  // 5. Score and filter by match quality (75% threshold)
  const scoredJobs = freshJobs.map(job => ({
    ...job,
    matchScore: calculateMatchScore(job, parsed.skills),
    finalScore: calculateFinalScore(job, parsed.skills) // Includes internal boost
  })).filter(job => job.matchScore >= 75);
  
  // 6. Sort by final score (descending)
  scoredJobs.sort((a, b) => b.finalScore - a.finalScore);
  
  // 7. Apply limits
  const internalJobs = scoredJobs.filter(j => j.source === 'internal');
  const externalJobs = scoredJobs.filter(j => j.source !== 'internal').slice(0, 20);
  
  return {
    jobs: [...internalJobs, ...externalJobs],
    metadata: {
      internalCount: internalJobs.length,
      externalVerifiedCount: externalJobs.filter(j => j.source === 'tech-companies').length,
      externalDiscoveredCount: externalJobs.filter(j => j.source === 'hiring-cafe').length,
      totalMatchScore: scoredJobs.reduce((sum, j) => sum + j.matchScore, 0) / scoredJobs.length,
      executionTimeMs: Date.now() - startTime
    }
  };
}
```

### 4.3 FreshnessService
**Purpose:** Enforce 15-day freshness rule across all sources

**Interface:**
```typescript
interface FreshnessService {
  getDaysOld(postedDate: Date): number;
  isFresh(job: Job): boolean;      // ≤15 days
  isValid(job: Job): boolean;      // Internal: check expiry, External: ≤15 days
  getFreshnessLabel(job: Job): 'just-posted' | 'this-week' | 'recent';
}
```

**Rules:**
| Source Type | Validation Rule |
|-------------|----------------|
| Internal | `currentDate < expiresAt` |
| Tech Companies (73) | `daysOld <= 15` |
| Hiring.cafe | `daysOld <= 15` |

**Freshness Labels:**
- `just-posted`: ≤3 days
- `this-week`: 4-7 days
- `recent`: 8-15 days

### 4.4 ResumeParser
**Purpose:** Extract structured data from resume text

**Interface:**
```typescript
interface ParsedResume {
  skills: string[];           // Extracted technical skills
  currentTitle: string;       // Most recent job title
  titles: string[];           // All job titles (chronological)
  yearsExperience: number;    // Total years
  industries: string[];       // Industries worked in
}
```

**Implementation:**
- Use OpenAI API for initial parsing
- Fallback to keyword extraction if API fails
- Cache parsed results for 1 hour (avoid re-parsing)

### 4.5 TechCompanyService
**Purpose:** Query cached jobs from 73 tech companies

**Interface:**
```typescript
interface TechCompanyService {
  findBySkills(skills: string[]): Promise<ExternalJobInput[]>;
  refreshCache(): Promise<void>; // Called by GitHub Actions
}
```

**Implementation:**
- Query PostgreSQL: `SELECT * FROM job_postings WHERE source = 'tech-company' AND posted_date >= NOW() - INTERVAL '15 days'`
- Returns cached results instantly
- Cache refreshed by GitHub Actions 2x daily

---

## 5. API Specifications

### 5.1 Discover Jobs Endpoint

**Endpoint:** `POST /api/jobs/discover`

**Request:**
```json
{
  "resume": "string (base64 or plain text)",
  "options": {
    "maxExternalJobs": 20,      // Optional, default 20
    "minMatchScore": 75,        // Optional, default 75
    "includeExpired": false     // Optional, default false
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "title": "Senior React Developer",
        "company": "TechCorp",
        "location": "Remote",
        "description": "string",
        "requirements": ["string"],
        "skills": ["React", "TypeScript", "Node.js"],
        "salaryMin": 120000,
        "salaryMax": 160000,
        "source": "internal",           // "internal" | "tech-companies" | "hiring-cafe"
        "externalUrl": "string",        // null for internal
        "postedDate": "2024-02-05",
        "expiresAt": "2024-03-05",      // null for external
        "matchScore": 92,               // 0-100
        "finalScore": 122,              // matchScore + internal boost
        "freshness": "just-posted",     // "just-posted" | "this-week" | "recent"
        "daysOld": 2
      }
    ],
    "metadata": {
      "totalJobs": 28,
      "internalCount": 8,
      "externalVerifiedCount": 5,
      "externalDiscoveredCount": 15,
      "averageMatchScore": 84.5,
      "executionTimeMs": 18500,
      "sources": {
        "internal": { "count": 8, "avgScore": 94 },
        "techCompanies": { "count": 5, "avgScore": 88 },
        "hiringCafe": { "count": 15, "avgScore": 79 }
      }
    }
  }
}
```

**Response (Timeout - 504):**
```json
{
  "success": false,
  "error": "Request timeout",
  "data": {
    "jobs": [...],                    // Partial results from cache
    "partial": true,
    "message": "Showing cached results. Retry for latest jobs."
  }
}
```

### 5.2 Error Handling

| Status Code | Scenario | Response |
|-------------|----------|----------|
| 200 | Success | Full job list with metadata |
| 400 | Invalid resume | Error message, no jobs |
| 408 | Timeout (>60s) | Partial results from cache |
| 500 | Server error | Error message, empty array |

---

## 6. Data Models

### 6.1 Database Schema Updates

**Table: job_postings**
```sql
-- Add columns for freshness tracking
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS posted_date DATE;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS source_type VARCHAR(20); -- 'internal' | 'external'
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS external_url VARCHAR(500);
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP; -- For internal jobs

-- Add indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_posted_date 
  ON job_postings(posted_date) 
  WHERE posted_date >= CURRENT_DATE - INTERVAL '15 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_source 
  ON job_postings(source, posted_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_skills 
  ON job_postings USING GIN(skills);
```

**Table: job_discovery_logs** (Optional, for analytics)
```sql
CREATE TABLE IF NOT EXISTS job_discovery_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  query TEXT,
  internal_count INTEGER,
  external_count INTEGER,
  execution_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 6.2 TypeScript Interfaces

```typescript
// Job representation
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  source: 'internal' | 'tech-companies' | 'hiring-cafe';
  externalUrl?: string;
  postedDate: Date;
  expiresAt?: Date; // For internal jobs
  
  // Scoring metadata
  matchScore: number;  // 0-100, skill match quality
  finalScore: number;  // matchScore + internal boost (30 pts)
  freshness: 'just-posted' | 'this-week' | 'recent';
  daysOld: number;
}

// For ingestion (matches existing ExternalJobInput)
interface ExternalJobInput {
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  source: string;
  externalId: string;
  externalUrl: string;
  postedDate: string;
}
```

---

## 7. Configuration

### 7.1 Constants

```typescript
// server/config/job-discovery.config.ts
export const JOB_DISCOVERY_CONFIG = {
  // Source limits
  MAX_EXTERNAL_JOBS: 20,
  UNLIMITED_INTERNAL: true,
  
  // Quality thresholds
  MIN_MATCH_SCORE: 75,           // 0-100
  INTERNAL_JOB_BOOST: 30,        // Points added to internal jobs
  
  // Freshness
  MAX_AGE_DAYS_EXTERNAL: 15,
  FRESHNESS_THRESHOLDS: {
    JUST_POSTED: 3,              // days
    THIS_WEEK: 7                 // days
  },
  
  // Hiring.cafe
  HIRING_CAFE_MAX_PAGES: 2,      // 2,000 jobs max
  HIRING_CAFE_PAGE_SIZE: 1000,
  HIRING_CAFE_TIMEOUT_MS: 30000, // 30s per page
  
  // Resume parsing
  RESUME_PARSER_MAX_SKILLS: 20,
  RESUME_PARSER_TIMEOUT_MS: 5000,
  
  // Overall timeout
  DISCOVERY_TIMEOUT_MS: 60000    // 60s total
};
```

### 7.2 Environment Variables

```bash
# Required
HIRING_CAFE_API_URL=https://hiring.cafe/api/search-jobs
OPENAI_API_KEY=sk-...          # For resume parsing
DATABASE_URL=postgresql://...  # Existing

# Optional (defaults shown)
MAX_EXTERNAL_JOBS=20
MIN_MATCH_SCORE=75
MAX_AGE_DAYS=15
```

---

## 8. GitHub Actions Configuration

### 8.1 Workflow: Scrape Tech Companies

**File:** `.github/workflows/scrape-tech-companies.yml`

```yaml
name: Scrape Tech Company Jobs

on:
  schedule:
    - cron: '0 6,18 * * *'  # 6:00 AM and 6:00 PM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Scrape Tier 1 Companies (High Priority)
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx tsx scripts/scrape-tier.ts --tier=1 --timeout=900000
        # 15 min timeout for 20 top companies
      
      - name: Scrape Tier 2 Companies (Medium Priority)
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx tsx scripts/scrape-tier.ts --tier=2 --timeout=900000
        # 15 min timeout for next 25 companies
      
      - name: Cleanup Stale Jobs
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx tsx scripts/cleanup-stale-jobs.ts --days=15
      
      - name: Notify on Failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "⚠️ Job scraping failed for ${{ github.repository }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 8.2 Company Tiers

| Tier | Companies | Frequency | Examples |
|------|-----------|-----------|----------|
| Tier 1 | 20 | Every run (2x daily) | Stripe, Airbnb, Figma, Netflix, Google |
| Tier 2 | 25 | Every run (2x daily) | Remaining high-priority |
| Tier 3 | 28 | Every 2 days | Lower priority |

---

## 9. Scoring Algorithm

### 9.1 Match Score Calculation (0-100)

```typescript
function calculateMatchScore(job: Job, userSkills: string[]): number {
  let score = 0;
  
  // Skill overlap (70% weight)
  const jobSkills = new Set(job.skills.map(s => s.toLowerCase()));
  const userSkillsLower = userSkills.map(s => s.toLowerCase());
  const matchedSkills = userSkillsLower.filter(s => jobSkills.has(s));
  const skillScore = (matchedSkills.length / Math.max(jobSkills.size, 1)) * 70;
  score += skillScore;
  
  // Title similarity (20% weight)
  const titleScore = calculateTitleSimilarity(job.title, userSkills) * 20;
  score += titleScore;
  
  // Location match (10% weight)
  if (job.location.toLowerCase().includes('remote') || 
      isLocationMatch(job.location, userLocation)) {
    score += 10;
  }
  
  return Math.min(100, Math.round(score));
}
```

### 9.2 Final Score (Ranking)

```typescript
function calculateFinalScore(job: Job, userSkills: string[]): number {
  const matchScore = calculateMatchScore(job, userSkills);
  let finalScore = matchScore;
  
  // Internal job boost
  if (job.source === 'internal') {
    finalScore += JOB_DISCOVERY_CONFIG.INTERNAL_JOB_BOOST; // +30
  }
  
  // Freshness boost (up to +10)
  if (job.daysOld <= 3) {
    finalScore += 10;
  } else if (job.daysOld <= 7) {
    finalScore += 5;
  }
  
  return finalScore;
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

| Component | Test Cases | Priority |
|-----------|-----------|----------|
| HiringCafeService | API response parsing, pagination, error handling | High |
| FreshnessService | Date calculations, boundary conditions | High |
| ResumeParser | Skill extraction, title detection | High |
| Scoring | Match algorithm accuracy | Medium |

### 10.2 Integration Tests

| Scenario | Expected Result |
|----------|----------------|
| Resume with "React" skills | Returns React jobs, 75%+ match |
| 60s timeout | Returns cached results, partial=true |
| All sources fail | Returns empty array, logs error |
| 100 internal jobs | Returns all 100 + top 20 external |
| Stale external jobs | Filtered out, not returned |

### 10.3 Performance Tests

| Metric | Target | Worst Case |
|--------|--------|------------|
| Response time | <20s | <60s (timeout) |
| Memory usage | <512MB | <1GB |
| Database queries | <10 | <20 |
| Hiring.cafe API calls | 2 | 2 |

---

## 11. Deployment Plan

### 11.1 Phase 1: Database Migration (Week 1)
- [ ] Add new columns to job_postings table
- [ ] Create indexes
- [ ] Backfill posted_date for existing jobs
- [ ] Test migration on staging

### 11.2 Phase 2: GitHub Actions (Week 1-2)
- [ ] Create `.github/workflows/scrape-tech-companies.yml`
- [ ] Test scraper locally
- [ ] Verify GitHub Actions execution
- [ ] Monitor for 3 days

### 11.3 Phase 3: API Implementation (Week 2-3)
- [ ] Implement HiringCafeService
- [ ] Implement JobDiscoveryService
- [ ] Implement FreshnessService
- [ ] Update resume parser
- [ ] Create `/api/jobs/discover` endpoint

### 11.4 Phase 4: Integration & Testing (Week 3-4)
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Edge case handling
- [ ] Production deployment

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Hiring.cafe API changes | Medium | High | Abstract behind interface, version checks |
| Vercel timeout (60s) | High | Medium | Cache-first, partial results, GitHub Actions |
| Rate limiting from hiring.cafe | Low | Medium | Implement backoff, monitor logs |
| Poor match quality | Medium | High | 75% threshold, user feedback loop |
| Database performance | Low | Medium | Indexes, query optimization |

---

## 13. Open Questions

1. **Should we cache hiring.cafe results?**
   - Current: Real-time only
   - Alternative: Cache for 6-12 hours to reduce API calls

2. **How to handle hiring.cafe API failures?**
   - Current: Return empty array for that source
   - Alternative: Retry with exponential backoff

3. **Should we implement user feedback on job quality?**
   - "This job matched well" / "Not relevant" buttons
   - Could improve matching algorithm over time

4. **Geographic filtering?**
   - Current: US-focused
   - Future: Allow users to specify location preferences

---

## 14. Appendix

### A. Hiring.cafe API Response Format
```json
{
  "results": [
    {
      "id": "job-123",
      "board_token": "company-456",
      "source": "Company Name",
      "apply_url": "https://...",
      "job_information": {
        "title": "Job Title",
        "description": "HTML description...",
        "viewedByUsers": [],
        "appliedFromUsers": []
      }
    }
  ]
}
```

### B. Existing Code References
- Current 73 companies: `server/services/sota-scraper.service.ts:15-94`
- Job ingestion: `server/services/job-ingestion.service.ts`
- Existing scraper: `server/scraper-v2/engine.ts`

### C. Success Metrics Dashboard
- Jobs discovered per day (by source)
- Average match score
- Response time distribution
- User engagement (clicks, applications)
- Freshness distribution (% jobs by age)

---

**Reviewers:** Please comment on:
1. Architecture approach
2. Scoring algorithm (75% threshold, +30 internal boost)
3. GitHub Actions schedule (2x daily sufficient?)
4. API design
5. Any missing edge cases

**Next Steps:** Await approval, then proceed to implementation Phase 1.
