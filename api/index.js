import express from 'express';

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

    // Better Auth implementation with error handling and fallback
    let authInstance = null;
    
    const initializeBetterAuth = async () => {
      if (authInstance) return authInstance;
      
      try {
        console.log('Starting Better Auth initialization...');
        
        // Load dependencies sequentially to avoid timeout issues
        const { betterAuth } = await import("better-auth");
        const { drizzleAdapter } = await import("better-auth/adapters/drizzle");
        const pgModule = await import('pg');
        const { drizzle } = await import('drizzle-orm/node-postgres');
        const { pgTable, text, timestamp, boolean } = await import("drizzle-orm/pg-core");
        
        console.log('Dependencies loaded successfully');
        
        // Handle different export patterns for pg module in serverless environments
        const Pool = pgModule.Pool || pgModule.default?.Pool || pgModule.default;
        
        // Schema definition exactly matching shared/schema.ts
        const users = pgTable("users", {
          id: text("id").primaryKey(),
          name: text("name").notNull(),
          email: text("email").notNull().unique(),
          emailVerified: boolean("emailVerified").notNull().default(false),
          image: text("image"),
          createdAt: timestamp("createdAt").notNull(),
          updatedAt: timestamp("updatedAt").notNull(),
          // Custom fields for our platform
          firstName: text("first_name"),
          lastName: text("last_name"),
          phoneNumber: text("phone_number"),
          profileImageUrl: text("profile_image_url"),
          role: text("role"),
          profileComplete: boolean("profile_complete").default(false),
        });

        const sessions = pgTable("sessions", {
          id: text("id").primaryKey(),
          userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
          expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
          token: text("token").notNull().unique(),
          createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
          updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
          ipAddress: text("ipAddress"),
          userAgent: text("userAgent"),
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
          createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
          updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
        });

        const verifications = pgTable("verifications", {
          id: text("id").primaryKey(),
          identifier: text("identifier").notNull(),
          value: text("value").notNull(),
          expiresAt: timestamp("expiresAt").notNull(),
          createdAt: timestamp("createdAt"),
          updatedAt: timestamp("updatedAt"),
        });

        // Database setup - Supabase with standard PostgreSQL
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL environment variable is required');
        }
        
        // Create minimal pool for serverless
        const pool = new Pool({ 
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
          max: 1,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });
        
        console.log('Database pool created');
        const db = drizzle({ client: pool, schema: { users, sessions, accounts, verifications } });
        console.log('Drizzle instance created');

        // Better Auth configured for serverless environment with JWT sessions
        const auth = betterAuth({
          secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET,
          session: {
            strategy: "jwt",
            expiresIn: 60 * 60 * 24 * 7, // 7 days
            updateAge: 60 * 60 * 24, // 1 day
          },
          emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
          },
          
          user: {
            additionalFields: {
              firstName: { 
                type: "string", 
                required: false,
                defaultValue: null
              },
              lastName: { 
                type: "string", 
                required: false,
                defaultValue: null
              },
              phoneNumber: { 
                type: "string", 
                required: false,
                defaultValue: null
              },
              role: { 
                type: "string", 
                required: false,
                defaultValue: null
              },
              profileComplete: { 
                type: "boolean", 
                required: false, 
                defaultValue: false 
              },
            },
          },
          
          session: {
            expiresIn: 604800, // 7 days
            updateAge: 86400, // 1 day
          },
          
          trustedOrigins: [
            "http://localhost:5000",
            "https://recrutas.vercel.app",
            "https://recrutas-git-main-abas-kabatos-projects.vercel.app",
            "https://recrutas-2z1uoh51z-abas-kabatos-projects.vercel.app",
          ],
          
          advanced: {
            useSecureCookies: process.env.NODE_ENV === 'production',
            defaultCookieAttributes: {
              httpOnly: false,
              secure: process.env.NODE_ENV === 'production',
              sameSite: "lax",
              path: "/",
            },
          },
        });

        authInstance = auth;
        console.log('Better Auth initialized successfully with secret:', !!process.env.BETTER_AUTH_SECRET || !!process.env.SESSION_SECRET);
        
        // Skip database test in serverless to reduce cold start time
        console.log('Better Auth initialized successfully');
        console.log('Auth configuration - baseURL:', process.env.BETTER_AUTH_URL || 'https://recrutas.vercel.app');
        
        return auth;
      } catch (error) {
        console.error('Better Auth initialization failed:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        throw error;
      }
    };

    // Skip pre-initialization to avoid cold start timeout
    let betterAuthInstance = null;

    // Better Auth handler optimized for serverless
    app.all('/api/auth/*', async (req, res) => {
      console.log('Auth endpoint:', req.method, req.url);
      
      try {
        // Initialize on demand for better cold start performance
        if (!betterAuthInstance) {
          console.log('Initializing Better Auth...');
          betterAuthInstance = await initializeBetterAuth();
        }
        const auth = betterAuthInstance;
        
        // Build proper URL for the request - CRITICAL: Use the exact URL structure Better Auth expects
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'recrutas.vercel.app';
        const fullUrl = `${protocol}://${host}${req.url}`;
        console.log('Processing auth request to:', fullUrl);
        console.log('Request method:', req.method);
        console.log('Request body:', JSON.stringify(req.body));
        
        // Create headers object properly
        const headers = new Headers();
        Object.entries(req.headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            headers.set(key, value);
          } else if (Array.isArray(value) && value.length > 0) {
            headers.set(key, value[0]);
          }
        });

        // Handle request body properly
        let body = null;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          if (req.body && typeof req.body === 'object') {
            body = JSON.stringify(req.body);
            headers.set('Content-Type', 'application/json');
          } else if (req.body && typeof req.body === 'string') {
            body = req.body;
          }
          console.log('Request body prepared:', !!body);
        }

        // Create Web API Request object with proper configuration for Vercel
        const requestInit = {
          method: req.method,
          headers,
        };
        
        // Only add body for methods that support it
        if (body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
          requestInit.body = body;
          console.log('Adding body to request:', body.substring(0, 100));
        }
        
        const webRequest = new Request(fullUrl, requestInit);

        // Process with Better Auth with detailed error catching
        console.log('Calling Better Auth handler...');
        console.log('WebRequest details:', {
          method: webRequest.method,
          url: webRequest.url,
          hasHeaders: !!webRequest.headers,
          headerCount: webRequest.headers ? webRequest.headers.size : 0,
          hasBody: !!webRequest.body
        });
        
        let response;
        try {
          response = await auth.handler(webRequest);
          console.log('Better Auth handler succeeded with status:', response.status);
        } catch (handlerError) {
          console.error('Better Auth handler threw error:', handlerError);
          console.error('Handler error type:', handlerError.constructor.name);
          console.error('Handler error message:', handlerError.message);
          console.error('Handler error stack:', handlerError.stack);
          console.error('Handler error properties:', Object.getOwnPropertyNames(handlerError));
          console.error('Handler error details:', JSON.stringify(handlerError, Object.getOwnPropertyNames(handlerError)));
          
          // Return detailed error for debugging
          return res.status(500).json({
            error: 'BETTER_AUTH_HANDLER_ERROR',
            message: handlerError.message,
            type: handlerError.constructor.name,
            stack: handlerError.stack,
            cause: handlerError.cause,
            timestamp: new Date().toISOString()
          });
        }
        
        // Handle Better Auth response
        res.status(response.status);
        
        // Copy important headers
        response.headers.forEach((value, key) => {
          if (!['content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
            res.setHeader(key, value);
          }
        });
        
        // Get and send response body
        const responseText = await response.text();
        console.log('Better Auth response status:', response.status);
        console.log('Better Auth response headers:', Object.fromEntries(response.headers.entries()));
        console.log('Better Auth response text:', responseText.substring(0, 500));
        
        if (responseText) {
          res.send(responseText);
        } else {
          res.end();
        }

      } catch (error) {
        console.error('Better Auth handler error:', error.message);
        console.error('Handler error stack:', error.stack);
        console.error('Request details:', { url: req.url, method: req.method });
        res.status(500).json({
          error: 'AUTH_HANDLER_ERROR',
          message: 'Better Auth handler failed',
          details: error.message,
          type: error.constructor.name,
          timestamp: new Date().toISOString()
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
          await initializeBetterAuth();
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