import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use the DATABASE_URL directly for consistency
const connectionString = process.env.DATABASE_URL;

console.log('🔗 Using database connection from DATABASE_URL');

// Create connection to PostgreSQL with optimized settings for serverless environments
const client = postgres(connectionString, {
  max: 1, // Use a single connection for serverless
  idle_timeout: 20,
  connect_timeout: 10,
  statement_timeout: 30000, // 30 seconds
  query_timeout: 15000, // 15 seconds
  connection: {
    application_name: 'recrutas-app',
  },
  ssl: 'require', // Required for Supabase/Neon
  debug: false, // Disable debug to reduce overhead
});

export const db = drizzle(client, { schema });

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