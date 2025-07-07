// Dedicated Better Auth serverless handler for Vercel
import { betterAuth } from "better-auth";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import ws from "ws";

// Import schema
import { users, sessions, accounts, verifications } from "../../shared/schema.js";

// Configure Neon for serverless
neonConfig.webSocketConstructor = ws;

export default async function handler(req, res) {
  try {
    // Database setup
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema: { users, sessions, accounts, verifications } });

    // Better Auth configuration for serverless
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
      secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET,
      baseURL: 'https://recrutas.vercel.app',
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
      },
    });

    // Handle the request
    return await auth.handler(req, res);
  } catch (error) {
    console.error('Better Auth handler error:', error);
    return res.status(500).json({
      error: 'AUTH_HANDLER_ERROR',
      message: error.message,
      type: error.constructor.name,
    });
  }
}