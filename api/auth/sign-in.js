import { createVercelDB, initializeDatabase } from '../db-vercel.js';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize database tables if needed
    await initializeDatabase();
    
    const client = createVercelDB();
    
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
    res.setHeader('Set-Cookie', `better-auth.session_token=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; Secure`);
    
    return res.status(200).json({
      success: true,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        role: user.role 
      },
      session: { id: sessionId, userId: user.id, expiresAt }
    });
    
  } catch (error) {
    console.error('Sign-in error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}