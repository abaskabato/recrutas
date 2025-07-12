# Vercel Deployment Guide

## Pre-Deployment Setup

### 1. Environment Variables
Set these in your Vercel dashboard:

```env
DATABASE_URL=your_postgres_connection_string
BETTER_AUTH_SECRET=your_secret_key_here
BETTER_AUTH_URL=https://your-app.vercel.app
NODE_ENV=production
```

### 2. Database Configuration
- Use Neon, Vercel Postgres, or any PostgreSQL provider
- Ensure connection pooling is enabled
- Test connection with `npm run db:push`

### 3. Vercel Project Settings
- Build Command: `vite build`
- Output Directory: `dist/public`
- Framework: `Other`
- Node.js Version: `20.x` (Required for @simplewebauthn/server)

## Deployment Steps

### 1. Simple Deployment Method

**Option 1: Vercel Dashboard (Recommended)**
1. Go to vercel.com and import your GitHub repository
2. Set environment variables in the dashboard
3. Deploy with default settings

**Option 2: Command Line**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 2. Environment Variables Setup
In Vercel dashboard, add these environment variables:
- `DATABASE_URL`: Your PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Random secret key
- `BETTER_AUTH_URL`: Your deployment URL (e.g., https://your-app.vercel.app)

### 3. Database Migration
```bash
# Run database migrations after first deploy
npm run db:push
```

## Architecture Changes for Vercel

### 1. Serverless Functions
- `/api/auth/[...auth].js` - Better Auth handler
- `/api/session.js` - Session management
- `/api/user/select-role.js` - Role selection
- `/api/jobs.js` - Job management
- `/api/user/profile.js` - Profile management

### 2. Frontend Configuration
- Static files served from `dist/`
- API calls routed to serverless functions
- CORS configured for production domain

### 3. Database Connections
- Connection pooling optimized for serverless
- Maximum 1 connection per function
- Automatic connection cleanup

## Testing Deployment

### 1. Health Check
```bash
curl https://your-app.vercel.app/api/session
```

### 2. Authentication Flow
1. Visit your app URL
2. Test sign-up/sign-in
3. Verify role selection
4. Check dashboard access

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL format
   - Verify connection pooling settings
   - Ensure SSL mode is enabled

2. **Better Auth Issues**
   - Verify BETTER_AUTH_SECRET is set
   - Check BETTER_AUTH_URL matches deployment URL
   - Ensure cookies are configured for production

3. **Build Failures**
   - Check TypeScript compilation
   - Verify all dependencies are installed
   - Review Vercel build logs

### Debug Commands
```bash
# Check build locally
npm run build

# Test serverless functions locally
vercel dev

# Check deployment logs
vercel logs
```

## Performance Optimization

### 1. Cold Start Reduction
- Serverless functions are optimized for fast startup
- Database connections are pooled
- Static assets are cached

### 2. Edge Network
- Static files served from CDN
- API functions deployed globally
- Automatic scaling

## Security Considerations

### 1. Environment Variables
- All secrets stored in Vercel dashboard
- No sensitive data in code
- Production-only configuration

### 2. CORS Configuration
- Properly configured for production domain
- No wildcard origins in production
- Secure cookie settings

## Troubleshooting Frontend Loading Issues

### If Frontend Doesn't Load:

1. **Check Build Output**
   - Verify `dist/public/` contains `index.html`
   - Check if CSS/JS assets are generated

2. **Verify Routing Configuration**
   - Ensure `rewrites` in vercel.json are correct
   - Test direct URL navigation

3. **Check Browser Console**
   - Look for JavaScript errors
   - Check network requests for 404s

4. **Test API Endpoints**
   - Visit `/api/session` - should return JSON
   - Check if serverless functions are deployed

5. **Environment Variables**
   - Verify all required env vars are set in Vercel dashboard
   - Test database connectivity

### Common Fixes:

- **Static Assets 404**: Check `outputDirectory` configuration
- **API Routes 404**: Verify serverless functions deployed
- **SPA Routing Issues**: Ensure rewrites handle all routes
- **Blank Page**: Check browser console for JavaScript errors

See `VERCEL_DEBUG_GUIDE.md` for detailed debugging steps.

## Next Steps After Deployment

1. **Custom Domain** (Optional)
   - Add custom domain in Vercel dashboard
   - Update BETTER_AUTH_URL to match

2. **Monitoring**
   - Set up Vercel Analytics
   - Monitor function performance
   - Track error rates

3. **Scaling**
   - Functions auto-scale based on demand
   - Database connection pooling handles concurrent users
   - Static assets cached globally

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test database connectivity
4. Review function logs in Vercel dashboard
5. Use the debug guide for step-by-step troubleshooting