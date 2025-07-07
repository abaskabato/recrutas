// Working authentication endpoint for Vercel deployment
import { betterAuth } from "better-auth";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Simplified schema for Better Auth
const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
});

const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

// Initialize database connection
let db;
if (process.env.DATABASE_URL) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema: { users, sessions, accounts, verifications } });
}

// Initialize Better Auth with minimal configuration
const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [
    "https://recrutas.vercel.app",
    "https://recrutas-git-main-abas-kabatos-projects.vercel.app",
    "http://localhost:5000"
  ],
  secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "https://recrutas.vercel.app",
});

export default async function handler(req, res) {
  try {
    // Enable CORS
    const origin = req.headers.origin;
    const allowedOrigins = [
      "https://recrutas.vercel.app",
      "https://recrutas-git-main-abas-kabatos-projects.vercel.app",
      "http://localhost:5000"
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

    // Create proper Web API Request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'recrutas.vercel.app';
    const fullUrl = `${protocol}://${host}${req.url.replace('/api/auth-working', '/api/auth')}`;
    
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value) && value.length > 0) {
        headers.set(key, value[0]);
      }
    });

    let body = null;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      if (typeof req.body === 'object') {
        body = JSON.stringify(req.body);
        headers.set('Content-Type', 'application/json');
      } else if (typeof req.body === 'string') {
        body = req.body;
      }
    }

    const webRequest = new Request(fullUrl, {
      method: req.method,
      headers,
      body,
    });

    // Call Better Auth handler
    const response = await auth.handler(webRequest);
    
    // Forward response
    res.status(response.status);
    
    response.headers.forEach((value, key) => {
      if (!['content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    
    const responseText = await response.text();
    if (responseText) {
      res.send(responseText);
    } else {
      res.end();
    }
    
  } catch (error) {
    console.error('Working auth error:', error);
    res.status(500).json({
      error: 'WORKING_AUTH_ERROR',
      message: error.message,
      details: error.stack
    });
  }
}