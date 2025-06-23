# Quick GitHub Setup - File Size Solution

## Problem: GitHub upload limit exceeded due to large files

## Solution: Use Git command line instead of drag-and-drop

### Step 1: Download and Clean
1. Download zip from Replit
2. Extract to folder
3. Double-click `cleanup-windows.bat` to remove large files

### Step 2: Initialize Git Repository
Open terminal in your project folder and run:

```bash
git init
git add .
git commit -m "Initial commit - AI-powered talent acquisition platform"
```

### Step 3: Connect to GitHub
1. Create repository at github.com/new named "recrutas" (public)
2. Copy the repository URL
3. Run these commands:

```bash
git remote add origin https://github.com/yourusername/recrutas.git
git push -u origin main
```

### Alternative: GitHub CLI (if installed)
```bash
gh repo create recrutas --public --source=. --remote=origin --push
```

## Why This Works
- Git automatically respects .gitignore file
- Only uploads necessary source code
- Bypasses GitHub's web interface file size limits
- Professional developer workflow

## File Size After Cleanup
- Before: ~200MB (with node_modules)
- After: ~5MB (source code only)

Your repository will be immediately ready for deployment to Vercel with all functionality intact.