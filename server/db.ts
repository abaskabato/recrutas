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
  // Create connection to PostgreSQL with optimized settings for serverless environments
  client = postgres(connectionString, {
    max: 1, // Use a single connection for serverless
    idle_timeout: 20,
    connect_timeout: 15,
    connection: {
      application_name: 'recrutas-app',
    },
    ssl: 'require', // Required for Supabase/Neon
    debug: false, // Disable debug to reduce overhead
  });
  console.log('✅ Postgres client initialized');
} catch (error) {
  console.error('❌ Error initializing Postgres client:', error);
  throw error; // Re-throw the error to prevent the application from starting
}


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
