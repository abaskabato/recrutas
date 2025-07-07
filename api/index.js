import express from 'express';

let app;
let authEnabled = false;

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

    // Better Auth compatible endpoints for frontend
    app.post('/api/auth/email/signup', async (req, res) => {
      res.status(400).json({
        error: 'SIGNUP_DISABLED',
        message: 'Registration is temporarily unavailable'
      });
    });

    app.post('/api/auth/email/signin', async (req, res) => {
      res.status(400).json({
        error: 'SIGNIN_DISABLED', 
        message: 'Sign in is temporarily unavailable'
      });
    });

    app.get('/api/auth/session', async (req, res) => {
      res.json({
        user: null,
        session: null
      });
    });
    
    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Recrutas API is running',
        auth: 'Better Auth enabled',
        dbConfigured: !!process.env.DATABASE_URL
      });
    });
    
    // Database connection test
    app.get('/api/db-test', async (req, res) => {
      try {
        if (!process.env.DATABASE_URL) {
          return res.json({ 
            error: 'DATABASE_URL not found in environment variables',
            envVars: Object.keys(process.env).filter(key => key.includes('DB') || key.includes('DATABASE'))
          });
        }
        
        // Simple database test without complex imports
        const { Pool } = await import('@neondatabase/serverless');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const result = await pool.query('SELECT 1 as test');
        await pool.end();
        
        res.json({ 
          success: true, 
          message: 'Database connection successful',
          result: result.rows?.[0] || result[0]
        });
      } catch (error) {
        res.json({ 
          error: 'Database connection failed', 
          message: error.message,
          hasUrl: !!process.env.DATABASE_URL
        });
      }
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