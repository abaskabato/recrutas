# Deployment Guide - Platform Independent

This guide shows how to deploy Recrutas on various platforms without Replit dependencies.

## Quick Start (Any Platform)

### Option 1: Standalone Server
```bash
# 1. Clone the repository
git clone https://github.com/abaskabato/recrutas.git
cd recrutas

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.production .env
# Edit .env with your values

# 4. Build the application
npm run build

# 5. Start the server
node standalone-server.js
```

### Option 2: Docker
```bash
# Build and run with Docker
docker build -t recrutas .
docker run -p 3000:3000 --env-file .env recrutas

# Or use docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## Platform-Specific Deployments

### Vercel
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Use `vercel-standalone.json` as your `vercel.json`
4. Add environment variables in Vercel dashboard
5. Deploy

### Railway
1. Connect your GitHub repository to Railway
2. Railway will use `railway.toml` configuration
3. Add environment variables in Railway dashboard
4. Deploy automatically

### Heroku
```bash
# Create Heroku app
heroku create your-app-name

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set OPENAI_API_KEY=your-key
heroku config:set SESSION_SECRET=your-secret

# Deploy
git push heroku main
```

### DigitalOcean App Platform
1. Create new app from GitHub repository
2. Use Docker build with our Dockerfile
3. Add environment variables
4. Deploy

### AWS/GCP/Azure
Use the provided `Dockerfile` with your container service:
- AWS: ECS, App Runner, or Elastic Beanstalk
- GCP: Cloud Run or App Engine
- Azure: Container Instances or App Service

## Environment Variables Required

```bash
# Essential
DATABASE_URL=postgresql://username:password@host:5432/database
OPENAI_API_KEY=sk-your-openai-key
SESSION_SECRET=your-32-character-secret

# Optional
SENDGRID_API_KEY=SG.your-sendgrid-key
STRIPE_SECRET_KEY=sk_your-stripe-key
VITE_STRIPE_PUBLIC_KEY=pk_your-stripe-key
```

## Database Setup

### Option 1: Hosted PostgreSQL
- **Neon**: https://neon.tech (recommended)
- **Supabase**: https://supabase.com
- **PlanetScale**: https://planetscale.com
- **AWS RDS**: Amazon PostgreSQL

### Option 2: Self-hosted
Use the provided `docker-compose.prod.yml` which includes PostgreSQL.

## Health Checks

The application provides health check endpoints:
- `GET /api/health` - Basic health check
- `GET /api/session` - Authentication health check

## Performance Optimization

### Production Settings
```bash
NODE_ENV=production
PORT=3000
```

### Database Optimization
- Enable connection pooling
- Set appropriate pool sizes based on your hosting plan
- Use read replicas for high-traffic deployments

### Caching
- Redis can be added for session storage
- Enable HTTP caching headers for static assets

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **HTTPS**: Always use HTTPS in production
3. **Database**: Use connection strings with SSL
4. **Sessions**: Use secure session secrets (32+ characters)
5. **CORS**: Configure CORS for your domain

## Monitoring

Add monitoring with:
- Application logs (Winston, Pino)
- Error tracking (Sentry)
- Performance monitoring (New Relic, DataDog)
- Health checks and uptime monitoring

## Scaling

### Horizontal Scaling
- The application is stateless and can run multiple instances
- Use a load balancer to distribute traffic
- Share sessions via Redis or database

### Vertical Scaling
- Monitor memory usage (typically 200-500MB per instance)
- CPU usage depends on AI processing load
- Database connections scale with concurrent users

## Support

For deployment issues:
1. Check the logs for specific error messages
2. Verify all environment variables are set
3. Ensure database connectivity
4. Check OpenAI API key permissions

The platform is designed to be deployment-agnostic and should work on any Node.js hosting service.