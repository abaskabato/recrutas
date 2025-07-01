// Minimal serverless API handler - no server dependencies to avoid Vite import issues
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url, method } = req;
  
  try {
    // Health check
    if (url === '/api/health') {
      return res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Recrutas API is running' 
      });
    }
    
    // Session endpoint 
    if (url === '/api/session') {
      return res.json({ 
        user: null, 
        isAuthenticated: false,
        message: 'Authentication system ready' 
      });
    }
    
    // Platform stats
    if (url === '/api/platform/stats') {
      return res.json({
        totalUsers: 5,
        totalJobs: 21,
        totalMatches: 157,
        activeChats: 12,
        status: 'operational'
      });
    }
    
    // Default response
    res.status(404).json({ 
      error: 'Endpoint not found',
      availableEndpoints: ['/api/health', '/api/session', '/api/platform/stats']
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}