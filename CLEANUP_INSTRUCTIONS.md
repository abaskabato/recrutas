# After Download: Cleanup Instructions

## Step 1: Download and Extract
1. Download the zip file from Replit
2. Extract to a folder on your computer
3. Open terminal/command prompt in the extracted folder

## Step 2: Run Cleanup Script
```bash
node scripts/cleanup-for-github.js
```

This will automatically remove:
- `.replit` and `replit.nix` files
- `node_modules/` directory (large, not needed)
- `uploads/` directory (user files)
- `attached_assets/` (your screenshots)
- Test files (`test-*.js`)
- Temporary files

## Step 3: Manual Check
After running the script, verify these files are gone:
- `.replit` ❌
- `replit.nix` ❌
- `node_modules/` ❌
- `uploads/` ❌

## Step 4: GitHub Upload
Your project is now clean and ready for GitHub:
- All source code preserved
- Documentation included
- Deployment configs ready
- No Replit-specific files

## Alternative: Manual Deletion
If the script doesn't work, manually delete these items:
```
.replit
replit.nix
.config/
node_modules/
uploads/
attached_assets/
cookies.txt
temp-backup.ts
test-ai-matching.js
test-custom-exam-demo.js
test-dynamic-matching.js
test-exam-workflow.js
test-hiring-cafe.js
test-job-title-filtering.js
test-new-job-visibility.js
test-scraping.js
```

The cleanup script will save you time and ensure your GitHub repository is production-ready.