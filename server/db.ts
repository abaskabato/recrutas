import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Force correct Supabase connection to override environment variables
const connectionString = process.env.DATABASE_URL?.includes('aws-0-us-east-2.pooler.supabase.com') 
  ? process.env.DATABASE_URL 
  : "postgresql://postgres.hszttqfamgesltcxpzvc:O2fglkDEoOrCtbqG@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true";

console.log('🔗 Using database connection:', connectionString.replace(/:[^:]*@/, ':***@'));

// Create connection to Supabase with optimized settings
const client = postgres(connectionString, {
  max: 1, // Use a single connection for serverless
  idle_timeout: 20,
  connect_timeout: 10,
  statement_timeout: 30000, // 30 seconds
  query_timeout: 15000, // 15 seconds
  connection: {
    application_name: 'recrutas-app',
  },
  debug: false, // Disable debug to reduce overhead
});

export const db = drizzle(client, { schema });