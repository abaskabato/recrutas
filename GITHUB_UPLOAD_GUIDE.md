# GitHub Repository Upload Guide

## Files to Include ✅

### Root Files
- `README.md`
- `CONTRIBUTING.md`
- `DEPLOYMENT.md`
- `LICENSE`
- `QUICK_START.md`
- `PITCH_DECK.md`
- `YC_DEMO_CHECKLIST.md`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `tailwind.config.ts`
- `postcss.config.js`
- `components.json`
- `drizzle.config.ts`
- `.env.example`
- `.gitignore`

### Deployment Configurations
- `vercel.json`
- `netlify.toml`
- `railway.json`
- `render.yaml`
- `app.json`
- `Dockerfile`
- `docker-compose.yml`

### GitHub Templates
- `.github/workflows/ci.yml`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/SECURITY.md`

### Source Code
- `client/` (entire directory)
- `server/` (entire directory)
- `shared/` (entire directory)
- `scripts/` (entire directory)

## Files to Exclude ❌

### Replit-Specific Files
- `.replit`
- `replit.nix`
- `.config/` (if exists)

### Development Files
- `node_modules/`
- `dist/`
- `.env`
- `.git/` (any existing git history)
- `uploads/` (user-uploaded files)
- `cookies.txt`

### Temporary Files
- `temp-backup.ts`
- `test-*.js` files
- `attached_assets/` (your screenshots)

## Quick Upload Process

1. **Download Method 1 - Individual Files:**
   - Select all files from the "Include" list above
   - Download each file individually from Replit

2. **Download Method 2 - Bulk Download:**
   - Use Replit's download feature
   - Delete the excluded files from your local copy

3. **Create GitHub Repository:**
   - Go to github.com/new
   - Name: `recrutas`
   - Public repository
   - Upload all included files

4. **Verify Upload:**
   - Check that `.replit` is not in the repository
   - Ensure all documentation files are present
   - Verify source code directories are complete

The repository will be clean and ready for production deployment without any Replit-specific configurations.