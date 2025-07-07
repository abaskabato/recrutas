// Minimal Better Auth test without database
import { betterAuth } from "better-auth";

const auth = betterAuth({
  database: {
    provider: "pg",
    url: process.env.DATABASE_URL,
  },
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["https://recrutas.vercel.app", "http://localhost:5000"],
});

export default async function handler(req, res) {
  try {
    console.log('Minimal auth test:', req.method, req.url);
    console.log('Request body:', JSON.stringify(req.body));
    
    // Create Web API Request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'recrutas.vercel.app';
    const fullUrl = `${protocol}://${host}${req.url}`;
    
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value) && value.length > 0) {
        headers.set(key, value[0]);
      }
    });

    let body = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body && typeof req.body === 'object') {
        body = JSON.stringify(req.body);
        headers.set('Content-Type', 'application/json');
      }
    }

    const webRequest = new Request(fullUrl, {
      method: req.method,
      headers,
      body,
    });

    console.log('Calling auth handler...');
    const response = await auth.handler(webRequest);
    console.log('Auth response status:', response.status);
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!['content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    
    if (responseText) {
      res.send(responseText);
    } else {
      res.end();
    }
    
  } catch (error) {
    console.error('Minimal auth error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'MINIMAL_AUTH_ERROR',
      message: error.message,
      stack: error.stack
    });
  }
}