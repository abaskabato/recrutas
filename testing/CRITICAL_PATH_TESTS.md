# Recrutas Testing Playbook - Critical Path Tests

**Version:** 1.0  
**Last Updated:** 2026-02-08  
**App Version:** Compatible with current main branch  
**Estimated Time:** 25-30 minutes  

---

## Quick Status Tracker

| # | Test Category | Status | Notes |
|---|---------------|--------|-------|
| 1 | Authentication - Email/Password | ⬜ | |
| 2 | Authentication - OAuth | ⬜ | |
| 3 | Candidate Onboarding | ⬜ | |
| 4 | Recruiter Onboarding | ⬜ | |
| 5 | Job Creation | ⬜ | |
| 6 | Job Application | ⬜ | |
| 7 | Application Review | ⬜ | |
| 8 | Chat System | ⬜ | |
| 9 | Profile Management | ⬜ | |
| 10 | Payment - View Pricing | ⬜ | |
| 11 | Payment - Checkout | ⬜ | |
| 12 | Payment - Subscription Management | ⬜ | |
| 13 | Notifications | ⬜ | |
| 14 | Job Discovery | ⬜ | |
| 15 | Exam System | ⬜ | |

**Legend:**
- ⬜ Not Tested
- 🟡 In Progress  
- ✅ Pass
- ❌ Fail

---

## Prerequisites

