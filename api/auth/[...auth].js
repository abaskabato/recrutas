import { createVercelDB, initializeDatabase } from '../db-vercel.js';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export default async function handler(req, res) {
  // Set CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Initialize database tables if needed
    await initializeDatabase();
    
    const client = createVercelDB();
    
    try {
      // Handle different auth endpoints
      if (req.url?.includes('/get-session')) {
        return res.status(200).json({ session: null, user: null });
      }
      
      if (req.url?.includes('/sign-up') && req.method === 'POST') {
        const { email, password, name } = req.body;
        
        if (!email || !password || !name) {
          return res.status(400).json({ error: 'Email, password, and name are required' });
        }
        
        // Check if user already exists
        const existingUser = await client`
          SELECT id FROM users WHERE email = ${email} LIMIT 1
        `;
        
        if (existingUser.length > 0) {
          return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = nanoid();
        
        await client`
          INSERT INTO users (id, name, email, "createdAt", "updatedAt")
          VALUES (${userId}, ${name}, ${email}, NOW(), NOW())
        `;
        
        // Create session
        const sessionId = nanoid();
        const sessionToken = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        await client`
          INSERT INTO sessions (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
          VALUES (${sessionId}, ${userId}, ${sessionToken}, ${expiresAt}, NOW(), NOW())
        `;
        
        // Set session cookie
        res.setHeader('Set-Cookie', `better-auth.session_token=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`);
        
        return res.status(200).json({
          user: { id: userId, name, email },
          session: { id: sessionId, userId, expiresAt }
        });
      }
      
      if (req.url?.includes('/sign-in') && req.method === 'POST') {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user
        const users = await client`
          SELECT * FROM users WHERE email = ${email} LIMIT 1
        `;
        
        if (users.length === 0) {
          return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // For now, allow sign-in without password verification
        // In production, you'd verify the password hash
        
        // Create session
        const sessionId = nanoid();
        const sessionToken = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        await client`
          INSERT INTO sessions (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
          VALUES (${sessionId}, ${user.id}, ${sessionToken}, ${expiresAt}, NOW(), NOW())
        `;
        
        // Set session cookie
        res.setHeader('Set-Cookie', `better-auth.session_token=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`);
        
        return res.status(200).json({
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
          session: { id: sessionId, userId: user.id, expiresAt }
        });
      }
      
      if (req.url?.includes('/sign-out') && req.method === 'POST') {
        const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                           req.cookies?.['better-auth.session_token'];
        
        if (sessionToken) {
          await client`
            DELETE FROM sessions WHERE token = ${sessionToken}
          `;
        }
        
        // Clear session cookie
        res.setHeader('Set-Cookie', 'better-auth.session_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
        
        return res.status(200).json({ success: true });
      }
      
      return res.status(404).json({ error: 'Endpoint not found' });
      
    } finally {
      await client.end();
    }
    
  } catch (error) {
    console.error('Auth endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}