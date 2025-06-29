# Deployment Guide

This guide covers deploying Recrutas to various platforms for production and demo environments.

## Quick Deploy Options

### 1. Vercel (Recommended for Demos)

**Why Vercel:**
- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Perfect for demo URLs

**Setup:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
vercel env add SESSION_SECRET
```

**Vercel Configuration (vercel.json):**
```json
{
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "client/**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ]
}
```

### 2. Railway (Full-Stack with Database)

**Why Railway:**
- Built-in PostgreSQL
- Git-based deployments
- Simple environment management

**Setup:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### 3. Render (Alternative Option)

**Setup:**
- Connect GitHub repository
- Choose "Web Service"
- Build command: `npm install && npm run build`
- Start command: `npm start`

## Database Setup

### Supabase (Recommended)
```bash
# Create project at supabase.com
# Copy connection string to DATABASE_URL
# Run migrations
npm run db:push
```

### Railway PostgreSQL
```bash
# Add PostgreSQL service in Railway
# Copy DATABASE_URL from Railway dashboard
```

## Environment Variables for Production

```env
# Production Database
DATABASE_URL=postgresql://...

# Session Security
SESSION_SECRET=your-super-secure-32-char-secret

# Domain Configuration
REPLIT_DOMAINS=your-app.vercel.app,your-custom-domain.com

# AI Services
OPENAI_API_KEY=sk-your-production-key

# Optional Services
SENDGRID_API_KEY=SG.your-key
STRIPE_SECRET_KEY=sk_live_your-key
```

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] API endpoints tested
- [ ] Frontend builds without errors
- [ ] Mobile responsiveness verified
- [ ] Performance optimized
- [ ] Error handling implemented
- [ ] Analytics tracking added (optional)

## Demo Specific Setup

### Custom Domain (Optional but Recommended)
```bash
# Add custom domain in Vercel
vercel domains add recrutas-demo.com

# Update environment variables
REPLIT_DOMAINS=recrutas-demo.com
```

### Demo Data Population
```bash
# Seed database with demo data
npm run seed:demo
```

### Performance Optimization
- Enable gzip compression
- Optimize images
- Minimize bundle size
- Set up CDN for assets

## Monitoring & Analytics

### Basic Monitoring
```javascript
// Add to your app for demo metrics
console.log('User signup:', userId);
console.log('Job application:', jobId);
console.log('Match score:', score);
```

### Error Tracking (Optional)
```bash
# Add Sentry for error monitoring
npm install @sentry/node @sentry/react
```

## Security Considerations

### Production Security
- Use HTTPS everywhere
- Secure session configuration
- Input validation on all endpoints
- Rate limiting on APIs
- SQL injection prevention (Drizzle ORM handles this)

### Environment Security
- Never commit .env files
- Use platform-specific secret management
- Rotate API keys regularly
- Monitor for unauthorized access

## Scaling Considerations

### Database Optimization
- Add database indexes for frequently queried fields
- Implement connection pooling
- Monitor query performance

### Application Scaling
- Implement caching for expensive operations
- Use CDN for static assets
- Consider serverless functions for AI processing

## Troubleshooting Common Issues

### Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```

### Database Connection Issues
- Verify DATABASE_URL format
- Check firewall settings
- Ensure database is accepting connections

### Environment Variable Issues
- Check variable names (case-sensitive)
- Verify all required variables are set
- Restart application after changes

## YC Application Tips

### Demo URL Best Practices
- Use a memorable domain name
- Ensure 99.9% uptime during YC review period
- Set up monitoring alerts
- Have backup deployment ready

### Performance Metrics to Track
- Page load times
- API response times
- User signup flow completion
- Job matching accuracy
- Time from application to interview

### Demo Data Strategy
- Populate with realistic but anonymized data
- Include variety of job types and companies
- Show successful candidate-to-hire workflows
- Demonstrate AI matching accuracy

This deployment setup ensures your Recrutas platform is production-ready for YC demo and beyond.