### Environment Setup
```bash
# Start the development servers
npm run dev:all
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Test Accounts Needed
You will need **2 real email addresses** (the app sends actual emails):
- **Candidate Email:** ___________________
- **Recruiter Email:** ___________________

### Browsers
- Use **Chrome/Firefox** for Candidate
- Use **Safari/Edge (Incognito)** for Recruiter  
(Avoid session conflicts)

---

## Test 1: Authentication - Email/Password

### 1.1 Candidate Sign Up
**Setup:** Use new browser/incognito window

**Steps:**
1. Navigate to `/signup/candidate`
2. Enter valid email address (not used before)
3. Enter password (minimum 8 characters, 1 uppercase, 1 number)
4. Click "Sign Up"
5. Check email for verification (if enabled in env)

**Expected:**
- [ ] Redirect to `/role-selection`
- [ ] User created in database
- [ ] No console errors

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 1.2 Login
**Steps:**
1. Navigate to `/auth`
2. Enter email from Test 1.1
3. Enter correct password
4. Click "Sign In"

**Expected:**
- [ ] Login successful
- [ ] Redirect to appropriate dashboard based on role
- [ ] JWT token stored in cookies/localStorage

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 1.3 Login with Wrong Password
**Steps:**
1. Navigate to `/auth`
2. Enter valid email
3. Enter wrong password
4. Click "Sign In"

**Expected:**
- [ ] Error message displayed: "Invalid credentials" or similar
- [ ] Form stays on page (no redirect)
- [ ] No stack trace exposed

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 1.4 Password Reset Flow
**Steps:**
1. Click "Forgot Password" on `/auth`
2. Enter candidate email
3. Click "Send Reset Link"
4. Check email inbox (may take 1-2 minutes)
5. Click reset link in email
6. Enter new password (different from old)
7. Confirm password
8. Click "Reset Password"
9. Login with new password

**Expected:**
- [ ] Reset email received within 2 minutes
- [ ] Reset link works (not expired)
- [ ] Password updated successfully
- [ ] Can login with new password
- [ ] Old password no longer works

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 2: Authentication - OAuth (if configured)

### 2.1 Google OAuth Sign Up
**Prerequisites:** Google OAuth configured in environment

**Steps:**
1. Navigate to `/auth`
2. Click "Continue with Google"
3. Select Google account (different email than Test 1)
4. Authorize the app

**Expected:**
- [ ] Redirect to Google auth page
- [ ] After authorization, redirect to `/role-selection`
- [ ] User created with Google email

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 2.2 GitHub OAuth Sign Up  
**Prerequisites:** GitHub OAuth configured in environment

**Steps:**
1. Navigate to `/auth`
2. Click "Continue with GitHub"
3. Authorize the app

**Expected:**
- [ ] Redirect to GitHub auth page
- [ ] After authorization, redirect to `/role-selection`
- [ ] User created with GitHub email

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 3: Candidate Onboarding

### 3.1 Role Selection
**Prerequisites:** Fresh candidate account (no role set)

**Steps:**
1. After signup/login, should be on `/role-selection`
2. Select "Candidate" (Job Seeker)
3. Click "Continue"

**Expected:**
- [ ] POST to `/api/auth/role` succeeds
- [ ] Progress bar shows Step 2 of 4
- [ ] Redirects to Resume Upload step

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 3.2 Resume Upload
**Prerequisites:** Valid PDF resume file (under 4MB)

**Steps:**
1. On Resume Upload step, click "Upload Resume"
2. Select a valid PDF resume file
3. Wait for upload
4. Observe processing banner

**Expected:**
- [ ] File upload succeeds (check Network tab)
- [ ] "Analyzing Your Resume" banner appears
- [ ] Polling starts (check console for status checks)
- [ ] Processing completes within 60 seconds
- [ ] AI-extracted skills appear in Skills step

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 3.3 Basic Info Step
**Steps:**
1. Fill in:
   - First Name: "Test"
   - Last Name: "Candidate"
   - Location: "San Francisco, CA"
   - Salary Min: 80000
   - Salary Max: 120000
   - Work Type: "Remote"
   - LinkedIn URL: "https://linkedin.com/in/testcandidate"
2. Click "Continue"

**Expected:**
- [ ] All fields save successfully
- [ ] Validation prevents invalid URLs
- [ ] Salary max > min validation works
- [ ] Progress to Skills step

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 3.4 Skills Step & Completion
**Steps:**
1. Review AI-extracted skills
2. Add a skill manually: "React"
3. Remove a skill if needed
4. Click "Complete Setup"

**Expected:**
- [ ] Skills saved to profile
- [ ] POST to `/api/candidate/profile` succeeds
- [ ] Redirect to `/candidate-dashboard`
- [ ] Profile completion shows 100%

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 4: Recruiter Onboarding

### 4.1 Role Selection
**Setup:** Use different browser/incognito window with new email

**Steps:**
1. Sign up at `/signup/talent-owner`
2. Navigate to `/role-selection`
3. Select "Talent Owner" (Recruiter)
4. Click "Continue"

**Expected:**
- [ ] POST to `/api/auth/role` succeeds
- [ ] Progress bar shows Step 2 of 2
- [ ] Redirects to Company Profile step

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 4.2 Company Profile
**Steps:**
1. Fill in:
   - Job Title: "Senior Software Engineer"
   - Company Name: "TestCorp Inc"
   - Company Website: "https://testcorp.com"
   - Company Size: "11-50 employees"
   - Industry: "Technology"
   - Company Location: "San Francisco, CA"
   - Company Description: "A test company for QA"
2. Click "Complete Setup"

**Expected:**
- [ ] All fields validate correctly
- [ ] Website URL format validation
- [ ] POST to `/api/talent-owner/profile/complete` succeeds
- [ ] Redirect to `/talent-dashboard`
- [ ] Company profile created

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 5: Job Creation

### 5.1 Create Job Posting
**Setup:** Logged in as recruiter

**Steps:**
1. On talent dashboard, click "Create Job" or "+"
2. Step 1 - Basic Info:
   - Job Title: "Frontend Developer"
   - Company: "TestCorp Inc"
   - Description: "We're looking for a React developer..."
3. Step 2 - Requirements & Skills:
   - Requirements: "3+ years React experience"
   - Required Skills: React, TypeScript, Tailwind CSS
   - Location: Remote
   - Salary Range: $80k - $120k
   - Work Type: Remote
   - Industry: Technology
4. Step 3 - Filtering Exam:
   - Check "Require Exam"
   - Set passing score: 70%
   - Add 3 questions (2 multiple choice, 1 short answer)
5. Step 4 - Connection Setup:
   - Add hiring manager email
6. Click "Post Job"

**Expected:**
- [ ] Validation per step prevents progression with errors
- [ ] POST to `/api/jobs` succeeds
- [ ] Job appears in "Jobs" tab with "Active" status
- [ ] Exam created in database
- [ ] No console errors

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 5.2 Job Appears in Candidate Feed
**Setup:** Switch to candidate browser

**Steps:**
1. Navigate to candidate dashboard
2. Go to "Job Feed" tab
3. Search for "Frontend Developer" or "TestCorp"

**Expected:**
- [ ] Job appears in feed
- [ ] AI match score displayed (if skills match)
- [ ] Job details render correctly

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 6: Job Application

### 6.1 Apply to Job
**Setup:** Logged in as candidate with complete profile

**Steps:**
1. Find the job created in Test 5
2. Click "Apply"
3. If exam required, complete exam (see Test 15)
4. Confirm application

**Expected:**
- [ ] POST to `/api/candidate/apply/:jobId` succeeds
- [ ] Success message shown
- [ ] Cannot apply again (duplicate prevention)
- [ ] Application appears in "Applications" tab
- [ ] Status shows "Submitted"

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 6.2 Duplicate Application Prevention
**Steps:**
1. Try to apply to same job again

**Expected:**
- [ ] Error message: "You have already applied to this job"
- [ ] Application not duplicated in database

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 7: Application Review

### 7.1 View Applicant
**Setup:** Logged in as recruiter

**Steps:**
1. On talent dashboard, go to "Jobs" tab
2. Find the job from Test 5
3. Click "View Applicants"

**Expected:**
- [ ] Applicant from Test 6 appears in list
- [ ] Applicant details visible (name, skills, resume)
- [ ] AI match score displayed
- [ ] Application status shows "Submitted"

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 7.2 Update Application Status
**Steps:**
1. Click on applicant name
2. Change status to "Viewed"
3. Change status to "Screening"
4. Add notes if available

**Expected:**
- [ ] PUT to `/api/applications/:id/status` succeeds
- [ ] Status updates in real-time
- [ ] Applicant receives notification (see Test 13)

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 8: Chat System

### 8.1 Start Chat from Recruiter Side
**Setup:** Logged in as recruiter

**Steps:**
1. In applicant view, click "Message" or "Send Message"
2. Type: "Hi! Thanks for applying. We'd like to learn more."
3. Click Send

**Expected:**
- [ ] POST to `/api/chat/rooms/create` succeeds (if new room)
- [ ] POST to `/api/chat/rooms/:id/messages` succeeds
- [ ] Message appears in chat
- [ ] Timestamp shows correctly

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 8.2 Receive and Reply as Candidate
**Setup:** Switch to candidate browser

**Steps:**
1. Wait for notification (or navigate to `/chat`)
2. Click on chat room
3. Read message from recruiter
4. Reply: "Thanks for reaching out! I'm excited about the opportunity."
5. Click Send

**Expected:**
- [ ] Notification received (bell icon/badge)
- [ ] Chat room appears in list
- [ ] Message from recruiter visible
- [ ] Reply sends successfully
- [ ] Recruiter receives notification

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 8.3 Real-time Message Delivery
**Steps:**
1. Keep both browsers open side-by-side
2. Send message from recruiter
3. Observe candidate screen

**Expected:**
- [ ] Message appears on candidate screen within 5 seconds
- [ ] No page refresh required
- [ ] WebSocket or polling working

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 9: Profile Management

### 9.1 Edit Candidate Profile
**Setup:** Logged in as candidate

**Steps:**
1. Navigate to profile/settings
2. Update location: "New York, NY"
3. Add skill: "Node.js"
4. Update salary range
5. Save changes
6. Refresh page

**Expected:**
- [ ] Changes save successfully
- [ ] Persist after page refresh
- [ ] Updates reflect in job matching

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 9.2 Re-upload Resume
**Steps:**
1. Upload different resume (PDF)
2. Wait for processing
3. Verify new skills extracted

**Expected:**
- [ ] Upload succeeds
- [ ] AI re-parses resume
- [ ] New skills appear
- [ ] Old skills replaced or merged

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 10: Payment - View Pricing

### 10.1 View Pricing Page (Not Logged In)
**Setup:** Log out or use incognito

**Steps:**
1. Navigate to `/pricing`

**Expected:**
- [ ] Both candidate and recruiter plans visible
- [ ] Toggle monthly/yearly works
- [ ] Feature comparison table visible
- [ ] CTA buttons redirect to signup

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 10.2 View Pricing Page (Logged In)
**Setup:** Log in as free candidate

**Steps:**
1. Navigate to `/pricing`
2. Toggle between monthly/yearly

**Expected:**
- [ ] Current plan marked as "Current"
- [ ] Upgrade buttons available
- [ ] Prices update on toggle

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 11: Payment - Checkout

### 11.1 Stripe Checkout Flow
**Prerequisites:** Stripe test mode configured

**Setup:** Logged in as free candidate

**Steps:**
1. Go to `/pricing`
2. Select "Pro" plan
3. Click "Upgrade"
4. **Use Stripe test card:** `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
5. Complete checkout

