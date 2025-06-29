// Vercel serverless function - API only
export default function handler(req, res) {
  // Simple API endpoint
  if (req.url.startsWith('/api/')) {
    res.status(200).json({ 
      message: 'Recrutas API is operational',
      timestamp: new Date().toISOString(),
      path: req.url
    });
  } else {
    // Redirect non-API routes to frontend
    res.status(404).json({ 
      error: 'API endpoint not found',
      message: 'Use /api/ routes for API access'
    });
  }
}