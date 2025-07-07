# Fix Supabase Database Connection in Vercel

## Issue
The authentication system is failing with database connection errors:
`Error: getaddrinfo ENOTFOUND db.hszttqfamgesltcxpzvc.supabase.co`

## Root Cause
The DATABASE_URL environment variable in Vercel production is incorrect or missing.

## Solution

### Step 1: Get Your Supabase Database Password
Since you signed up with GitHub, you need to get your database password:

1. Go to your Supabase project dashboard
2. Navigate to: Settings → Database 
3. Look for "Database Password" section
4. Click "Generate new password" or "Reset database password"
5. Copy the generated password and save it securely

### Step 2: Get Connection String
1. Still in Settings → Database → Connection string
2. Select "Transaction Mode" (not Session Mode)  
3. Copy the connection string format:
   ```
   postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

### Step 2: Update Vercel Environment Variables
1. Go to Vercel Dashboard → recrutas project → Settings → Environment Variables
2. Update or add DATABASE_URL with this connection string (replace [YOUR-PASSWORD] with your actual database password):
   ```
   DATABASE_URL="postgresql://postgres.hszttqfamgesltcxpzvc:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```
3. Also add DIRECT_URL for migrations:
   ```
   DIRECT_URL="postgresql://postgres.hszttqfamgesltcxpzvc:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
   ```

### Step 3: Verify Configuration
After updating the environment variable, Vercel will automatically redeploy.
Test with: `curl https://recrutas.vercel.app/api/auth/sign-up/email`

## Alternative: Check if Supabase Database is Paused
Sometimes Supabase databases get paused due to inactivity:
1. Go to your Supabase dashboard
2. Check if the database shows as "Paused" 
3. If paused, click "Resume" to reactivate it

## Rate Limiting
The 429 errors indicate too many requests. Better Auth has built-in rate limiting that triggers after multiple failed attempts. Wait a few minutes before testing again.