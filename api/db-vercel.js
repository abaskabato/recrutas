// Database configuration for Vercel deployment with Supabase
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Simple schema for Vercel deployment
const createTables = `
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

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
`;

export function createVercelDB() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const client = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    statement_timeout: 30000,
    ssl: { rejectUnauthorized: false },
    debug: false,
  });

  return client;
}

export async function initializeDatabase() {
  const client = createVercelDB();
  
  try {
    await client.unsafe(createTables);
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}