**Expected:**
- [ ] Redirected to Stripe checkout page
- [ ] Test mode badge visible
- [ ] Payment succeeds
- [ ] Redirected back to app
- [ ] Subscription status updated to "active"
- [ ] Pro features unlocked

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 11.2 Failed Payment Handling
**Steps:**
1. Try checkout with declined card: `4000 0000 0000 0002`

**Expected:**
- [ ] Error message shown
- [ ] Can retry with different card
- [ ] Subscription not created

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 12: Payment - Subscription Management

### 12.1 View Subscription Status
**Setup:** User with active subscription

**Steps:**
1. Navigate to subscription settings
2. View current plan

**Expected:**
- [ ] Current plan displayed correctly
- [ ] Billing cycle shown (monthly/yearly)
- [ ] Next billing date visible

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 12.2 Access Customer Portal
**Steps:**
1. Click "Manage Subscription"
2. Complete Stripe portal authentication if needed

**Expected:**
- [ ] Stripe customer portal opens
- [ ] Can view invoices
- [ ] Can update payment method
- [ ] Can cancel subscription

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 13: Notifications

### 13.1 Receive Application Status Notification
**Setup:** Both candidate and recruiter logged in

**Steps:**
1. As recruiter, update candidate's application status (Test 7.2)
2. As candidate, watch notification bell

