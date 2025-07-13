import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create Better Auth instance directly in the handler
const createAuth = () => {
  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(client);
  
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    baseURL: process.env.BETTER_AUTH_URL || "https://recrutas.vercel.app",
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true },
    session: { expiresIn: 60 * 60 * 24 * 7 }, // 7 days
  });
};

export default async function handler(req, res) {
  try {
    const auth = createAuth();
    
    // Convert Vercel request to Web Request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const url = new URL(req.url, `${protocol}://${host}`);
    
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') headers.set(key, value);
    });
    
    let body = undefined;
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
    
    const responseBody = await response.text();
    res.send(responseBody);
    
  } catch (error) {
    console.error('Better Auth error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: error.message 
    });
  }
}