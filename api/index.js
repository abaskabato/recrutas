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

    // Better Auth handler - load once and reuse
    let betterAuthHandler = null;
    
    const initializeBetterAuth = async () => {
      if (betterAuthHandler) return betterAuthHandler;
      
      try {
        const { betterAuth } = await import("better-auth");
        const { drizzleAdapter } = await import("better-auth/adapters/drizzle");
        const { Pool, neonConfig } = await import('@neondatabase/serverless');
        const { drizzle } = await import('drizzle-orm/neon-serverless');
        const ws = await import("ws");
        
        // Define schema inline to avoid import path issues  
        const { pgTable, text, timestamp, boolean } = await import("drizzle-orm/pg-core");
        
        const users = pgTable("users", {
          id: text("id").primaryKey(),
          email: text("email").unique().notNull(),
          emailVerified: timestamp("emailVerified"),
          name: text("name"),
          image: text("image"),
          firstName: text("firstName"),
          lastName: text("lastName"),
          phoneNumber: text("phoneNumber"),
          role: text("role"),
          profileComplete: boolean("profileComplete").default(false),
          createdAt: timestamp("createdAt").defaultNow(),
          updatedAt: timestamp("updatedAt").defaultNow(),
        });

        const sessions = pgTable("sessions", {
          id: text("id").primaryKey(),
          expiresAt: timestamp("expiresAt").notNull(),
          token: text("token").notNull().unique(),
          createdAt: timestamp("createdAt").notNull(),
          updatedAt: timestamp("updatedAt").notNull(),
          ipAddress: text("ipAddress"),
          userAgent: text("userAgent"),
          userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
        });

        const accounts = pgTable("accounts", {
          id: text("id").primaryKey(),
          accountId: text("accountId").notNull(),
          providerId: text("providerId").notNull(),
          userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
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

        neonConfig.webSocketConstructor = ws.default;
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const db = drizzle({ client: pool, schema: { users, sessions, accounts, verifications } });

        const auth = betterAuth({
          database: drizzleAdapter(db, {
            provider: "pg",
            schema: { user: users, session: sessions, account: accounts, verification: verifications },
          }),
          emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
            minPasswordLength: 6,
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
              secure: true,
              sameSite: "lax",
              path: "/",
            },
          },
          trustedOrigins: [
            "http://localhost:5000",
            "https://recrutas.vercel.app",
            "https://recrutas-2z1uoh51z-abas-kabatos-projects.vercel.app",
          ],
        });

        betterAuthHandler = auth;
        return auth;
      } catch (error) {
        console.error('Better Auth initialization failed:', error);
        throw error;
      }
    };

    // Handle all auth routes
    app.all('/api/auth/*', async (req, res) => {
      try {
        const auth = await initializeBetterAuth();
        
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
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
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
          body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
          headers.set('Content-Type', 'application/json');
        }

        const webRequest = new Request(url.toString(), {
          method: req.method,
          headers,
          body,
        });

        const response = await auth.handler(webRequest);
        
        res.status(response.status);
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        
        if (response.body) {
          const text = await response.text();
          res.send(text);
        } else {
          res.end();
        }
      } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: 'Authentication service unavailable'
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