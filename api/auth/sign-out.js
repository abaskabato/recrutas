import { createVercelDB } from '../db-vercel.js';

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
    // Get session token from cookie
    const sessionToken = req.cookies?.['better-auth.session_token'];
    
    if (sessionToken) {
      const client = createVercelDB();
      
      // Delete session from database
      await client`
        DELETE FROM sessions WHERE token = ${sessionToken}
      `;
    }
    
    // Clear session cookie
    res.setHeader('Set-Cookie', 'better-auth.session_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure');
    
    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Sign-out error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}