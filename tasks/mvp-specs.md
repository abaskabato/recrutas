# MVP Critical Specs — Implementation Guide

Owner: [your engineer]
Reviewer: Claude (senior review on PRs)
Priority order: Ship-blocking first, then quality improvements.

---

## SPEC-1: Wire Two-Section UX ("Apply & Know Today" / "Matched For You")

**Priority: P0 — this IS the product differentiation**

### Problem
`storage.getJobRecommendationsSectioned()` (storage.ts:857) exists and correctly splits jobs into `applyAndKnowToday` (internal/platform) vs `matchedForYou` (external with externalUrl). But no route calls it. The frontend `JobFeedSections` component (client/src/components/job-feed-sections.tsx) also exists but is unused. Users see a flat list instead of the two-section layout.

### What to do

**Backend — new endpoint or modify existing:**

Option A (recommended): Modify `/api/ai-matches` (routes.ts:316) to return the sectioned shape:

```
GET /api/ai-matches → {
  applyAndKnowToday: AIJobMatch[],  // internal jobs with exams
  matchedForYou: AIJobMatch[]        // external scraped/aggregated
}
```

- Replace `storage.getJobRecommendations(userId)` call with `storage.getJobRecommendationsSectioned(userId)`
- The hiring.cafe and RemoteOK results should go into `matchedForYou` (they're all external)
- Keep the existing scoring/dedup logic, just split the final array

Option B: Add a new endpoint `/api/ai-matches/sectioned` and leave the old one for backward compat. Less clean but lower risk.

**Frontend — replace AIJobFeed rendering:**

File: `client/src/pages/candidate-dashboard-streamlined.tsx:493`

Currently renders `<AIJobFeed />` which shows a flat list. Change to:

1. Update `AIJobFeed` (client/src/components/ai-job-feed.tsx) to consume the new sectioned response shape
2. Render two distinct sections with clear visual separation:
   - **"Apply & Know Today"** — internal jobs, prominent exam CTA, show "Results within 24h" badge
   - **"Matched For You"** — external jobs with trust badges, "Apply on company site" links
3. If `applyAndKnowToday` is empty, collapse that section (don't show an empty header)
4. The existing `JobFeedSections` component (job-feed-sections.tsx) does client-side re-segmentation into "Top AI Matches / Newly Posted / Remote Roles" — this can be used as sub-sections within "Matched For You", or replaced entirely. Your call on UX.

### Acceptance criteria
- [ ] `/api/ai-matches` returns `{ applyAndKnowToday: [], matchedForYou: [] }`
- [ ] Internal jobs (source=platform, no externalUrl) appear in "Apply & Know Today"
- [ ] External jobs (hiring.cafe, RemoteOK, scraped) appear in "Matched For You"
- [ ] Empty sections are collapsed, not shown with "No jobs" text
- [ ] Existing filters (location, work type, company) still work within each section

### Files to touch
- `server/routes.ts` — modify `/api/ai-matches` handler (~line 316)
- `client/src/components/ai-job-feed.tsx` — consume sectioned response
- `client/src/pages/candidate-dashboard-streamlined.tsx` — may need layout changes
- `client/src/components/job-feed-sections.tsx` — reuse or replace

---

## SPEC-2: Wire Advanced Matching Engine into Job Feed

**Priority: P1 — quality of recommendations**

### Problem
The `AdvancedMatchingEngine` (server/advanced-matching-engine.ts) implements the full PRD formula: `FinalScore = 0.45*Semantic + 0.25*Recency + 0.20*Liveness + 0.10*Personalization`. But the actual feed uses `storage.fetchScoredJobs()` (storage.ts:644), a simpler skill-overlap scorer.

Additionally, `advancedMatchingEngine.fetchExternalJobs()` (line 389) returns hardcoded mock data ("Senior Software Engineer at TechCorp"). The `/api/advanced-matches/:candidateId` route exists (routes.ts:1425) but nothing in the frontend calls it.

### What to do

**Option A (recommended): Replace fetchScoredJobs with advancedMatchingEngine**

1. In `storage.getJobRecommendations()` (storage.ts:840), replace the call to `this.fetchScoredJobs(candidateId)` with a call to `advancedMatchingEngine.generateAdvancedMatches(criteria)` — or better, create a thin wrapper that:
   - Queries real jobs from `jobPostings` table (the query from fetchScoredJobs lines 696-727)
   - Passes them through the advanced scoring formula
   - Returns sorted results

2. Fix `fetchExternalJobs()` (advanced-matching-engine.ts:389): Replace mock data with a real DB query. It should query `jobPostings` where `source != 'platform'` or `externalUrl IS NOT NULL`. The shape it returns just needs `id, title, company, skills, location, salary, source, postedDate, externalUrl`.

3. Delete the separate `/api/advanced-matches/:candidateId` route (routes.ts:1425) and `client/src/components/advanced-job-matches.tsx` — they become dead code once the main feed uses the engine.

**Option B (lower risk): Keep fetchScoredJobs, add advanced scoring as a post-process**

After `fetchScoredJobs` returns results, run them through `advancedMatchingEngine.scoreJob()` to re-rank. This preserves the existing DB query but improves sort order.

### Key code references
- `AdvancedMatchingEngine.generateAdvancedMatches()` — advanced-matching-engine.ts:115
- `AdvancedMatchingEngine.scoreJob()` — advanced-matching-engine.ts:163 (individual job scoring)
- `storage.fetchScoredJobs()` — storage.ts:644 (current simple scorer)
- Mock data to delete — advanced-matching-engine.ts:389-410

### Acceptance criteria
- [ ] Job feed results are ranked by the weighted formula, not just skill overlap
- [ ] `fetchExternalJobs()` queries real DB data, not mock
- [ ] Liveness status and trust score affect ranking (verified-active jobs rank higher)
- [ ] Recent postings rank higher than stale ones (recency factor)
- [ ] Dead `/api/advanced-matches` route and component removed

### Files to touch
- `server/advanced-matching-engine.ts` — fix `fetchExternalJobs()`
- `server/storage.ts` — wire advanced engine into `getJobRecommendations()`
- `server/routes.ts` — delete `/api/advanced-matches` route (~line 1425)
- `client/src/components/advanced-job-matches.tsx` — delete

---

## SPEC-3: Notify Candidate on Application Status Change

**Priority: P0 — "know where you stand" is the core promise**

### Problem

UPDATE: Research shows `applicationIntelligence.trackApplicationEvent()` (application-intelligence.ts:57) DOES call `this.notifyCandidate(event)` (line 287) which creates a generic `status_update` notification. So candidates DO get notified.

However, the dedicated methods `notifyApplicationAccepted()` (notification-service.ts:331) and `notifyApplicationRejected()` (line 343) are never called. These have richer, more specific messaging than the generic notification.

### What to do

In the status update handler (routes.ts:1238), after `applicationIntelligence.trackApplicationEvent()`, add specific notification calls for terminal states:

```typescript
// After the existing trackApplicationEvent call:
if (status === 'accepted' || status === 'offer') {
  const app = await storage.getApplication(applicationId);
  await notificationService.notifyApplicationAccepted(
    app.candidateId, candidateName, jobTitle, applicationId
  );
} else if (status === 'rejected') {
  const app = await storage.getApplication(applicationId);
  await notificationService.notifyApplicationRejected(
    app.candidateId, candidateName, jobTitle, applicationId
  );
}
```

Also check: does `notifyCandidate` in application-intelligence.ts actually work? Verify that:
1. It fetches the application correctly (`storage.getApplication`)
2. The notification appears in the candidate's notification feed
3. WebSocket push delivers it in real-time

### Acceptance criteria
- [ ] Candidate receives real-time notification when status changes to any state
- [ ] Accepted/rejected states trigger the dedicated richer notification messages
- [ ] Notification appears in candidate's notification dropdown
- [ ] No duplicate notifications (generic + specific) — gate the generic one or dedupe

### Files to touch
- `server/routes.ts` — status update handler (~line 1238)
- `server/application-intelligence.ts` — verify `notifyCandidate` works end-to-end
- `server/notification-service.ts` — no changes needed, methods already exist

---

## SPEC-4: Fix Exam Short-Answer Scoring with AI

**Priority: P1 — exam quality determines internal job filtering accuracy**

### Problem
In `exam.service.ts:89-93`, short-answer questions give full credit for any non-empty answer:

```typescript
else if (question.type === 'short-answer' && userAnswer.toString().trim().length > 0) {
  earnedPoints += questionPoints;  // full credit for anything
  correctAnswers++;
}
```

This means exam ranking is driven almost entirely by multiple-choice answers. For roles where short-answer questions test critical thinking, this degrades filtering quality.

### What to do

Add AI scoring for short-answer responses using Groq (already available via `getGroqClient()` in `server/ai-service.ts:4-12`).

1. Create a function `scoreShortAnswer(question: string, answer: string, jobContext: string): Promise<number>` in `exam.service.ts` or `ai-service.ts`

2. Use Groq `llama-3.3-70b-versatile` with `response_format: { type: 'json_object' }` (same pattern as `summarizeJobDescription` in ai-service.ts:399):

```
Prompt: Score this answer 0-100.
Question: {question}
Answer: {answer}
Job context: {jobTitle} — {jobDescription snippet}

Return JSON: { "score": number, "reasoning": string }
```

3. In the scoring loop (exam.service.ts ~line 89), replace the auto-full-credit with:

```typescript
else if (question.type === 'short-answer' && userAnswer.toString().trim().length > 0) {
  const aiScore = await scoreShortAnswer(question.text, userAnswer, jobContext);
  const normalizedScore = (aiScore / 100) * questionPoints;
  earnedPoints += normalizedScore;
  if (aiScore >= 60) correctAnswers++;
}
```

4. **Fallback**: If Groq API fails, fall back to the current behavior (full credit). Don't let AI scoring failures block exam submission.

5. **Timeout**: Cap AI scoring at 10 seconds per question. If it times out, give full credit and log a warning.

### Acceptance criteria
- [ ] Short-answer responses are scored 0-100 by AI
- [ ] Score affects the candidate's overall exam percentage
- [ ] Groq failure falls back to full credit (no blocking)
- [ ] Scoring completes within reasonable time (< 30s total for all short-answer questions)
- [ ] Rankings still work correctly with the new scores

### Files to touch
- `server/services/exam.service.ts` — scoring loop (~line 89)
- `server/ai-service.ts` — add `scoreShortAnswer()` function (or put it in exam.service.ts)

---

## SPEC-5: Fix `notifyExamCompleted` applicationId Bug

**Priority: P2 — small fix, quick win**

### Problem
In `exam.service.ts:53`:

```typescript
await this.notificationService.notifyExamCompleted(
  job.talentOwnerId,
  `${candidate?.firstName} ${candidate?.lastName}`,
  job.title,
  score,
  0   // ← always 0, should be the real applicationId
);
```

The talent owner's notification links to application ID 0 (nonexistent).

### What to do

The exam submission handler already has the candidate ID and job ID. Look up the application:

```typescript
// Before the notifyExamCompleted call:
const application = await storage.getApplicationByJobAndCandidate(job.id, candidate.id);
const applicationId = application?.id ?? 0;

await this.notificationService.notifyExamCompleted(
  job.talentOwnerId,
  `${candidate?.firstName} ${candidate?.lastName}`,
  job.title,
  score,
  applicationId
);
```

If `getApplicationByJobAndCandidate` doesn't exist yet, add it to storage — it's a simple query:

```typescript
async getApplicationByJobAndCandidate(jobId: number, candidateId: string) {
  const [app] = await db.select().from(jobApplications)
    .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.candidateId, candidateId)))
    .limit(1);
  return app;
}
```

Also: fix the `INotificationService` interface — the 5th param is named `timeSpent` in the interface but `applicationId` in the implementation. Rename to `applicationId` for clarity.

### Acceptance criteria
- [ ] Talent owner notification contains the correct application ID
- [ ] Clicking the notification navigates to the right application
- [ ] Interface and implementation parameter names match

### Files to touch
- `server/services/exam.service.ts` — line 53
- `server/storage.ts` — add `getApplicationByJobAndCandidate()` if needed
- `server/services/exam.service.ts` — `INotificationService` interface (rename param)

---

## SPEC-6: Verify GitHub Actions DATABASE_URL Secret

**Priority: P1 — scraping doesn't persist without it**

### Problem
The GitHub Actions workflow `.github/workflows/scrape-tech-companies.yml` runs scraping at 6AM/6PM UTC. But if `DATABASE_URL` isn't set in GitHub Secrets, the scraped jobs are fetched but never saved to the database.

### What to do

1. Go to GitHub repo → Settings → Secrets → Actions
2. Verify these secrets exist:
   - `DATABASE_URL` — the Supabase PostgreSQL connection string
   - `GROQ_API_KEY` — for AI extraction in tier 3 scraping
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` — if used by the scraper

3. Trigger a manual workflow run and check the logs to confirm jobs are persisted

4. Add a health check at the start of the scraping script (`scripts/scrape-tier.ts`) that fails fast if `DATABASE_URL` is not set:

```typescript
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set — aborting scrape');
  process.exit(1);
}
```

### Acceptance criteria
- [ ] GitHub Actions workflow completes successfully
- [ ] Scraped jobs appear in the database after a workflow run
- [ ] Missing env vars cause a clear error, not a silent failure

### Files to touch
- GitHub repo settings (secrets)
- `scripts/scrape-tier.ts` — add env var check

---

## Non-Issues (Confirmed Working)

These were flagged as potential issues but research confirms they're already handled:

- **Cache invalidation after profile save** — `profile-upload.tsx:158` already calls `queryClient.invalidateQueries({ queryKey: ['/api/ai-matches'] })`
- **Tab switch after profile save** — `onProfileSaved?.()` callback fires at line 164, dashboard passes `() => setActiveTab('jobs')`
- **Candidate notification on status change** — `applicationIntelligence.notifyCandidate()` does create notifications (though the dedicated accept/reject methods aren't used — see SPEC-3)

---

## Implementation Order

```
SPEC-5 (notifyExamCompleted bug)     — 30 min, quick win
SPEC-6 (GitHub Actions secrets)      — 15 min, verify + add guard
SPEC-3 (richer status notifications) — 1-2 hours
SPEC-1 (two-section UX)              — 3-4 hours, most impactful
SPEC-4 (AI exam scoring)             — 2-3 hours
SPEC-2 (advanced matching engine)    — 4-6 hours, most complex
```
