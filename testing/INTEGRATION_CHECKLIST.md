# Recrutas Testing Playbook - Integration & Regression

**Version:** 1.0  
**Last Updated:** 2026-02-08  
**Priority:** MEDIUM - Cross-system validation  
**Estimated Time:** 20-25 minutes  

---

## Overview

This document covers **integration points** between services and **regression tests** for complex workflows. These tests verify:
- Stripe webhook handling
- Notification delivery cascade
- Cache invalidation
- Real-time feature reliability
- Database transaction integrity

---

## Quick Status Tracker

| # | Test Category | Components | Status | Notes |
|---|---------------|------------|--------|-------|
| 1 | Stripe Webhooks | Stripe + Server | ⬜ | |
| 2 | Notification Cascade | WS + Polling + Email | ⬜ | |
| 3 | Cache Invalidation | TanStack Query + DB | ⬜ | |
| 4 | Real-time Features | WebSocket + Polling | ⬜ | |
| 5 | Background Jobs | AI + Notifications | ⬜ | |
| 6 | Multi-step Workflows | State Persistence | ⬜ | |
| 7 | External Job Scraping | APIs + Database | ⬜ | |
| 8 | Data Consistency | ACID Compliance | ⬜ | |

**Legend:**
- ⬜ Not Tested
- 🟡 In Progress
- ✅ Pass
- ❌ Fail

---

## Test 1: Stripe Webhooks

### 1.1 Webhook Signature Verification
**Risk:** Fake webhooks accepted, unauthorized access

**Prerequisites:** Stripe CLI or webhook testing tool

**Steps:**
1. Install Stripe CLI:
   ```bash
   stripe login
   stripe listen --forward-to localhost:5000/api/stripe/webhook
   ```
2. Trigger test webhook:
   ```bash
   stripe trigger checkout.session.completed
   ```
3. Check server logs

**Expected:**
- [ ] Webhook received
- [ ] Signature verified ( Stripe-Signature header validated)
- [ ] Event processed
- [ ] 200 OK response

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 1.2 Checkout Session Completed
**Risk:** Subscription not activated after payment

**Steps:**
1. Create checkout session as user
2. Complete payment with test card
3. Check webhook processing

**Expected:**
- [ ] `checkout.session.completed` webhook received
- [ ] Subscription created in database
- [ ] User's subscription status updated to "active"
- [ ] Feature limits updated (e.g., unlimited AI matches)

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 1.3 Subscription Cancellation
**Risk:** User still has access after cancelling

**Steps:**
1. User cancels subscription in Stripe portal
2. Wait for webhook

**Expected:**
- [ ] `customer.subscription.deleted` webhook received
- [ ] Subscription status changed to "cancelled"
- [ ] Access revoked at period end
- [ ] User downgraded to free tier

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 1.4 Failed Payment Handling
**Risk:** No notification of payment failure

**Steps:**
1. Create subscription
2. Update payment method to failing card: `4000 0000 0000 0341`
3. Wait for invoice payment attempt

**Expected:**
- [ ] `invoice.payment_failed` webhook received
- [ ] User notified of payment failure
- [ ] Subscription enters "past_due" status
- [ ] Grace period provided (if configured)

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 1.5 Duplicate Webhook Handling
**Risk:** Double processing, duplicate subscriptions

**Steps:**
1. Send same webhook event twice (simulate retry)
2. Check database

