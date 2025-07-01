// Serverless API handler with Better Auth support
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { users, sessions, accounts, verifications } from "../shared/schema.js";

// Setup database connection
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { users, sessions, accounts, verifications } });

// Setup Better Auth
const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", 
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  trustedOrigins: [
    "https://recrutas-2z1uoh51z-abas-kabatos-projects.vercel.app",
    "http://localhost:5000",
    "http://localhost:3000"
  ],
});

export default async function handler(req, res) {
  // Enable CORS for your domain
  const origin = req.headers.origin;
  const allowedOrigins = [
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

  try {
    // Handle Better Auth routes
    if (req.url.startsWith('/api/auth/')) {
      return await auth.handler(req, res);
    }
    
    // Health check
    if (req.url === '/api/health') {
      return res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Recrutas API with authentication is running' 
      });
    }
    
    // Platform stats
    if (req.url === '/api/platform/stats') {
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
      availableEndpoints: ['/api/health', '/api/auth/*', '/api/platform/stats']
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}