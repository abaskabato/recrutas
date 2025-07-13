# Vercel Deployment Debug Guide

## Current Issue
The Vercel deployment is returning 405 Method Not Allowed errors for authentication endpoints despite having created the API files.

## Debugging Steps

### 1. Check API File Structure
```
api/
├── debug.js ✓
├── session.js ✓
├── auth/
│   ├── sign-up.js ✓
│   ├── sign-in.js ✓
│   └── sign-out.js ✓
└── db-vercel.js ✓
```

### 2. Test Endpoints
- Debug endpoint: `GET /api/debug`
- Session endpoint: `GET /api/session`  
- Sign-up endpoint: `POST /api/auth/sign-up`
- Sign-in endpoint: `POST /api/auth/sign-in`
- Sign-out endpoint: `POST /api/auth/sign-out`

### 3. Environment Variables Required
```
DATABASE_URL=postgresql://postgres.hszttqfamgesltcxpzvc:O2fglkDEoOrCtbqG@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
BETTER_AUTH_SECRET=f03a8c675e0d4b6cc347ad29c324e669499d5f50a50c36f6b1a84e3f591a4034
BETTER_AUTH_URL=https://recrutas.vercel.app
```

### 4. Vercel Configuration
The `vercel.json` file includes function specifications for all endpoints to ensure they're recognized as serverless functions.

### 5. Frontend Integration
The frontend authentication client has been updated with fallback functions that directly call the `/api/auth/*` endpoints instead of relying on Better Auth's serverless integration.

## Expected Behavior
1. User visits authentication page
2. Submits sign-up form
3. Frontend calls `/api/auth/sign-up` directly
4. Backend creates user in Supabase database
5. Backend sets authentication cookies
6. Frontend redirects to dashboard

## Troubleshooting
If authentication is still failing:
1. Check Vercel deployment logs
2. Verify environment variables are set correctly
3. Test debug endpoint for basic functionality
4. Check if database connection is working

## Next Steps
1. Deploy updated code to Vercel
2. Test debug endpoint first
3. Test authentication endpoints
4. Verify frontend integration