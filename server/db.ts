import dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// In serverless (Vercel), prefer the Supabase transaction pooler URL (port 6543, pgBouncer)
// over the direct connection URL (port 5432). Set SUPABASE_POOLER_URL to the pooler URL.
// Falls back to DATABASE_URL / POSTGRES_URL if not set.
const isServerlessEnv = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const connectionString = (isServerlessEnv && process.env.SUPABASE_POOLER_URL)
  ? process.env.SUPABASE_POOLER_URL
  : (process.env.DATABASE_URL || process.env.POSTGRES_URL);

if (!connectionString) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL must be set. Did you forget to provision a database?",
    );
  }
}

export let client: postgres.Sql<Record<string, unknown>>;
export let db: ReturnType<typeof drizzle>;

if (connectionString) {
  // Mask the password in the connection string for logging
  const maskedConnectionString = connectionString.replace(/:([^:]+)@/, ':********@');
  console.log(`🔗 Using database connection: ${maskedConnectionString}`);

  try {
    // Detect if using Supabase pooler (pgBouncer)
    const isPgBouncer = connectionString.includes('pooler.supabase.com') ||
                        connectionString.includes('pgbouncer=true');
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

    // Create connection to PostgreSQL with optimized settings for serverless environments
    client = postgres(connectionString, {
      // Allow 3 concurrent connections per serverless instance.
      // Vercel scales horizontally so total = 3 × N instances; safe for Supabase Pro (200 limit).
      // max: 1 caused head-of-line blocking when ≥2 concurrent requests hit a warm instance.
      max: isServerless ? 3 : 10,
      idle_timeout: isServerless ? 20 : 30,
      // Recycle connections every 5 min in serverless to prevent stale socket errors.
      max_lifetime: isServerless ? 300 : 3600,
      // Keep connect_timeout longer than our 8s app timeout so the app timeout fires first
      // and returns a clean 503 instead of an opaque postgres connection error.
      connect_timeout: 15,
      connection: {
        application_name: 'recrutas-app',
        statement_timeout: 20000,
      },
      ssl: 'require',
      debug: false,
      prepare: !isPgBouncer,
    });
    console.log(`✅ Postgres client initialized (pgBouncer: ${isPgBouncer}, serverless: ${!!isServerless})`);
  } catch (error) {
    console.error('❌ Error initializing Postgres client:', error);
    throw error;
  }

  db = drizzle(client, { schema });
} else {
  // Test mode — no DB available; export null stubs so unit tests can import server modules
  client = null as unknown as postgres.Sql<Record<string, unknown>>;
  db = null as unknown as ReturnType<typeof drizzle>;
}

// Pre-warm the database connection on module load
// This helps reduce cold start latency on serverless
if (client) {
  (async () => {
    try {
      await client`SELECT 1`;
      console.log('✅ Database connection pre-warmed');
    } catch (error) {
      console.warn('⚠️ Database pre-warm failed (will retry on first query):', error);
    }
  })();
}

// Function to test the database connection
export async function testDbConnection() {
  try {
    await client`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
