// Simple test endpoint to verify API routing
export default async function handler(req, res) {
  res.status(200).json({ 
    message: 'API is working',
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method 
  });
}