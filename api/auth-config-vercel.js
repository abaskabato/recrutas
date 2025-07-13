// Better Auth configuration for Vercel deployment with Supabase
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createVercelDB } from './db-vercel.js';

// Initialize database connection
const db = createVercelDB();

// Better Auth configuration optimized for Vercel + Supabase
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // Use compatible schema names for Supabase
    schema: {
      user: "user",
      session: "session", 
      account: "account",
      verification: "verification",
    },
  }),
  basePath: "/api/auth",
  baseURL: process.env.BETTER_AUTH_URL || "https://recrutas.vercel.app",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    "https://recrutas.vercel.app",
    "https://preview-*.vercel.app",
    "http://localhost:3000",
    "http://localhost:5000"
  ],
  session: {
    // Optimized for serverless
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5 // 5 minutes for serverless
    },
    cookieSecure: true, // Always secure in production
    cookieSameSite: 'lax',
    cookieHttpOnly: false,
    cookieDomain: undefined,
    cookiePath: '/',
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // 1 day
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
    maxPasswordLength: 128,
    autoSignIn: true,
    sendResetPassword: async ({ user, url, token }) => {
      // Log for now, can be enhanced with SendGrid later
      console.log(`Password reset requested for ${user.email}`);
      console.log(`Reset URL: ${url}`);
    },
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
  },
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: false,
      },
      lastName: {
        type: "string", 
        required: false,
      },
      phoneNumber: {
        type: "string",
        required: false,
      },
      profileImageUrl: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: false,
      },
      profileComplete: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },
  // Serverless optimizations
  rateLimit: {
    enabled: true,
    window: 60, // 1 minute
    max: 100, // 100 requests per minute
  },
  advanced: {
    // Generate shorter IDs for better performance
    generateId: () => Math.random().toString(36).substring(2, 15),
    // Optimize for cold starts
    crossSubDomainCookies: false,
    useSecureCookies: true,
    cookiePrefix: "recrutas",
  },
});