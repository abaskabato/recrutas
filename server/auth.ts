import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { users, sessions, accounts, verifications } from "../shared/schema";
import type { Request, Response, NextFunction } from 'express';

console.log('Initializing Better Auth...');
const baseURL = process.env.BETTER_AUTH_URL || (process.env.NODE_ENV === 'development' ? `http://localhost:5000` : "https://recrutas.vercel.app");
const trustedOrigins = [
    "http://localhost:5000",
    "https://*.replit.app", 
    "https://*.replit.dev",
    "https://recrutas.vercel.app",
    "https://recrutas-2z1uoh51z-abas-kabatos-projects.vercel.app",
    "https://e0f14cb7-13c7-49be-849b-00e0e677863c-00-13vuezjrrpu3a.picard.replit.dev",
    process.env.REPLIT_DEV_DOMAIN || "",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ].filter(Boolean);

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
