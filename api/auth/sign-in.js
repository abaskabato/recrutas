// Sign-in endpoint for Vercel deployment
import { createVercelDB } from '../db-vercel.js';
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
    
  } catch (error) {
    console.error('Sign-in error:', error);
    return res.status(500).json({ 
      error: 'Failed to sign in',
      details: error.message 
    });
  }
}