**Expected:**
- [ ] Second webhook ignored (idempotency check)
- [ ] No duplicate subscription records
- [ ] 200 OK returned (don't trigger retry)

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 2: Notification Cascade

### 2.1 Notification Priority Routing
**Risk:** Wrong delivery method for priority level

**Setup:** Configure notification preferences

**Steps:**
1. Create notification with priority "urgent"
2. Check delivery

**Expected:**
- [ ] WebSocket push (real-time)
- [ ] In-app notification (immediate)
- [ ] Email sent (async)
- [ ] No quiet hours blocking

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 2.2 Quiet Hours Compliance
**Risk:** Notifications sent during blocked hours

**Setup:** Set quiet hours 10 PM - 8 AM

**Steps:**
1. Trigger notification at 11 PM
2. Check delivery

**Expected:**
- [ ] Notification queued
- [ ] WebSocket/in-app deferred
- [ ] Email delayed until 8 AM
- [ ] No immediate delivery

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 2.3 WebSocket to Polling Fallback
**Risk:** Notifications not received if WebSocket fails

**Setup:** Block WebSocket connection

**Steps:**
1. Block WebSocket in browser (DevTools → Block request URL)
2. Trigger notification
3. Check polling mechanism

**Expected:**
- [ ] WebSocket connection fails
- [ ] Polling starts automatically (every 30s)
- [ ] Notification received via polling
- [ ] No errors shown to user

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 2.4 Notification Preferences Update
**Risk:** Old preferences cached

**Steps:**
1. User disables email notifications
2. Trigger email-worthy notification

**Expected:**
- [ ] Preferences updated in database
- [ ] Cache invalidated
- [ ] Email NOT sent
- [ ] WebSocket/in-app still work

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 2.5 Batch Notification Delivery
**Risk:** Notification overflow, performance issues

**Setup:** Trigger 10+ notifications rapidly

**Steps:**
1. Perform action that creates many notifications
2. Check delivery

**Expected:**
- [ ] All notifications delivered
- [ ] No duplicates
- [ ] Performance acceptable
- [ ] UI doesn't freeze

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 3: Cache Invalidation

### 3.1 Profile Update Cache Invalidation
**Risk:** Stale data shown after update

**Steps:**
1. View profile (cached)
2. Update profile (change name)
3. Navigate back to profile

**Expected:**
- [ ] Old name displayed briefly (optimistic update)
- [ ] New name persists after refresh
- [ ] Cache invalidated on mutation success
- [ ] No stale data after 5 minutes

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 3.2 Job List Cache Invalidation
**Risk:** New jobs not appearing

**Steps:**
1. View job list (cached)
2. Create new job as recruiter
3. Check job list as candidate

**Expected:**
- [ ] New job appears in list
- [ ] Cache invalidated on job creation
- [ ] Or: Stale-while-revalidate shows new job quickly

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 3.3 Application Status Cache
**Risk:** Status not updated after recruiter change

**Steps:**
1. Candidate views application (status: Submitted)
2. Recruiter changes status to "Screening"
3. Candidate refreshes applications

**Expected:**
- [ ] New status displayed
- [ ] Cache invalidated via WebSocket/real-time update
- [ ] Or: Polling picks up change within 30 seconds

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 3.4 Cache TTL Expiration
**Risk:** Infinite cache, stale data

**Steps:**
1. Load profile (sets cache)
2. Wait 6+ minutes (cache TTL)
3. Check if cache refetches

**Expected:**
- [ ] Cache considered stale after 5 minutes
- [ ] Refetch on next access
- [ ] Fresh data loaded

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 4: Real-time Features

### 4.1 WebSocket Reconnection
**Risk:** Missed notifications after disconnect

**Steps:**
1. Connect to WebSocket (notification bell shows connected)
2. Disconnect network for 10 seconds
3. Reconnect network
4. Trigger notification

**Expected:**
- [ ] WebSocket disconnect detected
- [ ] Reconnection attempt (3-second delay)
- [ ] Connection restored
- [ ] Notification received

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 4.2 WebSocket Message Ordering
**Risk:** Notifications out of order

**Steps:**
1. Rapidly trigger 5 notifications
2. Check delivery order

**Expected:**
- [ ] Notifications received in order sent
- [ ] No duplicates
- [ ] No missing notifications

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 4.3 Multiple Device Login
**Risk:** Notifications duplicated or missed

**Setup:** Login on phone + laptop

**Steps:**
1. Login as same user on 2 devices
2. Trigger notification

**Expected:**
- [ ] Both devices receive notification
- [ ] No duplicates on either device
- [ ] Marking read on one marks on both

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 4.4 Chat Real-time Delivery
**Risk:** Messages lost or delayed

**Steps:**
1. Open chat on candidate device
2. Open chat on recruiter device
3. Send 10 messages rapidly alternating

**Expected:**
- [ ] All messages delivered to both
- [ ] Correct order maintained
- [ ] No duplicates
- [ ] Timestamps accurate

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 4.5 Polling Fallback Under Load
**Risk:** Polling fails with many users

**Steps:**
1. Block WebSocket for 50+ users (simulate)
2. All users polling for notifications

**Expected:**
- [ ] Server handles polling load
- [ ] Response times < 500ms
- [ ] No server crashes
- [ ] Database not overloaded

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 5: Background Jobs

### 5.1 Resume Parsing Background Job
**Risk:** Parsing fails silently

**Steps:**
1. Upload resume
2. Check background processing

**Expected:**
- [ ] Job queued
- [ ] Processing starts
- [ ] Success: profile updated
- [ ] Failure: error logged, user notified
- [ ] No orphaned processing jobs

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 5.2 AI Match Generation
**Risk:** Matches not generated

**Setup:** Candidate with skills, job with matching requirements

**Steps:**
1. Create job matching candidate skills
2. Check AI matches

**Expected:**
- [ ] Background job generates matches
- [ ] Match score calculated
- [ ] Match appears in candidate feed
- [ ] Explanation generated

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 5.3 Notification Dispatch Job
**Risk:** Notifications not sent

**Steps:**
1. Trigger action that creates notification
2. Check notification delivery

**Expected:**
- [ ] Notification queued
- [ ] Dispatched via WebSocket/polling/email
- [ ] No duplicates
- [ ] Failed deliveries retried

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 5.4 External Job Scraping Job
**Risk:** Scraping failures not handled

**Steps:**
1. Trigger external job scrape:
   ```bash
   curl -X POST http://localhost:5000/api/cron/scrape-external-jobs \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
2. Check logs

**Expected:**
- [ ] Scraping starts
- [ ] Jobs fetched from sources
- [ ] Deduplication works
- [ ] Failures logged but don't stop job
- [ ] Database updated

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 6: Multi-step Workflows

### 6.1 Guided Setup State Persistence
**Risk:** Progress lost on refresh

**Steps:**
1. Start candidate guided setup
2. Complete step 1 (role selection)
3. Refresh page

**Expected:**
- [ ] Returns to correct step
- [ ] Previous data preserved
- [ ] Can continue from where left off

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 6.2 Job Posting Wizard Validation
**Risk:** Invalid job posted

**Steps:**
1. Start job posting
2. Fill step 1, go to step 2
3. Navigate back to step 1
4. Clear required field
5. Try to proceed

**Expected:**
- [ ] Validation prevents progression
- [ ] Error highlights invalid field
- [ ] Cannot submit incomplete job

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 6.3 Exam Creation with Job
**Risk:** Job created without exam

**Steps:**
1. Create job with exam enabled
2. Add exam questions
3. Submit
4. Check database

**Expected:**
- [ ] Job created
- [ ] Exam created with questions
- [ ] Foreign key relationship correct
- [ ] Both or neither (atomic)

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 6.4 Browser Back Button Behavior
**Risk:** Data loss, invalid states

**Steps:**
1. Complete step 1 of wizard
2. Go to step 2
3. Click browser back button
4. Click browser forward button

**Expected:**
- [ ] Back: Returns to step 1 with data
- [ ] Forward: Returns to step 2 with data
- [ ] No errors
- [ ] Data not lost

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 7: External Job Scraping

### 7.1 Deduplication Logic
**Risk:** Duplicate external jobs

**Steps:**
1. Run scraper twice in succession
2. Check database

**Expected:**
- [ ] Same job not duplicated
- [ ] Unique constraint `(external_id, source)` enforced
- [ ] Trust scores updated if changed
- [ ] No errors on duplicate insert attempts

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 7.2 Trust Score Assignment
**Risk:** Wrong trust scores, unreliable sources prioritized

**Steps:**
1. Run scraper with multiple sources
2. Check job trust scores

**Expected:**
- [ ] Greenhouse jobs: 95
- [ ] Lever jobs: 95
- [ ] Workday jobs: 90
- [ ] JSearch jobs: 70
- [ ] Scores determine display priority

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 7.3 Job Expiration
**Risk:** Stale jobs displayed

**Steps:**
1. Check `expires_at` field on external jobs
2. Wait for expiration (or set past date in DB)
3. Check job feed

**Expected:**
- [ ] Jobs have 60-day expiration
- [ ] Expired jobs not shown
- [ ] Cleanup job removes old jobs

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 7.4 External Job Click Tracking
**Risk:** No analytics on external job clicks

**Steps:**
1. Click external job in feed
2. Check database/logs

**Expected:**
- [ ] Click tracked (if implemented)
- [ ] Redirects to external URL
- [ ] New tab opened (if configured)

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 8: Data Consistency (ACID)

### 8.1 Job Application Transaction
**Risk:** Partial application data

**Steps:**
1. Apply to job
2. Check multiple tables

**Expected:**
- [ ] Application record created
- [ ] Notification record created
- [ ] Activity log entry created
- [ ] All or nothing (atomic)

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 8.2 Status Change with History
**Risk:** Status changed without audit trail

**Steps:**
1. Recruiter changes application status
2. Check database

**Expected:**
- [ ] Application status updated
- [ ] Application event record created
- [ ] Timestamp accurate
- [ ] User ID recorded

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 8.3 Chat Room Creation
**Risk:** Room created without proper linking

**Steps:**
1. Start chat from applicant
2. Check database

**Expected:**
- [ ] Chat room created
- [ ] Job ID linked
- [ ] Candidate ID linked
- [ ] Recruiter ID linked
- [ ] First message created

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 8.4 Subscription with Usage Tracking
**Risk:** Usage not tracked per subscription

**Steps:**
1. User with subscription uses AI features
2. Check usage tracking

**Expected:**
- [ ] Usage recorded
- [ ] Feature name logged
- [ ] Date logged
- [ ] User ID linked
- [ ] Count accurate

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 8.5 Cascading Deletes
**Risk:** Orphaned records on deletion

**Steps:**
1. Delete job posting
2. Check related tables

**Expected:**
- [ ] Job deleted
- [ ] Applications deleted (or kept with null job)
- [ ] Chat rooms deleted
- [ ] Exams deleted
- [ ] No foreign key constraint errors

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Integration Testing Tools

### Stripe CLI Commands
```bash
# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/stripe/webhook

# Trigger specific events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

### Database Queries for Verification
```sql
-- Check subscription status
SELECT * FROM user_subscriptions WHERE user_id = '...';

-- Check notification delivery
SELECT * FROM notifications WHERE user_id = '...' ORDER BY created_at DESC;

-- Check external jobs deduplication
SELECT external_id, source, COUNT(*) 
FROM job_postings 
WHERE external_id IS NOT NULL 
GROUP BY external_id, source 
HAVING COUNT(*) > 1;

-- Check orphaned records
SELECT * FROM job_applications 
WHERE job_id NOT IN (SELECT id FROM job_postings);
```

### Cache Inspection
```javascript
// In browser console
// Check TanStack Query cache
const qc = window.queryClient;
console.log(qc.getQueryCache().getAll());

// Invalidate specific queries
qc.invalidateQueries({ queryKey: ['profile'] });
```

### WebSocket Testing
```javascript
// Check WebSocket connection
const ws = new WebSocket('ws://localhost:5000?userId=...');
ws.onmessage = (event) => console.log('Received:', event.data);
ws.send(JSON.stringify({ type: 'ping' }));
```

---

## Debugging Integration Issues

### Stripe Webhook Failures
1. Check Stripe Dashboard → Developers → Webhooks
2. Verify endpoint URL is accessible
3. Check webhook signature verification code
4. Review failed webhook logs in Stripe

### Notification Not Received
1. Check WebSocket connection status
2. Verify notification created in database
3. Check notification preferences
4. Review notification service logs
5. Test polling fallback

### Cache Not Invalidating
1. Check TanStack Query devtools
2. Verify mutation `onSuccess` invalidates queries
3. Check for optimistic updates preventing refetch
4. Review staleTime configuration

### Database Inconsistency
1. Run ACID compliance queries
2. Check for missing foreign key constraints
3. Review transaction boundaries
4. Check for race conditions

---

## Summary

**Total Categories:** 8  
**Integration Points:** Stripe, WebSocket, Cache, External APIs, Database  
**Estimated Time:** 20-25 minutes  

**Success Criteria:**
- Webhooks processed correctly with signature verification
- Notifications delivered via all channels
- Cache invalidates properly on mutations
- Real-time features work with fallback
- Background jobs complete successfully
- Data remains consistent across operations

**Automated Testing Recommendations:**
Consider automating these tests:
- Stripe webhook signature verification (unit test)
- Database transaction integrity (integration test)
- Cache invalidation patterns (unit test)
- WebSocket reconnection (e2e test with Cypress/Playwright)

---

**Tested By:** ___________________  
**Date:** ___________________  
**Issues Found:** ___________________
