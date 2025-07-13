// Simplified authentication handler for Vercel deployment
import { createVercelDB } from '../db-vercel.js';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('Auth request:', req.method, req.url);
    
    // Handle sign-up
    if (req.url?.includes('/sign-up') && req.method === 'POST') {
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
    }
    
    // Handle sign-in
    if (req.url?.includes('/sign-in') && req.method === 'POST') {
      const { email, password } = req.body;
      
      console.log('Sign-in attempt:', email);
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required' 
        });
      }

      const client = createVercelDB();
      
      try {
        // Find user
        const users = await client`
          SELECT * FROM "user" WHERE email = ${email} LIMIT 1
        `;
        
        if (users.length === 0) {
          return res.status(400).json({ 
            error: 'Invalid credentials' 
          });
        }
        
        const user = users[0];
        
        // Create session (password verification can be added later)
        const sessionId = nanoid();
        const sessionToken = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        await client`
          INSERT INTO "session" (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
          VALUES (${sessionId}, ${user.id}, ${sessionToken}, ${expiresAt}, NOW(), NOW())
        `;

        // Set session cookie
        res.setHeader('Set-Cookie', [
          `better-auth.session_token=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; Secure`,
          `better-auth.csrf_token=${nanoid(32)}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; Secure`
        ]);

        console.log('User signed in successfully:', user.id);
        
        return res.status(200).json({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: user.role
          },
          session: { 
            id: sessionId, 
            userId: user.id, 
            expiresAt,
            token: sessionToken
          }
        });
        
      } finally {
        await client.end();
      }
    }
    
    // Handle get session
    if (req.url?.includes('/get-session') || req.url?.includes('/session')) {
      return res.status(200).json({ 
        session: null, 
        user: null 
      });
    }
    
    // Handle sign-out
    if (req.url?.includes('/sign-out') && req.method === 'POST') {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                         req.cookies?.['better-auth.session_token'];
      
      if (sessionToken) {
        const client = createVercelDB();
        try {
          await client`
            DELETE FROM "session" WHERE token = ${sessionToken}
          `;
        } finally {
          await client.end();
        }
      }
      
      // Clear session cookies
      res.setHeader('Set-Cookie', [
        'better-auth.session_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure',
        'better-auth.csrf_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure'
      ]);
      
      return res.status(200).json({ success: true });
    }
    
    return res.status(404).json({ error: 'Endpoint not found' });
    
  } catch (error) {
    console.error('Auth endpoint error:', error);
    return res.status(500).json({ 
      error: 'Authentication service error',
      details: error.message 
    });
  }
}