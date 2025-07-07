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

    // Better Auth implementation with error handling and fallback
    let authInstance = null;
    
    const initializeBetterAuth = async () => {
      if (authInstance) return authInstance;
      
      try {
        // Pre-load all dependencies to catch import errors early - Supabase compatible
        const [
          { betterAuth },
          { drizzleAdapter },
          pgModule,
          { drizzle },
          { pgTable, text, timestamp, boolean }
        ] = await Promise.all([
          import("better-auth"),
          import("better-auth/adapters/drizzle"),
          import('pg'),
          import('drizzle-orm/node-postgres'),
          import("drizzle-orm/pg-core")
        ]);
        
        // Handle different export patterns for pg module in serverless environments
        const Pool = pgModule.Pool || pgModule.default?.Pool || pgModule.default;
        
        // Schema definition - matches the existing database structure
        const users = pgTable("users", {
          id: text("id").primaryKey(),
          name: text("name").notNull(),
          email: text("email").notNull().unique(),
          emailVerified: boolean("emailVerified").notNull().default(false),
          image: text("image"),
          createdAt: timestamp("createdAt").notNull(),
          updatedAt: timestamp("updatedAt").notNull(),
          // Custom fields from our platform schema
          firstName: text("first_name"),
          lastName: text("last_name"),
          phoneNumber: text("phone_number"),
          role: text("role"),
          profileComplete: boolean("profile_complete").default(false),
          profileImageUrl: text("profile_image_url"),
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

        // Database setup - Supabase with standard PostgreSQL
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL environment variable is required');
        }
        
        // Use standard pg Pool for Supabase compatibility  
        const pool = new Pool({ 
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
          max: 1, // Single connection for serverless
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
        
        const db = drizzle({ client: pool, schema: { users, sessions, accounts, verifications } });

        // Better Auth configuration - Fixed for Vercel serverless
        const auth = betterAuth({
          secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET || 'fallback-secret-for-development-only',
          baseURL: 'https://recrutas.vercel.app',
          basePath: '/api/auth',
          
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
            sendResetPassword: async ({ user, url, token }) => {
              // Log for development - no email service required
              console.log(`Password reset requested for ${user.email}`);
              console.log(`Reset URL: ${url}`);
              console.log(`Reset Token: ${token}`);
            },
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
                defaultValue: "candidate"
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
        
        // Test database connection
        const testUser = await db.select().from(users).limit(1).catch(err => {
          console.error('Database connection test failed:', err);
          return [];
        });
        console.log('Database connection test:', testUser.length > 0 ? 'SUCCESS' : 'NO_DATA');
        console.log('Auth configuration - baseURL:', process.env.BETTER_AUTH_URL || 'https://recrutas.vercel.app');
        
        return auth;
      } catch (error) {
        console.error('Better Auth initialization failed:', error);
        throw error;
      }
    };

    // Initialize Better Auth once for the entire app instance
    let betterAuthInstance = null;
    
    try {
      betterAuthInstance = await initializeBetterAuth();
      console.log('Better Auth pre-initialized for app instance');
    } catch (error) {
      console.error('Failed to pre-initialize Better Auth:', error);
    }

    // Better Auth handler with Better Auth docs compliant configuration - Real email test
    app.all('/api/auth/*', async (req, res) => {
      console.log('Auth endpoint hit:', req.method, req.url, 'hasAuth:', !!betterAuthInstance);
      
      try {
        // Use pre-initialized instance or fallback to initialize
        const auth = betterAuthInstance || await initializeBetterAuth();
        console.log('Better Auth instance ready');
        
        // Build proper URL for the request - CRITICAL: Use the exact URL structure Better Auth expects
        const protocol = req.headers['x-forwarded-proto'] || (req.connection?.encrypted ? 'https' : 'http');
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'recrutas.vercel.app';
        const fullUrl = `${protocol}://${host}${req.url}`;
        console.log('Processing auth request to:', fullUrl);
        
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
          requestInit.duplex = 'half';
        }
        
        const webRequest = new Request(fullUrl, requestInit);

        // Process with Better Auth
        console.log('Calling Better Auth handler with URL:', fullUrl);
        const response = await auth.handler(webRequest);
        console.log('Better Auth response status:', response.status, response.statusText);
        
        // Send response properly
        res.status(response.status);
        
        // Set headers from Better Auth response
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        
        // Handle response body
        if (response.body) {
          const text = await response.text();
          console.log('Response body length:', text.length, 'first 100 chars:', text.substring(0, 100));
          res.send(text);
        } else {
          console.log('No response body - sending empty response');
          res.end();
        }
      } catch (error) {
        console.error('Better Auth handler error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: 'Authentication service temporarily unavailable',
          details: error.message,
          url: req.url,
          method: req.method,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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