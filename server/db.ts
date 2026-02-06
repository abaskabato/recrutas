import dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL or POSTGRES_URL must be set. Did you forget to provision a database?",
  );
}

// Use the DATABASE_URL directly for consistency


// Mask the password in the connection string for logging
const maskedConnectionString = connectionString.replace(/:([^:]+)@/, ':********@');
console.log(`🔗 Using database connection: ${maskedConnectionString}`);

export let client;
try {
  // Detect if using Supabase pooler (pgBouncer)
  const isPgBouncer = connectionString.includes('pooler.supabase.com') ||
                      connectionString.includes('pgbouncer=true');
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  // Create connection to PostgreSQL with optimized settings for serverless environments
  client = postgres(connectionString, {
    max: isServerless ? 1 : 3, // Single connection per serverless function to prevent pool exhaustion
    idle_timeout: 10, // Close idle connections very fast in serverless
    connect_timeout: 10, // Connection timeout
    statement_timeout: 20000, // 20 second statement timeout
    connection: {
      application_name: 'recrutas-app',
    },
    ssl: 'require', // Required for Supabase/Neon
    debug: false, // Disable debug to reduce overhead
    prepare: !isPgBouncer, // Disable prepared statements for pgBouncer
  });
  console.log(`✅ Postgres client initialized (pgBouncer: ${isPgBouncer}, serverless: ${!!isServerless})`);
} catch (error) {
  console.error('❌ Error initializing Postgres client:', error);
  throw error; // Re-throw the error to prevent the application from starting
}


export const db = drizzle(client, { schema });

// Pre-warm the database connection on module load
// This helps reduce cold start latency on serverless
(async () => {
  try {
    await client`SELECT 1`;
    console.log('✅ Database connection pre-warmed');
  } catch (error) {
    console.warn('⚠️ Database pre-warm failed (will retry on first query):', error);
  }
})();

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
