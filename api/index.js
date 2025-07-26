import express from 'express';
import { db } from '../server/db.js';
import { users, sessions, accounts, verifications } from '../shared/schema.js';


let app;
let authEnabled = false;

export default async function handler(req, res) {
  if (!app) {
    app = express();
    // Enhanced middleware with debugging for Vercel serverless
    app.use((req, res, next) => {
      console.log(`Request: ${req.method} ${req.url}`);
      next();
    });
    
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Log parsed body for debugging
    app.use((req, res, next) => {
      if (req.body && Object.keys(req.body).length > 0) {
        console.log('Parsed body:', JSON.stringify(req.body));
      }
      next();
    });
    
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

    // Auth routes are handled by the Next.js API route at pages/api/auth/[...auth].ts
    // This ensures that the same auth instance is used across the application.
    
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
    
    // Debug endpoint for troubleshooting
    app.get('/api/debug', async (req, res) => {
      try {
        console.log('Debug endpoint accessed');
        
        const debugInfo = {
          environment: {
            nodeEnv: process.env.NODE_ENV,
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            hasBetterAuthSecret: !!process.env.BETTER_AUTH_SECRET,
            platform: 'vercel'
          },
          timestamp: new Date().toISOString(),
          message: 'Debug information for authentication troubleshooting'
        };
        
        // Test Better Auth initialization
        try {
          const { auth } = await import('../../server/auth.ts');
          debugInfo.betterAuth = { status: 'initialized', error: null };
        } catch (authError) {
          debugInfo.betterAuth = { 
            status: 'failed', 
            error: authError.message,
            stack: authError.stack 
          };
        }
        
        res.json(debugInfo);
      } catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({ 
          error: 'Debug endpoint failed', 
          message: error.message 
        });
      }
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
        
        // Simple database test for Supabase
        const pgTestModule = await import('pg');
        const TestPool = pgTestModule.Pool || pgTestModule.default?.Pool || pgTestModule.default;
        const testPool = new TestPool({ 
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        const result = await testPool.query('SELECT 1 as test');
        await testPool.end();
        
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