**Expected:**
- [ ] Notification badge appears
- [ ] Notification shows correct status change
- [ ] Clicking notification navigates to relevant page

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 13.2 Mark Notifications as Read
**Steps:**
1. Open notification dropdown
2. Click "Mark all as read"

**Expected:**
- [ ] Badge disappears
- [ ] Notifications marked as read in database
- [ ] Persist after refresh

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 13.3 Email Notifications (High Priority)
**Setup:** Configure high-priority notification trigger

**Steps:**
1. Trigger high-priority event (e.g., interview scheduled)
2. Check email inbox

**Expected:**
- [ ] Email received within 2 minutes
- [ ] Email contains relevant details
- [ ] Links in email work correctly

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 14: Job Discovery

### 14.1 AI Job Matching
**Setup:** Candidate with skills: React, TypeScript, Node.js

**Steps:**
1. Navigate to Job Feed
2. Review AI-matched jobs

**Expected:**
- [ ] Jobs with matching skills show high match scores (>70%)
- [ ] Match explanation visible
- [ ] Irrelevant jobs filtered out or low scores

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 14.2 External Jobs Integration
**Steps:**
1. Scroll through job feed
2. Look for external job badges

**Expected:**
- [ ] External jobs marked with source (e.g., "from Greenhouse")
- [ ] Trust scores displayed
- [ ] Clicking redirects to external application

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Test 15: Exam System

### 15.1 Take Screening Exam
**Setup:** Job with exam requirement (from Test 5)

**Steps:**
1. As candidate, apply to exam-required job
2. Read exam introduction
3. Click "Start Exam"
4. Answer all questions
5. Submit exam

**Expected:**
- [ ] Exam questions load correctly
- [ ] Timer displays (if time-limited)
- [ ] Can navigate between questions
- [ ] Submit succeeds
- [ ] Score calculated correctly
- [ ] Pass/fail status shown

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

### 15.2 Exam Results for Recruiter
**Setup:** Logged in as recruiter

**Steps:**
1. View applicant who took exam
2. Check exam results

**Expected:**
- [ ] Score visible
- [ ] Individual answers viewable
- [ ] Pass/fail status clear
- [ ] High scores trigger notifications

**Actual Result:**
```
Status: ⬜ PASS / ⬜ FAIL
Notes:
```

---

## Debugging Guide

### When Tests Fail

#### Authentication Issues
- Check browser console for JWT errors
- Verify Supabase auth configuration
- Check network tab for 401/403 responses
- Clear cookies/localStorage and retry

#### Resume Upload Failures
- Verify file is under 4MB
- Check magic bytes validation (PDF: `%PDF`, DOC: `D0 CF 11 E0`)
- Check Supabase storage bucket exists: `resumes`
- Check server logs for AI parsing errors

#### Payment Failures
- Verify Stripe test mode: `pk_test_*` keys
- Check webhook endpoint is accessible
- Review Stripe dashboard for failed events
- Check server logs for webhook errors

#### Chat/Notification Issues
- Check WebSocket connection in Network tab
- Verify polling fallback if WebSocket fails
- Check server logs for notification service errors
- Verify notification preferences in database

#### Database Timeout Errors
- Profile fetch has 15-second timeout
- Resume processing has 60-second timeout
- Check database connection pool (limited to 1-3 in serverless)
- Retry the operation

### Log Locations

**Server Logs:**
```bash
# In terminal running npm run dev:server
tail -f server.log
```

**Browser Console:**
- Chrome/Firefox DevTools → Console tab
- Filter by "error" or "warning"

**Supabase Logs:**
- Supabase Dashboard → Logs → API/Auth/Storage

---

## Summary

**Total Tests:** 15 categories, 30+ individual test cases  
**Estimated Time:** 25-30 minutes  
**Critical Success Criteria:**
- All authentication flows work
- Job application end-to-end works
- Chat system functions
- Payment processing succeeds
- No console errors during normal flow

**Next Steps After Completion:**
1. If all pass: Run Edge Cases & Security Tests
2. If failures found: Document and fix before proceeding
3. Update this document with any discovered issues

---

**Tested By:** ___________________  
**Date:** ___________________  
**App Version/Commit:** ___________________
