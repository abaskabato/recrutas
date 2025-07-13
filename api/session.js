import { createVercelDB } from './db-vercel.js';

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
    // Get session token from cookie or authorization header
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                        req.cookies?.['better-auth.session_token'];
    
    console.log('Session check for token:', sessionToken ? 'present' : 'missing');
    
    if (!sessionToken) {
      return res.status(200).json({ 
        session: null, 
        user: null 
      });
    }

    const client = createVercelDB();
    
    try {
      // Query for valid session
      const result = await client`
        SELECT s.*, u.* 
        FROM "session" s 
        JOIN "user" u ON s."userId" = u.id 
        WHERE s.token = ${sessionToken} 
        AND s."expiresAt" > NOW()
        LIMIT 1
      `;
      
      if (result.length === 0) {
        console.log('No valid session found');
        return res.status(200).json({ 
          session: null, 
          user: null 
        });
      }
      
      const sessionData = result[0];
      
      console.log('Valid session found for user:', sessionData.email);
      
      return res.status(200).json({
        session: {
          id: sessionData.id,
          userId: sessionData.userId,
          expiresAt: sessionData.expiresAt,
          token: sessionData.token
        },
        user: {
          id: sessionData.userId,
          name: sessionData.name,
          email: sessionData.email,
          emailVerified: sessionData.emailVerified,
          image: sessionData.image,
          createdAt: sessionData.createdAt,
          updatedAt: sessionData.updatedAt,
          role: sessionData.role
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