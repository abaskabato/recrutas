# Vercel Deployment Guide

## Overview
Deploy your Recrutas platform to Vercel with Supabase database backend for production use.

## Prerequisites
- Vercel account
- Supabase account with database created
- GitHub repository connected to Vercel

## Environment Variables Setup

Configure these in your Vercel dashboard under Settings > Environment Variables:

### Database Configuration
```bash
DATABASE_URL="postgresql://username:password@host:port/database"
```

### Authentication Settings
```bash
BETTER_AUTH_SECRET="your-64-character-secret-key"
BETTER_AUTH_URL="https://your-app.vercel.app"
```

### Email Configuration (Optional)
```bash
SENDGRID_API_KEY="your-sendgrid-key"
FROM_EMAIL="your-email@domain.com"
```

## Database Setup

The deployment automatically creates these tables in your Supabase database:

- `users` - User accounts and profiles
- `sessions` - Authentication sessions
- `accounts` - OAuth provider accounts
- `verifications` - Email verification tokens

## Deployment Process

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Configure Environment**: Set all required environment variables
3. **Deploy**: Vercel will automatically build and deploy your application
4. **Database Initialization**: Tables are created on first API request

## API Endpoints

Your deployed app will have these serverless functions:

- `/api/session` - Session management
- `/api/auth/sign-up` - User registration
- `/api/auth/sign-in` - User authentication
- `/api/auth/sign-out` - Session termination
- `/api/jobs` - Job data endpoints
- `/api/user` - User profile management

## Local vs Production

- **Local Development**: Uses existing Neon database configuration
- **Production**: Uses Supabase with enhanced serverless functions

## Testing Deployment

After deployment, verify these endpoints work:
- GET `/api/session` - Should return session status
- POST `/api/auth/sign-up` - Should create new users
- POST `/api/auth/sign-in` - Should authenticate users

## Security Features

- Automatic database table creation
- Session-based authentication
- CORS configuration
- Error handling for production
- Connection pooling for serverless

## Support

For deployment issues:
1. Check Vercel function logs
2. Verify environment variables are set correctly
3. Ensure database URL is accessible
4. Test API endpoints individually

Your Recrutas platform is now ready for production use with full authentication and database functionality!