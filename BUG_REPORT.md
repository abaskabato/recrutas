# Code Review Bug Report - Recrutas Platform

## Executive Summary

This report documents bugs, issues, and potential problems found during a comprehensive code review of the Recrutas recruitment platform. Issues are categorized by severity with file locations, descriptions, and suggested fixes.

---

## CRITICAL ISSUES (1)

### 1. Null Email Access Causes Crash
**File:** `client/src/components/real-time-chat.tsx`
**Line:** 260
**Severity:** CRITICAL

```tsx
{message.sender.firstName?.[0] || message.sender.email[0].toUpperCase()}
```

**Issue:** If `message.sender.email` is null/undefined, this will crash. The first part uses optional chaining (`firstName?.[0]`) but the fallback does not.

**Suggested Fix:**
```tsx
{message.sender.firstName?.[0] || message.sender.email?.[0]?.toUpperCase() || '?'}
```

---

## HIGH SEVERITY ISSUES (6)

### 2. Missing Status Validation on Application Updates
**File:** `server/routes.ts`
**Line:** 1683
**Severity:** HIGH

```typescript
const { status } = req.body;
```

**Issue:** The status field from the request body is not validated against the allowed enum values. While there's validation in the candidate route (line 1198-1200), the talent owner route (line 1681-1734) accepts any string for status.

**Suggested Fix:**
```typescript
const VALID_STATUSES = ['submitted', 'screening', 'interview_scheduled', 'offer', 'accepted', 'rejected', 'withdrawn'];
if (!status || !VALID_STATUSES.includes(status)) {
  return res.status(400).json({ message: "Invalid status" });
}
```

---

### 3. Race Condition in Background Job Triggering
**File:** `server/routes.ts`
**Lines:** 2117-2128
**Severity:** HIGH

```typescript
res.json({ message: "External jobs scraping triggered", status: "in_progress" });
externalJobsScheduler.triggerScrape()
  .then(result => {...})
  .catch(error => {...});
```

**Issue:** The response is sent before the background operation completes. If the server crashes or restarts before the background job completes, the client has no way to know. No job ID or tracking mechanism is provided.

**Suggested Fix:** Return a job/task ID that the client can poll for status.

---

### 4. Silent Error Swallowing on External Jobs
**File:** `server/routes.ts`
**Lines:** 855-859
**Severity:** HIGH

```typescript
} catch (error) {
  console.error('Error fetching cached external jobs:', error);
  res.json({ jobs: [], cached: true, message: 'External jobs unavailable' });
}
```

**Issue:** The endpoint silently swallows errors and returns an empty array, making it impossible for the client to know if there's a temporary issue vs. genuinely no jobs. This can mask serious database issues.

**Suggested Fix:** Return appropriate error status for actual errors:
```typescript
} catch (error) {
  console.error('Error fetching cached external jobs:', error);
  res.status(503).json({ jobs: [], cached: false, message: 'Service temporarily unavailable' });
}
```

---

### 5. Missing Error Handling in Promise Chains
**File:** `server/routes.ts`
**Lines:** 477, 532, 2123, 2150, 2196
**Severity:** HIGH

```typescript
.then(jobs => jobs.slice(0, 15))
.then(stats => console.log(`[HiringCafe] Ingestion: ${stats.inserted} new, ${stats.duplicates} dupes`))
```

**Issue:** These `.then()` calls don't have `.catch()` handlers, so any errors in these promise chains will result in unhandled promise rejections.

**Suggested Fix:** Add `.catch()` handlers to all promise chains.

---

### 6. Missing Authorization Check on Notification Read
**File:** `server/routes.ts`
**Lines:** 1773-1778
**Severity:** HIGH

```typescript
app.post('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
  try {
    const notificationId = parseIntParam(req.params.id);
    if (!notificationId) {return res.status(400).json({ message: "Invalid notification id" });}
    await notificationService.markAsRead(notificationId, req.user.id);
```

**Issue:** While the user ID is passed to `markAsRead`, there's no verification that the notification actually belongs to this user before marking it as read. The check might be in the service layer but it's not visible in the route.

**Suggested Fix:** Add explicit authorization check before marking as read.

---

### 7. No Rate Limiting on Public Endpoints
**File:** `server/routes.ts`
**Lines:** 337, 374, 391, 832, 863
**Severity:** HIGH

**Issue:** Public endpoints like `/api/health`, `/api/ml-matching/status`, `/api/news/layoffs`, `/api/external-jobs`, and `/api/platform/stats` have no rate limiting. These could be abused for DoS attacks.

**Suggested Fix:** Implement rate limiting middleware for these endpoints.

---

## MEDIUM SEVERITY ISSUES (6)

### 8. API Response Inconsistency
**File:** `server/routes.ts`
**Severity:** MEDIUM

**Issue:** The API returns different formats for similar success cases:
- Some return `{ success: true }` (lines 1778, 1788)
- Some return `{ message: '...' }` (line 1487)
- Some return just the object (line 889)

