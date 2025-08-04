import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { users, sessions, accounts, verifications } from "../shared/schema";
import type { Request, Response, NextFunction } from 'express';

console.log('Initializing Better Auth...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL_URL:', process.env.VERCEL_URL);
console.log('BETTER_AUTH_URL:', process.env.BETTER_AUTH_URL);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('BETTER_AUTH_SECRET exists:', !!process.env.BETTER_AUTH_SECRET);
console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
console.log('GITHUB_CLIENT_ID exists:', !!process.env.GITHUB_CLIENT_ID);
console.log('MICROSOFT_CLIENT_ID exists:', !!process.env.MICROSOFT_CLIENT_ID);


/**
 * Dynamically determines the application's base URL.
 * This is critical for ensuring authentication callbacks and redirects work correctly across all environments.
 * - Uses `VERCEL_URL` for Vercel deployments (both production and preview).
 * - Falls back to `BETTER_AUTH_URL` if explicitly set.
 * - Defaults to localhost for local development.
 * - Uses the production domain as a final fallback.
 */
const getBaseURL = () => {
  // 1. Vercel system environment variable (preferred for Vercel deployments)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // 2. Explicitly set URL (for other environments or overrides)
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }
  // 3. Local development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000';
  }
  // 4. Fallback to production URL
  return 'https://recrutas.vercel.app';
};

const baseURL = getBaseURL();

/**
 * Constructs a list of trusted origins for CORS.
 * This is a security measure to ensure only approved frontends can communicate with the auth API.
 * - Always trusts the application's own `baseURL`.
 * - Adds Vercel-specific preview URLs if in a preview environment.
 * - Includes localhost and Replit for development.
 */
const trustedOrigins = [
  baseURL, // The application's own URL is always trusted
  "http://localhost:5000",
  "https://*.replit.app",
  "https://*.replit.dev",
].filter(Boolean);

// In a Vercel preview environment, the frontend may be on a different URL than the backend.
// `VERCEL_BRANCH_URL` points to the canonical URL for the branch deployment.
if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_BRANCH_URL) {
    trustedOrigins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
}

console.log(`Auth baseURL: ${baseURL}`);
console.log(`Auth trustedOrigins: ${JSON.stringify(trustedOrigins)}`);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  basePath: "/api/auth",
  baseURL: baseURL,
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key-please-change-in-production",
  session: {
    strategy: "jwt",
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
      enabled: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    },
  },
  trustedOrigins: trustedOrigins,
});

export const { handler, api } = auth;

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await api.getSession({ headers: new Headers(req.headers as any) });
    console.log('isAuthenticated session:', session);
    if (session?.user) {
      (req as any).user = session.user;
      console.log('isAuthenticated user:', session.user);
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error('isAuthenticated error:', error);
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export function hasRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await api.getSession({ headers: new Headers(req.headers as any) });
      if ((session?.user as any)?.role === role) {
        (req as any).user = session.user;
        return next();
      }
      return res.status(403).json({ message: "Forbidden" });
    } catch (error) {
      return res.status(403).json({ message: "Forbidden" });
    }
  };
}
