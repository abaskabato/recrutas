import { createVercelDB } from './db-vercel.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = createVercelDB();
    
    // Better Auth compatible schema
    const initSQL = `
      -- Users table (Better Auth compatible)
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        image TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        role TEXT
      );

      -- Sessions table (Better Auth compatible)
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "ipAddress" TEXT,
        "userAgent" TEXT,
        FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
      );

      -- Accounts table (Better Auth compatible)
      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
      );

      -- Verifications table (Better Auth compatible)
      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
      CREATE INDEX IF NOT EXISTS idx_session_user_id ON session("userId");
      CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
    `;
    
    await client.unsafe(initSQL);
    
    console.log('✅ Supabase database initialized with Better Auth tables');
    
    return res.status(200).json({ 
      success: true, 
      message: 'Database initialized successfully' 
    });
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return res.status(500).json({ 
      error: 'Database initialization failed',
      details: error.message
    });
  }
}