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
  basePath: "/api/auth",
  baseURL: process.env.BETTER_AUTH_URL || (process.env.NODE_ENV === 'development' ? `http://localhost:5000` : `https://${process.env.VERCEL_URL || 'recrutas.vercel.app'}`),
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key-please-change-in-production",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
    maxPasswordLength: 128,
    autoSignIn: true,
    sendResetPassword: async ({ user, url, token }) => {
      console.log(`Password reset requested for ${user.email}`);
      console.log(`Reset URL: ${url}`);
      console.log(`Reset Token: ${token}`);
      
      // Use SendGrid if configured, otherwise log for development
      if (process.env.SENDGRID_API_KEY) {
        console.log("SendGrid API key detected - attempting to send email");
        try {
          const { sendPasswordResetEmail } = await import("./email-service");
          const emailSent = await sendPasswordResetEmail(user.email, token);
          console.log(`Email sent result: ${emailSent}`);
        } catch (error) {
          console.error("Error sending password reset email:", error);
        }
      } else {
        console.log("No SendGrid API key - email sending skipped");
      }
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
        defaultValue: null,
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
      httpOnly: false, // Allow JavaScript access for client-side auth
      secure: process.env.NODE_ENV === 'production', // Enable secure in production for HTTPS
      sameSite: "lax",
      path: "/",
      domain: undefined, // Don't set domain for localhost/vercel
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: false, // Disable for development
    },
  },
  trustedOrigins: [
    // Development origins
    "http://localhost:5000",
    "https://*.replit.app", 
    "https://*.replit.dev",
    process.env.REPLIT_DEV_DOMAIN || "",
    
    // Production origins
    "https://recrutas.vercel.app",
    "https://recrutas-*.vercel.app", // Support all Vercel preview deployments
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    
    // Legacy specific deployments
    "https://recrutas-2z1uoh51z-abas-kabatos-projects.vercel.app",
    "https://e0f14cb7-13c7-49be-849b-00e0e677863c-00-13vuezjrrpu3a.picard.replit.dev",
  ].filter(Boolean),
})

export function setupBetterAuth(app: Express) {
  console.log('Setting up Better Auth middleware...');
  
  app.all("/api/auth/*", async (req, res) => {
    console.log('Better Auth request received:', req.method, req.url);
    console.log('Request body:', req.body);
    console.log('Request cookies:', req.headers.cookie);
    try {
      const protocol = req.protocol || 'http'
      const host = req.get('host') || 'localhost:5000'
      const url = new URL(req.url, `${protocol}://${host}`)
      console.log('Constructed URL:', url.toString());
      
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
        console.log('Calling auth.handler with request:', {
          method: webRequest.method,
          url: webRequest.url,
          hasBody: !!body,
          contentType: webRequest.headers.get('content-type')
        });
        response = await auth.handler(webRequest);
        console.log('Auth handler response:', response.status);
        
        // Debug session responses
        if (req.url.includes('get-session')) {
          const responseText = await response.clone().text();
          console.log('Session response body:', responseText);
        }
      } catch (error) {
        console.error('Auth handler error details:', error.message, error.stack);
        console.log('Request headers:', req.headers);
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