// Sign-out endpoint for Vercel deployment
import { createVercelDB } from '../db-vercel.js';

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
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                       req.cookies?.['better-auth.session_token'];
    
    if (sessionToken) {
      const client = createVercelDB();
      try {
        await client`
          DELETE FROM "session" WHERE token = ${sessionToken}
        `;
        console.log('Session deleted:', sessionToken);
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
    
  } catch (error) {
    console.error('Sign-out error:', error);
    return res.status(500).json({ 
      error: 'Failed to sign out',
      details: error.message 
    });
  }
}