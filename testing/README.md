# Recrutas Testing Playbook - Master Index

**Welcome to the comprehensive testing documentation for Recrutas!**

---

## 📚 Documentation Structure

### 1. **CRITICAL_PATH_TESTS.md** (Start Here!)
**Estimated Time:** 25-30 minutes  
**Priority:** 🔴 CRITICAL

**What it covers:**
- Authentication (email, OAuth, password reset)
- Candidate onboarding (4-step flow)
- Recruiter onboarding (2-step flow)
- Job creation and application
- Application review and status updates
- Chat system
- Profile management
- Payment flows (Stripe)
- Notifications
- Job discovery (AI matching)
- Exam system

**When to use:**
- Before every release
- After major feature changes
- When validating core functionality

---

### 2. **EDGE_CASES_SECURITY.md** (High Priority)
**Estimated Time:** 30-40 minutes  
**Priority:** 🟠 HIGH

**What it covers:**
- File upload security (magic bytes validation)
- AI service fallback chains (Groq → Ollama → HuggingFace)
- Network interruption handling
- Timeout behaviors (15s profile, 60s resume)
- Concurrent operations
- Input validation (XSS, SQL injection)
- Session management
- Database resilience
- External API failures

**When to use:**
- After security updates
- Before production deployment
- When testing error handling
- Validating resilience

**⚠️ Addresses Known Issues:**
- 4 empty catch blocks (silent failures)
- 100+ `any` types (type safety)
- Memory leak in cache
- Database connection pool limits

---

### 3. **INTEGRATION_CHECKLIST.md** (Medium Priority)
**Estimated Time:** 20-25 minutes  
**Priority:** 🟡 MEDIUM

**What it covers:**
- Stripe webhook handling
- Notification cascade (WebSocket → polling → email)
- Cache invalidation (TanStack Query)
- Real-time features
- Background jobs
- Multi-step workflows
- External job scraping
- Data consistency (ACID)

**When to use:**
- Integration testing phase
- Cross-system validation
- Regression testing
- Performance validation

---

## 🎯 Quick Start Guide

### For Release Testing (30 minutes):
1. ✅ Run **CRITICAL_PATH_TESTS.md** (all 15 tests)
2. ✅ Check console for errors
3. ✅ Test on mobile (responsive)
4. ✅ Done!

### For Production Readiness (1 hour):
1. ✅ Complete **CRITICAL_PATH_TESTS.md**
2. ✅ Complete **EDGE_CASES_SECURITY.md**
3. ✅ Spot check **INTEGRATION_CHECKLIST.md**
4. ✅ Review all "Notes" sections for issues
5. ✅ Fix critical issues, re-test

### For Comprehensive Testing (1.5 hours):
1. ✅ All tests from all 3 documents
2. ✅ Document all findings
3. ✅ Create issues for failures
4. ✅ Validate fixes

---

## 🔧 Prerequisites Checklist

Before starting tests:

- [ ] Environment running: `npm run dev:all`
- [ ] Frontend: http://localhost:5173
- [ ] Backend: http://localhost:5000
- [ ] Database: Connected and migrated
- [ ] Test emails ready (2 real email addresses)
  - Candidate: ___________________
  - Recruiter: ___________________
- [ ] Stripe test mode configured (for payment tests)
- [ ] Different browsers ready (avoid session conflicts)

---

## 📊 Testing Status Dashboard

Use this to track overall progress:

| Document | Total Tests | Passed | Failed | Notes |
|----------|-------------|--------|--------|-------|
| Critical Path | 30+ | ⬜ | ⬜ | |
| Edge Cases | 45+ | ⬜ | ⬜ | |
| Integration | 25+ | ⬜ | ⬜ | |
| **TOTAL** | **100+** | **⬜** | **⬜** | |

---

## 🐛 Common Issues Quick Reference

### Authentication Fails
- Check Supabase credentials
- Verify JWT expiration
- Clear cookies/localStorage

### Resume Upload Fails
- Check file < 4MB
- Verify PDF magic bytes (`%PDF`)
- Check Supabase storage bucket `resumes`

### AI Features Not Working
- Verify Groq/OpenAI API keys
- Check fallback chain in logs
- Review rate limits

### Payment Fails
- Use Stripe test mode keys (`pk_test_*`)
- Verify webhook endpoint accessible
- Check webhook signature verification

### Notifications Not Received
- Check WebSocket connection
- Verify notification preferences
- Test polling fallback

---

## 📝 How to Report Issues

When tests fail, document:

```
Test: [Test Name]
Status: ❌ FAIL
Severity: [Critical/High/Medium/Low]

Steps to Reproduce:
1. 
2. 
3. 

Expected:
- 

Actual:
- 

Browser Console Errors:
- 

Server Logs:
- 

Screenshots: [Attach if applicable]

Suggested Fix:
- 
```

---

## 🔄 Maintenance

**Update this playbook when:**
- New features added
- Critical bugs fixed
- Architecture changes
- New integrations added

**Version History:**
- v1.0 (2026-02-08) - Initial comprehensive testing playbook

---

## 🆘 Getting Help

### Debug Resources:
1. Browser DevTools (F12) → Console/Network tabs
2. Server logs in terminal running `npm run dev:server`
3. Supabase Dashboard → Logs
4. Stripe Dashboard → Developers → Logs

### Useful Commands:
```bash
# Check server logs
tail -f server.log

# Test database connection
npm run db:push

# Stripe webhook testing
stripe listen --forward-to localhost:5000/api/stripe/webhook

# Run specific test file
npx jest test/resume-service-integration.test.ts
```

---

**Ready to start testing? Begin with CRITICAL_PATH_TESTS.md!**

**Questions or issues?** Document them in the test notes sections.

**Happy Testing! 🚀**
