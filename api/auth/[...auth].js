import { auth } from '../../server/betterAuth.js';

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
    // Create a proper URL for the auth handler
    const url = new URL(req.url, `https://${req.headers.host}`);
    
    // Create request object for Better Auth
    const authRequest = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Call Better Auth handler
    const authResponse = await auth.handler(authRequest);
    
    // Convert Response to Express response
    const responseBody = await authResponse.text();
    
    // Set status and headers
    res.status(authResponse.status);
    
    // Copy headers from auth response
    for (const [key, value] of authResponse.headers.entries()) {
      res.setHeader(key, value);
    }
    
    // Send response
    if (responseBody) {
      res.send(responseBody);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Auth handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}