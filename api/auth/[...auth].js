import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Simplified schema for Vercel
const userSchema = {
  id: { type: "string", primaryKey: true },
  name: { type: "string", required: true },
  email: { type: "string", required: true, unique: true },
  emailVerified: { type: "boolean", default: false },
  image: { type: "string", required: false },
  createdAt: { type: "date", required: true },
  updatedAt: { type: "date", required: true },
  role: { type: "string", required: false },
};

const sessionSchema = {
  id: { type: "string", primaryKey: true },
  userId: { type: "string", required: true },
  expiresAt: { type: "date", required: true },
  token: { type: "string", required: true, unique: true },
  createdAt: { type: "date", required: false },
  updatedAt: { type: "date", required: false },
  ipAddress: { type: "string", required: false },
  userAgent: { type: "string", required: false },
};

let authInstance = null;

function createAuth() {
  if (authInstance) return authInstance;
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const client = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(client);

  authInstance = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      usePlural: false,
    }),
    basePath: "/api/auth",
    baseURL: process.env.BETTER_AUTH_URL || "https://recrutas.vercel.app",
    secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key",
    trustedOrigins: ["https://recrutas.vercel.app"],
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24 * 7 // 7 days
      },
      cookieSecure: true,
      cookieSameSite: 'lax',
      cookieHttpOnly: true,
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 6,
      autoSignIn: true,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
        },
      },
    },
  });

  return authInstance;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://recrutas.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const auth = createAuth();
    return await auth.handler(req, res);
  } catch (error) {
    console.error('Better Auth error:', error);
    return res.status(500).json({ error: 'Authentication service error' });
  }
}