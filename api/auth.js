// Simple authentication API for Vercel
export default async function handler(req, res) {
  // Enable CORS
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

  try {
    // Initialize Better Auth on first request
    const { betterAuth } = await import("better-auth");
    const { drizzleAdapter } = await import("better-auth/adapters/drizzle");
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import("ws");
    
    // Import schema directly
    const { 
      users, 
      sessions, 
      accounts, 
      verifications 
    } = await import("../shared/schema.ts");

    // Database setup
    neonConfig.webSocketConstructor = ws.default;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema: { users, sessions, accounts, verifications } });

    // Better Auth setup
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
          secure: process.env.NODE_ENV === 'production',
          sameSite: "lax",
          path: "/",
          domain: undefined,
        },
      },
      trustedOrigins: [
        "http://localhost:5000",
        "https://recrutas.vercel.app",
        "https://recrutas-2z1uoh51z-abas-kabatos-projects.vercel.app",
      ],
    });

    // Handle auth request
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
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body && Object.keys(req.body).length > 0) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        headers.set('Content-Type', 'application/json');
      }
    }

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
    });

    const response = await auth.handler(webRequest);
    
    // Set status and headers
    res.status(response.status);
    
    // Copy response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    // Send response body
    if (response.body) {
      const text = await response.text();
      res.send(text);
    } else {
      res.end();
    }

  } catch (error) {
    console.error('Auth handler error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}