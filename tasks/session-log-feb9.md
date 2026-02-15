# Session Log — Feb 9, 2026

## Implemented & Pushed to `origin/main`

### Commit `6a6ed9f` — Hiring.cafe + US-Only Filtering
- Created `server/location-filter.ts` — US location detection utility
- Wired hiring.cafe into `/api/ai-matches` in `server/routes.ts` (Promise.allSettled, fire-and-forget ingestion)
- Added US location filter to `server/services/job-ingestion.service.ts`
- Removed ArbeitNow (European board) + added US location param to The Muse in `server/job-aggregator.ts`
- Added display-time US safety net filter in `server/storage.ts`

### Commit `d1c96f3` — Ghost Job Detection Fixes
- Replaced N+1 query storm in `getRecruiterStats` with single LEFT JOIN aggregate SQL
- Fixed `runBatchAnalysis` double-analyze bug — `updateJobGhostScore` now returns analysis directly
- Fixed `domainsMatch` false positives — changed `includes()` to `endsWith('.' + domain)` for proper subdomain matching
- Fixed `extractDomainFromCompany` dead code — removed unused `variations` array
- Added `isAuthenticated` to `/api/jobs/:jobId/quality-indicators` endpoint
- Hand-wrote Drizzle migration `drizzle/0003_dazzling_krista_starr.sql` (replaced dangerous auto-generated one that dropped FKs)

### Commit `2b0b8b6` — Hidden & Applied Job Exclusion
- Added server-side filtering in `server/storage.ts` `fetchScoredJobs()`
- Fetches hidden + applied job IDs via `Promise.all`, builds `NOT IN` clause
- Applied to both discovery and skill-matched query paths

## Strategy Docs Saved

| File | Content |
|------|---------|
| `tasks/investment-memo.md` | PMF analysis, investor Q&A, scoring (problem 9/10, defensibility 6/10, GTM 5/10), pre-check milestones |
| `tasks/recrutas-agent.md` | Agentic apply spec: free=0/paid=5 per day, AI draft + human review, fail loud + refund credit, trust score >= 70 gate |
| `tasks/launch-playbook.md` | 4-phase GTM: seed feed (500+ jobs) → candidates first via Reddit/LinkedIn (1,000 resumes) → recruiter pilot (5-10 companies) → monetize |

## Known Issues (Not Yet Fixed)

1. **Empty job feed** — likely empty DB + cache not invalidated after profile save (plan in `tasks/fix-empty-feed-plan.md`)
2. **Raw experience label** — dialog shows "entry"/"senior" instead of human-readable labels
3. **No navigation after save** — stays on profile tab instead of switching to jobs
4. **`location-filter.ts` word boundary** — `'uk'` substring can match words like "duke"
