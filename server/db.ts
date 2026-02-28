import dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

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
      max: isServerless ? 1 : 10,
      idle_timeout: isServerless ? 10 : 30,
      connect_timeout: 10,
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
