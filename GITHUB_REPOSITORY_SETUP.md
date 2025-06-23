# Complete GitHub Repository Setup for YC Application

## Step 1: Create GitHub Repository

1. **Go to GitHub.com** and click "New repository"
2. **Repository Details:**
   - Name: `recrutas`
   - Description: `AI-Powered Talent Acquisition Platform that eliminates recruiters through direct candidate-to-hiring manager matching. Features custom exams, merit-based chat access, and real-time job aggregation from 500+ companies.`
   - Visibility: **Public** (important for YC visibility)
   - Initialize: **Do not** initialize with README, .gitignore, or license (we have our own)

## Step 2: Upload Your Code

### Option A: GitHub Web Interface (Easiest)
1. **Download all files** from your Replit environment
2. **Compress into ZIP** (exclude .replit, replit.nix files)
3. **Drag and drop** ZIP file to GitHub repository
4. **Commit message**: `feat: initial commit - AI-powered talent acquisition platform`

### Option B: Git Command Line
```bash
# In your local copy of the Replit files
git init
git add .
git commit -m "feat: initial commit - AI-powered talent acquisition platform"
git branch -M main
git remote add origin https://github.com/yourusername/recrutas.git
git push -u origin main
```

## Step 3: Configure Repository Settings

### Repository Settings
- **Topics**: Add these tags: `talent-acquisition`, `ai-matching`, `job-platform`, `hiring`, `recruitment`, `yc-application`, `react`, `typescript`, `nodejs`
- **Features**: Enable Issues, Projects, Wiki, Discussions
- **Social Preview**: Upload a screenshot of your platform

### Branch Protection (Optional)
- Protect main branch
- Require pull request reviews
- Require status checks

## Step 4: Deploy Demo to Vercel

### Quick Vercel Deployment
1. **Go to vercel.com** and sign up/login
2. **Import Git Repository** - select your GitHub repo
3. **Framework Preset**: Detected automatically (Vite)
4. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist/public`
   - Install Command: `npm install`

### Environment Variables in Vercel
Add these in Vercel dashboard:
```
DATABASE_URL=postgresql://your-supabase-url
OPENAI_API_KEY=sk-your-openai-key
SESSION_SECRET=recrutas-yc-demo-secret-32-chars-min
REPLIT_DOMAINS=your-app.vercel.app
```

### Get Demo Database (Supabase)
1. **Sign up at supabase.com**
2. **Create new project** named "recrutas-demo"
3. **Copy connection string** from Settings > Database
4. **Add to Vercel** as DATABASE_URL

## Step 5: Populate Demo Data

After deployment, run this in Vercel Functions or locally:
```bash
# Install dependencies
npm install

# Run database migrations
npm run db:push

# Seed with demo data
npm run seed:demo
```

## Step 6: YC Application Integration

### Repository URLs for YC Application
- **GitHub Repository**: https://github.com/yourusername/recrutas
- **Live Demo**: https://your-app.vercel.app
- **Documentation**: https://github.com/yourusername/recrutas#readme

### Key Demo Features to Highlight
1. **Candidate Dashboard**: Show AI job matching with real scores
2. **Hiring Manager Portal**: Create jobs with custom exams
3. **Exam System**: Take technical assessment, see auto-grading
4. **Merit-Based Chat**: Demonstrate qualified candidate access
5. **Job Aggregation**: Live jobs from external companies

## Step 7: Final Checklist

### Repository Quality
- [ ] README.md is comprehensive and YC-focused
- [ ] All environment variables documented
- [ ] Deployment instructions clear
- [ ] License and contributing guidelines included
- [ ] Security policy established

### Demo Functionality
- [ ] Live demo URL working
- [ ] Database connected and populated
- [ ] AI matching showing real percentages
- [ ] Exam system functional
- [ ] Chat system accessible for qualified candidates
- [ ] Mobile responsive design

### YC Application Ready
- [ ] Repository is public and discoverable
- [ ] Clear problem/solution narrative
- [ ] Technical differentiation obvious
- [ ] Business model explained
- [ ] Scalability demonstrated

## Troubleshooting Common Issues

### Build Failures on Vercel
- Check Node.js version (use 18.x)
- Verify all dependencies in package.json
- Ensure TypeScript compilation succeeds

### Database Connection Issues
- Verify DATABASE_URL format
- Check Supabase project is running
- Ensure IP allowlist includes 0.0.0.0/0

### Environment Variable Problems
- Variables must be set in Vercel dashboard
- Redeploy after adding new variables
- Check variable names are exact matches

## Post-Deployment Optimization

### Performance
- Enable Vercel Analytics
- Set up error monitoring
- Optimize bundle size

### SEO and Discovery
- Add meta descriptions
- Include Open Graph tags
- Submit to Google Search Console

### Security
- Review environment variable exposure
- Enable HTTPS everywhere
- Set up security headers

## YC Demo Script

### 30-Second Pitch
"Recrutas eliminates recruiters by connecting candidates directly to hiring managers through AI matching and merit-based qualification. Candidates take job-specific exams, and only top performers get chat access to hiring managers."

### Live Demo Flow
1. Show candidate taking a technical exam
2. Demonstrate AI matching with real scores (87%+)
3. Display hiring manager receiving qualified candidates
4. Show direct chat interface for top performers
5. Walk through real-time job aggregation

Your repository is now ready for YC application with professional documentation, working demo, and clear technical differentiation.