# Fix Empty Job Feed + Post-Resume-Upload Flow

*Saved Feb 2026 — plan for implementation*

## Context
User uploads resume, AI scans it, sees a dialog with raw experience level ("entry"), and after saving — stays on the same page. When manually navigating to job feed, sees zero jobs. Three issues compound each other.

## Root Cause Analysis (Priority Order)

1. **Empty database** — GitHub Actions scraper runs at 6AM/6PM UTC only. If it hasn't run, or `DATABASE_URL` secret isn't set in GitHub, there are zero jobs. This alone explains the empty feed.
2. **Cache not invalidated** — `profile-upload.tsx` saves skills but never invalidates `/api/ai-matches` query. Even if jobs exist, stale cache returns empty.
3. **No navigation** — After saving parsed resume data, user stays on profile tab. No switch to jobs tab.
4. **Raw experience label** — Dialog shows "entry" / "mid" / "senior" instead of human-readable labels.
5. **Empty OR clause edge case** — If skills array is empty, `or(...[])` creates impossible SQL (evaluates to FALSE). Should fall through to discovery feed instead.

## Changes

### 1. Trigger initial job scraping — verify pipeline works
- Manually trigger GitHub Actions workflow (`workflow_dispatch`) OR run `npx tsx scripts/scrape-tier.ts --tier=1` locally
- Verify `DATABASE_URL` secret is set in GitHub repo settings
- Confirm jobs exist in DB after scrape

### 2. Fix `profile-upload.tsx` — cache invalidation + navigation + experience label
**File**: `client/src/components/profile-upload.tsx`

**a) Add `onProfileSaved` callback prop:**
```tsx
interface ProfileUploadProps {
  onProfileSaved?: () => void;
}
export default function ProfileUpload({ onProfileSaved }: ProfileUploadProps) {
```

**b) In `updateProfileMutation.onSuccess` (line 112):**
- Add `queryClient.invalidateQueries({ queryKey: ['/api/ai-matches'] })`
- Call `onProfileSaved?.()` after invalidation

**c) Fix experience display (line 257-259):**
- Map raw values to labels: `{ entry: 'Entry Level', mid: 'Mid Level', senior: 'Senior Level', executive: 'Executive Level' }`
- Show as a Badge instead of an editable Input

### 3. Wire navigation in parent dashboard
**File**: `client/src/pages/candidate-dashboard-streamlined.tsx`
- Pass `onProfileSaved={() => setActiveTab('jobs')}` to `<ProfileUpload />`

### 4. Guard against empty skills OR clause
**File**: `server/storage.ts` (~line 706)
- The skill-match query path is already guarded: `fetchScoredJobs` returns discovery feed if `!candidate.skills || candidate.skills.length === 0` (line 634). The `or(...candidateSkills.map(...))` only runs when `candidateSkills.length > 0` (line 684-706), so the empty OR case shouldn't happen in normal flow.
- However, `normalizeSkills([])` could theoretically return `[]` after filtering. Add a safety check: if `candidateSkills.length === 0` after normalization, fall back to the discovery feed path.

## Files
- **Edit**: `client/src/components/profile-upload.tsx` (~15 lines)
- **Edit**: `client/src/pages/candidate-dashboard-streamlined.tsx` (~1 line)
- **Edit**: `server/storage.ts` (~3 lines — safety guard after normalizeSkills)
- **Verify**: GitHub Actions `DATABASE_URL` secret + trigger scrape

## Verification
- Confirm jobs exist: check server logs for `[JobIngestion] Complete. Inserted: X`
- Upload resume → dialog shows "Senior Level" (not "senior")
- Click "Confirm and Save" → switches to Jobs tab
- Jobs tab shows matches (not empty)
- `npx tsc --noEmit` passes
