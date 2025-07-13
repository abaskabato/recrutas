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
    console.log('User request:', req.method, req.url);
    
    // Simple user response for Vercel deployment
    if (req.method === 'GET') {
      return res.status(200).json({ user: null });
    }
    
    if (req.method === 'PATCH') {
      return res.status(400).json({ error: 'User updates not available' });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('User endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}