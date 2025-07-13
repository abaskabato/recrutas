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
    // Simple session response that works with Vercel serverless
    // This provides a basic session endpoint that allows the frontend to load
    console.log('Session request headers:', req.headers['test-session']);
    
    // For now, return null session to allow frontend to load
    // This can be enhanced with proper authentication later
    return res.status(200).json({ 
      session: null, 
      user: null 
    });

  } catch (error) {
    console.error('Session endpoint error:', error);
    return res.status(200).json({ 
      session: null, 
      user: null 
    });
  }
}