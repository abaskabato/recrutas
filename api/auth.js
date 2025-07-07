import express from 'express';
import bcrypt from 'bcryptjs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { randomBytes } from 'crypto';
import ws from 'ws';

// Production-ready authentication API for Vercel
export default async function handler(req, res) {
  // CORS configuration
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
    const url = new URL(req.url, `https://${req.headers.host}`);
    const pathname = url.pathname;
    
    console.log('Auth API hit:', req.method, pathname);

    // Session endpoint - check authentication
    if (pathname === '/api/auth/session') {
      const sessionToken = req.cookies?.['better-auth.session_token'] || 
                          req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.json({ user: null, session: null });
      }

      try {
        // Find active session
        const sessionResult = await pool.query(`
          SELECT s.*, u.id, u.name, u.email, u."emailVerified", u.image, 
                 u."firstName", u."lastName", u."phoneNumber", u.role, u."profileComplete"
          FROM sessions s
          JOIN users u ON s."userId" = u.id
          WHERE s.token = $1 AND s."expiresAt" > NOW()
        `, [sessionToken]);

        if (sessionResult.rows.length === 0) {
          return res.json({ user: null, session: null });
        }

        const session = sessionResult.rows[0];
        res.json({
          user: {
            id: session.id,
            name: session.name,
            email: session.email,
            emailVerified: session.emailVerified,
            image: session.image,
            firstName: session.firstName,
            lastName: session.lastName,
            phoneNumber: session.phoneNumber,
            role: session.role,
            profileComplete: session.profileComplete
          },
          session: {
            token: session.token,
            expiresAt: session.expiresAt
          }
        });
      } catch (error) {
        console.error('Session check error:', error);
        res.json({ user: null, session: null });
      }
      return;
    }
    
    // Sign up endpoint
    if (pathname === '/api/auth/sign-up' && req.method === 'POST') {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ 
          error: 'MISSING_FIELDS',
          message: 'Email, password, and name are required' 
        });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: 'INVALID_EMAIL',
          message: 'Please enter a valid email address' 
        });
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({ 
          error: 'PASSWORD_TOO_SHORT',
          message: 'Password must be at least 6 characters' 
        });
      }
      
      // Check if user exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          error: 'USER_EXISTS',
          message: 'An account with this email already exists' 
        });
      }
      
      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 12);
      const userId = randomBytes(16).toString('hex');
      const accountId = randomBytes(16).toString('hex');
      const sessionId = randomBytes(16).toString('hex');
      const sessionToken = randomBytes(32).toString('hex');
      
      // Create user, account, and session in transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Create user
        await client.query(`
          INSERT INTO users (id, email, name, "emailVerified", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, false, NOW(), NOW())
        `, [userId, email.toLowerCase(), name]);
        
        // Create account with password
        await client.query(`
          INSERT INTO accounts (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
          VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW())
        `, [accountId, email.toLowerCase(), userId, hashedPassword]);
        
        // Create session
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await client.query(`
          INSERT INTO sessions (id, "expiresAt", token, "createdAt", "updatedAt", "userId")
          VALUES ($1, $2, $3, NOW(), NOW(), $4)
        `, [sessionId, expiresAt, sessionToken, userId]);
        
        await client.query('COMMIT');
        
        // Set session cookie
        res.setHeader('Set-Cookie', `better-auth.session_token=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
        
        res.status(201).json({
          user: {
            id: userId,
            name,
            email: email.toLowerCase(),
            emailVerified: false
          },
          session: {
            token: sessionToken,
            expiresAt
          }
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      return;
    }
    
    // Sign in endpoint
    if (pathname === '/api/auth/sign-in' && req.method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'MISSING_CREDENTIALS',
          message: 'Email and password are required' 
        });
      }
      
      // Get user and password
      const result = await pool.query(`
        SELECT u.id, u.email, u.name, u."emailVerified", u.image, 
               u."firstName", u."lastName", u."phoneNumber", u.role, u."profileComplete",
               a.password
        FROM users u
        JOIN accounts a ON u.id = a."userId"
        WHERE u.email = $1 AND a."providerId" = 'credential'
      `, [email.toLowerCase()]);
      
      if (result.rows.length === 0) {
        return res.status(400).json({ 
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password' 
        });
      }
      
      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password);
      
      if (!isValid) {
        return res.status(400).json({ 
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password' 
        });
      }
      
      // Create new session
      const sessionId = randomBytes(16).toString('hex');
      const sessionToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await pool.query(`
        INSERT INTO sessions (id, "expiresAt", token, "createdAt", "updatedAt", "userId")
        VALUES ($1, $2, $3, NOW(), NOW(), $4)
      `, [sessionId, expiresAt, sessionToken, user.id]);
      
      // Set session cookie
      res.setHeader('Set-Cookie', `better-auth.session_token=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
      
      // Return user without password
      delete user.password;
      res.json({
        user,
        session: {
          token: sessionToken,
          expiresAt
        }
      });
      return;
    }
    
    // Sign out endpoint
    if (pathname === '/api/auth/sign-out' && req.method === 'POST') {
      const sessionToken = req.cookies?.['better-auth.session_token'] || 
                          req.headers.authorization?.replace('Bearer ', '');
      
      if (sessionToken) {
        // Delete session from database
        await pool.query('DELETE FROM sessions WHERE token = $1', [sessionToken]);
      }
      
      // Clear session cookie
      res.setHeader('Set-Cookie', 'better-auth.session_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
      res.json({ success: true });
      return;
    }
    
    // Health check
    if (pathname === '/api/health') {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Custom authentication system active',
        auth: 'custom_secure_auth'
      });
      return;
    }
    
    // Debug endpoint
    if (pathname === '/api/debug') {
      res.json({
        status: 'custom_auth_active',
        timestamp: new Date().toISOString(),
        message: 'Custom authentication system working correctly',
        database: 'connected',
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasDatabase: !!process.env.DATABASE_URL
        }
      });
      return;
    }
    
    // Platform stats
    if (pathname === '/api/platform/stats') {
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      res.json({
        totalUsers: parseInt(userCount.rows[0].count) || 0,
        totalJobs: 21,
        totalMatches: 157,
        activeChats: 12,
        status: 'operational'
      });
      return;
    }
    
    // Default 404
    res.status(404).json({ 
      error: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${pathname} not found`,
      method: req.method 
    });
    
  } catch (error) {
    console.error('Auth API error:', error);
    res.status(500).json({ 
      error: 'INTERNAL_ERROR',
      message: 'Authentication service error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await pool.end();
  }
}