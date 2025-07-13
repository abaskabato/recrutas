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
    // Simplified auth handler for Vercel deployment
    // This is a placeholder that allows the frontend to load
    console.log('Auth request:', req.method, req.url);
    
    // Return appropriate responses for different auth endpoints
    if (req.url?.includes('/get-session')) {
      return res.status(200).json({ session: null, user: null });
    }
    
    if (req.url?.includes('/sign-in')) {
      return res.status(400).json({ error: 'Authentication not configured' });
    }
    
    if (req.url?.includes('/sign-up')) {
      return res.status(400).json({ error: 'Authentication not configured' });
    }
    
    return res.status(404).json({ error: 'Endpoint not found' });
    
  } catch (error) {
    console.error('Auth endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}