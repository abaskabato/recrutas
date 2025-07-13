# Vercel + Supabase Integration Setup

## Overview
This guide helps you deploy your Recrutas platform to Vercel with Supabase as the database backend.

## Environment Variables for Vercel Dashboard

Set these environment variables in your Vercel project dashboard:

### Required Variables
```bash
# Supabase Database
DATABASE_URL="your-supabase-connection-string"

# Better Auth Configuration
BETTER_AUTH_SECRET="your-secure-32-character-secret"
BETTER_AUTH_URL="https://your-app.vercel.app"

# Email Service (Optional)
SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="your-from-email@domain.com"
```

## Deployment Files Created

### 1. `api/db-vercel.js`
- Database configuration optimized for Vercel serverless functions
- Automatic table creation for Better Auth compatibility
- Connection pooling optimized for serverless (max: 1 connection)

### 2. `api/session.js` (Updated)
- Enhanced session validation with Supabase database queries
- Cookie-based session management
- Proper error handling for production

### 3. `api/auth/[...auth].js` (Updated)
- Complete authentication endpoints (sign-up, sign-in, sign-out)
- Database-backed user management
- Session creation and validation
- Password hashing with bcrypt

## Database Schema

The system automatically creates these tables in your Supabase database:

```sql
-- Users table (Better Auth compatible)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  profile_image_url TEXT,
  role TEXT,
  profile_complete BOOLEAN DEFAULT false
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Additional tables for Better Auth
CREATE TABLE IF NOT EXISTS accounts (...);
CREATE TABLE IF NOT EXISTS verifications (...);
```

## Deployment Steps

1. **Set Environment Variables**: Add all required environment variables to your Vercel project dashboard
2. **Deploy**: Push your code to trigger Vercel deployment
3. **Database Initialization**: The tables will be created automatically on first API call
4. **Test Authentication**: Try signing up/in on your deployed app

## Key Features

✅ **Serverless Compatible**: Optimized for Vercel's serverless environment
✅ **Database Auto-Setup**: Tables created automatically on deployment
✅ **Session Management**: Secure cookie-based sessions
✅ **Error Handling**: Graceful error responses for production
✅ **CORS Support**: Proper CORS headers for frontend integration

## Testing the Deployment

After deployment, test these endpoints:
- `GET /api/session` - Check session status
- `POST /api/auth/sign-up` - Create new user
- `POST /api/auth/sign-in` - Authenticate user
- `POST /api/auth/sign-out` - End session

## Local vs Production

- **Local Development**: Uses existing Neon database (unchanged)
- **Production (Vercel)**: Uses Supabase database with enhanced API functions

This setup ensures your local development environment remains unchanged while providing a robust production deployment.