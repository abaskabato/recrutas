import { createVercelDB } from './db-vercel.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Check for session cookie or token
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                        req.cookies?.['better-auth.session_token'];
    
    if (!sessionToken) {
      return res.status(200).json({ 
        session: null, 
        user: null 
      });
    }

    // Query database for valid session
    const client = createVercelDB();
    
    try {
      const result = await client`
        SELECT s.*, u.* 
        FROM sessions s 
        JOIN users u ON s."userId" = u.id 
        WHERE s.token = ${sessionToken} 
        AND s."expiresAt" > NOW()
        LIMIT 1
      `;
      
      if (result.length === 0) {
        return res.status(200).json({ 
          session: null, 
          user: null 
        });
      }
      
      const session = result[0];
      
      return res.status(200).json({
        session: {
          id: session.id,
          userId: session.userId,
          expiresAt: session.expiresAt,
        },
        user: {
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
          firstName: session.first_name,
          lastName: session.last_name,
        }
      });
      
    } finally {
      await client.end();
    }

  } catch (error) {
    console.error('Session endpoint error:', error);
    return res.status(200).json({ 
      session: null, 
      user: null 
    });
  }
}