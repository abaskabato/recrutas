// Sign-up endpoint for Vercel deployment
import { createVercelDB } from '../db-vercel.js';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, password } = req.body;
    
    console.log('Sign-up attempt:', { name, email });
    
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Name, email, and password are required' 
      });
    }

    const client = createVercelDB();
    
    try {
      // Initialize tables first
      await client.unsafe(`
        CREATE TABLE IF NOT EXISTS "user" (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          "emailVerified" BOOLEAN DEFAULT false,
          image TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW(),
          role TEXT
        );
        
        CREATE TABLE IF NOT EXISTS "session" (
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
      `);

      // Check if user exists
      const existingUser = await client`
        SELECT id FROM "user" WHERE email = ${email} LIMIT 1
      `;
      
      if (existingUser.length > 0) {
        return res.status(400).json({ 
          error: 'User already exists' 
        });
      }

      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = nanoid();
      
      await client`
        INSERT INTO "user" (id, name, email, "createdAt", "updatedAt")
        VALUES (${userId}, ${name}, ${email}, NOW(), NOW())
      `;

      // Create session
      const sessionId = nanoid();
      const sessionToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      await client`
        INSERT INTO "session" (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
        VALUES (${sessionId}, ${userId}, ${sessionToken}, ${expiresAt}, NOW(), NOW())
      `;

      // Set session cookie
      res.setHeader('Set-Cookie', [
        `better-auth.session_token=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; Secure`,
        `better-auth.csrf_token=${nanoid(32)}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; Secure`
      ]);

      console.log('User created successfully:', userId);
      
      return res.status(200).json({
        user: { 
          id: userId, 
          name, 
          email,
          emailVerified: false,
          image: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          role: null
        },
        session: { 
          id: sessionId, 
          userId, 
          expiresAt,
          token: sessionToken
        }
      });
      
    } finally {
      await client.end();
    }
    
  } catch (error) {
    console.error('Sign-up error:', error);
    return res.status(500).json({ 
      error: 'Failed to create account',
      details: error.message 
    });
  }
}