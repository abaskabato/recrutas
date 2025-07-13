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
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize database tables if needed
    await initializeDatabase();
    
    const client = createVercelDB();
    
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
    res.setHeader('Set-Cookie', `better-auth.session_token=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; Secure`);
    
    return res.status(200).json({
      success: true,
      user: { id: userId, name, email },
      session: { id: sessionId, userId, expiresAt }
    });
    
  } catch (error) {
    console.error('Sign-up error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}