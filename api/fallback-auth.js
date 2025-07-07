import express from 'express';
import bcrypt from 'bcryptjs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Simple fallback authentication for Vercel deployment
export default async function handler(req, res) {
  // Enable CORS
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://recrutas.vercel.app",
    "https://recrutas-git-main-abas-kabatos-projects.vercel.app",
    "https://recrutas-2z1uoh51z-abas-kabatos-projects.vercel.app",
    "http://localhost:5000",
    "http://localhost:3000"
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Database setup
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  neonConfig.webSocketConstructor = ws.default;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Parse URL and body
    const url = new URL(req.url, `https://${req.headers.host}`);
    const pathname = url.pathname;
    
    // Handle different auth endpoints
    if (pathname === '/api/auth/session') {
      // For now, return null (no session)
      res.json({ user: null });
      return;
    }
    
    if (pathname === '/api/auth/sign-up' && req.method === 'POST') {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Check if user exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const result = await pool.query(`
        INSERT INTO users (id, email, name, "emailVerified", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, false, NOW(), NOW())
        RETURNING id, email, name, "emailVerified"
      `, [crypto.randomUUID(), email, name]);
      
      // Also create account record for password
      await pool.query(`
        INSERT INTO accounts (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
        VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW())
      `, [crypto.randomUUID(), email, result.rows[0].id, hashedPassword]);
      
      res.json({ user: result.rows[0] });
      return;
    }
    
    if (pathname === '/api/auth/sign-in' && req.method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' });
      }
      
      // Get user and password
      const result = await pool.query(`
        SELECT u.id, u.email, u.name, u."emailVerified", a.password
        FROM users u
        JOIN accounts a ON u.id = a."userId"
        WHERE u.email = $1 AND a."providerId" = 'credential'
      `, [email]);
      
      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password);
      
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      // Return user without password
      delete user.password;
      res.json({ user });
      return;
    }
    
    // Debug endpoint
    if (pathname === '/api/debug') {
      res.json({
        status: 'fallback_auth_active',
        timestamp: new Date().toISOString(),
        message: 'Using simplified authentication while Better Auth is being fixed',
        database: 'connected'
      });
      return;
    }
    
    // Health check
    if (pathname === '/api/health') {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Fallback authentication active',
        auth: 'simple_auth'
      });
      return;
    }
    
    // Default 404
    res.status(404).json({ error: 'Endpoint not found' });
    
  } catch (error) {
    console.error('Fallback auth error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  } finally {
    await pool.end();
  }
}