**Suggested Fix:** Standardize success response format across all endpoints.

---

### 9. Missing Type Safety on JWT Payload
**File:** `server/middleware/auth.ts`
**Line:** 32
**Severity:** MEDIUM

```typescript
const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
```

**Issue:** The JWT payload is cast to `any`, losing type safety. This could lead to runtime errors if the token structure is unexpected.

**Suggested Fix:** Define and use a proper JWT payload type.

---

### 10. No Input Validation on Query Parameters
**File:** `server/routes.ts`
**Lines:** 834-837
**Severity:** MEDIUM

```typescript
const skills = req.query.skills ? (req.query.skills as string).split(',') : [];
const jobTitle = req.query.jobTitle as string | undefined;
const location = req.query.location as string | undefined;
const workType = req.query.workType as string | undefined;
```

**Issue:** Query parameters are cast directly without validation. Very long query strings could cause performance issues.

**Suggested Fix:** Add validation/sanitization for query parameters.

---

### 11. Unsafe Error Message Exposure
**File:** `server/routes.ts`
**Lines:** 1065-1070
**Severity:** LOW

```typescript
res.status(500).json({
  message: "Failed to upload resume",
  details: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
});
```

**Issue:** While this is partially mitigated by checking NODE_ENV, the pattern is inconsistent across the codebase. Some places expose error messages in production.

**Suggested Fix:** Create a consistent error handling utility that never exposes internal error details in production.

---

### 12. Duplicate useEffect Cleanup in WebSocket Hook
**File:** `client/src/hooks/use-websocket-notifications.ts`
**Lines:** 125-140
**Severity:** MEDIUM

```typescript
useEffect(() => {
  if (userId) {
    connect();
  }
  return () => {
    disconnect();
  };
}, [userId, connect, disconnect]);

// Cleanup on unmount
useEffect(() => {
  return () => {
    disconnect();
  };
}, [disconnect]);
```

**Issue:** The cleanup function is called twice on unmount. While this doesn't cause a crash (disconnect handles it), it's redundant.

**Suggested Fix:** Remove the duplicate cleanup effect.

---

### 13. Missing Database Indexes
**File:** `shared/schema.ts`
**Severity:** MEDIUM

**Issue:** While there are indexes on `livenessStatus`, `expiresAt`, `trustScore`, `talentOwnerId`, and `ghostJobScore`, there might be missing indexes on:
- `jobApplications.candidateId` (frequently queried)
- `jobApplications.jobId` (frequently queried)
- `notifications.userId` (frequently queried)

**Suggested Fix:** Add indexes on these foreign key columns.

---

## LOW SEVERITY ISSUES (4)

### 14. Duplicate WebSocket Cleanup
**File:** `client/src/hooks/useWebSocket.ts`
**Lines:** 33-42
**Severity:** LOW

Similar to issue #12.

---

### 15. Inconsistent Error Response Format
**File:** `server/routes.ts`
**Severity:** LOW

**Issue:** Error responses vary across endpoints:
- `{ message: "..." }`
- `{ error: "..." }`
- `{ message: "...", errors: [...] }`

**Suggested Fix:** Standardize error response format using a helper function.

---

### 16. Hardcoded Magic Numbers
**File:** `server/routes.ts`
**Lines:** 440-442
**Severity:** LOW

```typescript
const MATCHING_TIMEOUT_MS = 45000;
const EARLY_RETURN_THRESHOLD_MS = 30000;
const BATCH_ABORT_THRESHOLD_MS = 20000;
```

**Issue:** Magic numbers should be extracted to constants with descriptive names.

**Suggested Fix:** Move to config/constants file.

---

### 17. Potential Missing Index on Ghost Job Queries
**File:** `shared/schema.ts`
**Severity:** LOW

**Issue:** The `ghostJobScore` is already indexed, but compound indexes might be needed for common query patterns.

---

## RECOMMENDED PRIORITY ORDER

### Immediate (Critical & High - Fix Today)
1. Fix null email access crash in real-time-chat.tsx
2. Add status validation to application status updates
3. Add .catch() handlers to promise chains
4. Fix silent error swallowing

### This Sprint (Medium Priority)
5. Add rate limiting to public endpoints
6. Add authorization check on notification read
7. Standardize API response format
8. Fix JWT type safety

### Backlog (Low Priority)
9. Add database indexes
10. Extract magic numbers to constants
11. Create error handling utility

---

## TESTING RECOMMENDATIONS

1. **Critical Path Testing:** Auth flows, payment processing, job posting
2. **Error Scenario Testing:** Network failures, invalid inputs, timeout handling
3. **Security Testing:** SQL injection, XSS, authorization bypass attempts
4. **Load Testing:** Public endpoints for DoS vulnerability
5. **Integration Testing:** Full user flows from signup to job posting

---

*Report generated: February 2026*
*Reviewer: AI Assistant*
*Platform: Recrutas - AI-Powered Recruitment Platform*
