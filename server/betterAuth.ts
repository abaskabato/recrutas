import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import type { Express } from "express"

// Better Auth configuration
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // PostgreSQL
  }),
  emailAndPassword: {
    enabled: true,
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
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },
  },
  trustedOrigins: [
    "http://localhost:5000",
    "https://*.replit.app",
    "https://*.replit.dev",
  ],
})

export function setupBetterAuth(app: Express) {
  // Mount Better Auth handler with proper request conversion
  app.all("/api/auth/*", async (req, res) => {
    try {
      // Convert Express request to Web API Request format
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:5000';
      const url = new URL(req.url, `${protocol}://${host}`);
      
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers.set(key, value);
        } else if (Array.isArray(value)) {
          headers.set(key, value.join(', '));
        }
      });

      // Create Web API Request
      const webRequest = new Request(url.toString(), {
        method: req.method,
        headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      });

      const response = await auth.handler(webRequest);
      
      // Convert Web API Response back to Express response
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      
      res.status(response.status);
      
      if (response.body) {
        const text = await response.text();
        res.send(text);
      } else {
        res.end();
      }
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });
}

// Auth middleware
export async function isAuthenticated(req: any, res: any, next: any) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })
    
    if (session?.user) {
      req.user = session.user
      next()
    } else {
      res.status(401).json({ message: "Unauthorized" })
    }
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" })
  }
}