# CREDENTIAL ROTATION - URGENT ACTION REQUIRED

**Status:** CRITICAL SECURITY ISSUE 🔴  
**Date:** 2026-02-08  
**Issue:** Database credentials exposed in git history

---

## 🚨 IMMEDIATE ACTION REQUIRED

### What Happened:
`.env.production` file with real database credentials was committed to git.

### What's Exposed:
- Database URL with password
- Direct database connection string
- API keys

### Risk:
Anyone with git access can see production credentials.

---

## ✅ STEPS TO FIX

### Step 1: Remove from Git (Do Now)

```bash
# Remove .env.production from git tracking (keep local file)
git rm --cached .env.production

# Commit the removal
git commit -m "Remove .env.production from git - security fix"

# Push
git push origin main
```

---

### Step 2: Rotate Supabase Credentials (CRITICAL)

1. **Login to Supabase Dashboard:**
   - URL: https://app.supabase.com
   - Project: recrutas (fgdxsvlamtinkepfodfj)

2. **Rotate Database Password:**
   - Go to Project Settings → Database
   - Click "Reset Database Password"
   - Generate new strong password
   - **IMPORTANT:** This will disconnect existing connections

3. **Update Connection Strings:**
   - Copy new connection strings
   - Update your local `.env` file
   - Update production environment variables (Vercel)

4. **Test Connection:**
   ```bash
   npm run db:push
   ```

---

### Step 3: Rotate API Keys

**News API Key:**
- Current key exposed: `8653818ad98f4e3b86182c3f9702028e`
- Action: Generate new key at newsapi.org
- Update in Vercel environment variables

**Other Keys to Check:**
- OpenAI API key
- Groq API key
- SendGrid API key
- Stripe keys
- OAuth secrets

---

### Step 4: Clean Git History (Optional but Recommended)

If you want to completely remove credentials from git history:

```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove file from all history
git filter-repo --path .env.production --invert-paths

# Force push (WARNING: Rewrites history)
git push origin main --force
```

⚠️ **WARNING:** This rewrites git history. Coordinate with team.

---

### Step 5: Update Vercel Environment Variables

1. Go to Vercel Dashboard
2. Select recrutas project
3. Go to Settings → Environment Variables
4. Update:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - Any exposed API keys
5. Redeploy

---

### Step 6: Verify No Other Exposed Files

```bash
# Search for potential credential files in git
git log --all --full-history -- '*.env*'
git log --all --full-history -- '**/config.*'

# Check for secrets in code
grep -r "password\|secret\|key" --include="*.ts" --include="*.js" | grep -v node_modules | grep -v ".env"
```

---

### Step 7: Add Pre-Commit Hooks

Prevent future credential commits:

```bash
# Install pre-commit
npm install --save-dev pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: detect-private-key
      - id: detect-aws-credentials
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
EOF

# Install hooks
pre-commit install
```

---

## 📋 VERIFICATION CHECKLIST

- [ ] `.env.production` removed from git
- [ ] Supabase password rotated
- [ ] New connection strings tested
- [ ] API keys rotated
- [ ] Vercel env vars updated
- [ ] Production redeployed
- [ ] Application working
- [ ] Pre-commit hooks installed

---

## 🎯 TIMELINE

**Critical:** Complete steps 1-3 within 24 hours
**Important:** Complete steps 4-7 within 1 week

---

## 🆘 NEED HELP?

**Supabase Password Reset:**
- Docs: https://supabase.com/docs/guides/database/postgres/roles
- Support: https://supabase.com/support

**Vercel Environment Variables:**
- Docs: https://vercel.com/docs/concepts/projects/environment-variables

**Git History Rewrite:**
- Docs: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

---

**Status:** Awaiting action
**Assigned:** Senior Engineers / DevOps
**Priority:** CRITICAL 🔴
