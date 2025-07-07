# Fix Supabase Database Connection in Vercel

## Issue
The authentication system is failing with database connection errors:
`Error: getaddrinfo ENOTFOUND db.hszttqfamgesltcxpzvc.supabase.co`

## Root Cause
The DATABASE_URL environment variable in Vercel production is incorrect or missing.

## Solution

### Step 1: Get Correct Supabase URL
1. Go to your Supabase project dashboard
2. Navigate to: Settings → Database → Connection string
3. Select "Transaction Mode" (not Session Mode)
4. Copy the connection string, it should look like:
   ```
   postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

### Step 2: Update Vercel Environment Variables
1. Go to Vercel Dashboard → recrutas project → Settings → Environment Variables
2. Update or add DATABASE_URL with the correct Supabase connection string
3. Make sure to replace [YOUR-PASSWORD] with your actual database password

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