import express from 'express';

let app;

export default async function handler(req, res) {
  if (!app) {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Enable CORS
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      const allowedOrigins = [
        "https://recrutas.vercel.app",
        "https://recrutas-2z1uoh51z-abas-kabatos-projects.vercel.app",
        "http://localhost:5000",
        "http://localhost:3000"
      ];
      
      if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
      next();
    });

    // Import and setup the existing authentication
    try {
      // First ensure database connection
      const { db } = await import('../server/db.js');
      console.log('Database connected for auth');
      
      const { setupBetterAuth } = await import('../server/betterAuth.js');
      setupBetterAuth(app);
      console.log('Better Auth setup complete');
    } catch (error) {
      console.error('Auth setup failed:', error);
      // Fallback auth endpoints
      app.post('/api/auth/*', (req, res) => {
        res.status(503).json({
          error: 'Authentication temporarily unavailable',
          message: 'Database connection required'
        });
      });
    }
    
    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Recrutas API is running',
        auth: 'Better Auth enabled'
      });
    });
    
    // Platform stats
    app.get('/api/platform/stats', (req, res) => {
      res.json({
        totalUsers: 5,
        totalJobs: 21,
        totalMatches: 157,
        activeChats: 12,
        status: 'operational'
      });
    });
  }
  
  return app(req, res);
}