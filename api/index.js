import express from 'express';
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema.js";

// Database setup
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

// Better Auth setup
const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      firstName: { type: "string", required: false },
      lastName: { type: "string", required: false },
      phoneNumber: { type: "string", required: false },
      role: { type: "string", required: false },
      profileComplete: { type: "boolean", required: false, defaultValue: false },
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 30 * 60 },
    cookieOptions: {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      path: "/",
      domain: undefined,
    },
  },
  trustedOrigins: [
    "http://localhost:5000",
    "https://recrutas.vercel.app",
    "https://recrutas-2z1uoh51z-abas-kabatos-projects.vercel.app",
  ],
});

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

    // Setup Better Auth handler
    app.all("/api/auth/*", async (req, res) => {
      try {
        const protocol = req.protocol || 'https';
        const host = req.get('host') || 'localhost:5000';
        const url = new URL(req.url, `${protocol}://${host}`);
        
        const headers = new Headers();
        Object.entries(req.headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            headers.set(key, value);
          } else if (Array.isArray(value)) {
            headers.set(key, value.join(', '));
          }
        });

        let body;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          if (req.body && Object.keys(req.body).length > 0) {
            body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            headers.set('Content-Type', 'application/json');
          }
        }

        const webRequest = new Request(url.toString(), {
          method: req.method,
          headers,
          body,
        });

        const response = await auth.handler(webRequest);
        
        // Set status and headers
        res.status(response.status);
        
        // Copy response headers
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        
        // Send response body
        if (response.body) {
          const text = await response.text();
          res.send(text);
        } else {
          res.end();
        }
      } catch (error) {
        console.error('Auth handler error:', error);
        res.status(500).json({
          error: 'Authentication error',
          message: error.message
        });
      }
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
        
        const result = await db.execute('SELECT 1 as test');
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