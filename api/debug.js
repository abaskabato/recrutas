// Debug endpoint to check Vercel deployment status
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
    return res.status(200).json({
      message: 'Debug endpoint working',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'Present' : 'Missing',
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? 'Present' : 'Missing',
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'Missing'
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({ 
      error: 'Debug endpoint failed',
      details: error.message 
    });
  }
}