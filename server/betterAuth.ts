import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"
import { users, sessions, accounts, verifications } from "../shared/schema"
import type { Express } from "express"

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
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
    maxPasswordLength: 128,
    autoSignIn: true,
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
      maxAge: 30 * 60, // 30 minutes
    },
    cookieOptions: {
      httpOnly: false, // Set to false for development to allow JavaScript access
      secure: false, // Set to false for development
      sameSite: "lax",
      path: "/",
      domain: undefined, // Don't set domain for localhost
    },
  },
  trustedOrigins: [
    "http://localhost:5000",
    "https://*.replit.app", 
    "https://*.replit.dev",
    "https://e0f14cb7-13c7-49be-849b-00e0e677863c-00-13vuezjrrpu3a.picard.replit.dev",
    process.env.REPLIT_DEV_DOMAIN || "",
  ].filter(Boolean),
})

export function setupBetterAuth(app: Express) {
  app.all("/api/auth/*", async (req, res) => {
    try {
      const protocol = req.protocol || 'http'
      const host = req.get('host') || 'localhost:5000'
      const url = new URL(req.url, `${protocol}://${host}`)
      
      // Debug logging for auth requests
      if (req.url.includes('sign-out')) {
        console.log('Sign out request:', {
          method: req.method,
          url: req.url,
          cookies: req.headers.cookie,
          body: req.body
        });
      }
      
      const headers = new Headers()
      Object.entries(req.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers.set(key, value)
        } else if (Array.isArray(value)) {
          headers.set(key, value.join(', '))
        }
      })

      let body: string | undefined
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (req.body && Object.keys(req.body).length > 0) {
          body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
          headers.set('Content-Type', 'application/json')
        } else if (req.url.includes('sign-out')) {
          // For sign out, ensure we have an empty body
          body = '{}'
          headers.set('Content-Type', 'application/json')
        }
      }

      const webRequest = new Request(url.toString(), {
        method: req.method,
        headers,
        body,
      })

      let response;
      try {
        response = await auth.handler(webRequest);
      } catch (error) {
        // If auth handler completely fails for sign out, clear cookies anyway
        if (req.url.includes('sign-out')) {
          console.log('Auth handler failed for sign out, clearing cookies manually');
          res.clearCookie('better-auth.session_token', { path: '/', httpOnly: false, secure: false });
          res.clearCookie('better-auth.session_data', { path: '/', httpOnly: false, secure: false });
          res.clearCookie('connect.sid', { path: '/', httpOnly: true, secure: false });
          res.status(200).json({ success: true, message: 'Signed out successfully' });
          return;
        }
        throw error;
      }
      
      // Special handling for sign out failures - clear cookies and return success
      if (req.url.includes('sign-out') && (response.status === 400 || response.status === 401)) {
        console.log('Sign out completed, clearing all session cookies');
        res.clearCookie('better-auth.session_token', { path: '/', httpOnly: false, secure: false });
        res.clearCookie('better-auth.session_data', { path: '/', httpOnly: false, secure: false });
        res.clearCookie('connect.sid', { path: '/', httpOnly: true, secure: false });
        res.status(200).json({ success: true, message: 'Signed out successfully' });
        return;
      }
      
      // Debug logging for auth responses
      if (req.url.includes('sign-out')) {
        const responseText = await response.clone().text();
        console.log('Sign out response:', {
          status: response.status,
          body: responseText,
          headers: Object.fromEntries(response.headers.entries())
        });
      }
      
      res.status(response.status)
      response.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })
      
      if (response.body) {
        const text = await response.text()
        res.send(text)
      } else {
        res.end()
      }
    } catch (error) {
      console.error("Better Auth handler error:", error)
      res.status(500).json({ error: "Authentication system error" })
    }
  })
}

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