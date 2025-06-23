# Manual Cleanup Guide

Since the script cannot run in Replit, here's what to delete manually after downloading:

## Files to Delete After Download

### Replit Configuration Files
- `.replit`
- `replit.nix`
- `.config/` (if exists)

### Large Directories (Not Needed)
- `node_modules/`
- `dist/`
- `.git/`

### User Data & Temporary Files
- `uploads/`
- `attached_assets/`
- `cookies.txt`
- `temp-backup.ts`

### Test Files
- `test-ai-matching.js`
- `test-custom-exam-demo.js`
- `test-dynamic-matching.js`
- `test-exam-workflow.js`
- `test-hiring-cafe.js`
- `test-job-title-filtering.js`
- `test-new-job-visibility.js`
- `test-scraping.js`

## After Cleanup, You Should Have:

### Root Files
- `README.md`
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `tailwind.config.ts`
- `.env.example`
- `.gitignore`

### Directories
- `client/`
- `server/`
- `shared/`
- `scripts/`

### Documentation
- `CONTRIBUTING.md`
- `DEPLOYMENT.md`
- `LICENSE`
- All other .md files

### Deployment Configs
- `vercel.json`
- `Dockerfile`
- `docker-compose.yml`
- `railway.json`
- `render.yaml`
- `app.json`

The cleanup script will work on your local machine after download. Your project is ready for GitHub upload once these files are removed.