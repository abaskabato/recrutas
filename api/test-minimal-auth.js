// Minimal Better Auth test without database
import { betterAuth } from "better-auth";

export default async function handler(req, res) {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    console.log('Minimal auth test - initializing Better Auth...');
    
    // Minimal Better Auth without database
    const auth = betterAuth({
      secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET || 'test-secret',
      baseURL: 'https://recrutas.vercel.app',
      trustedOrigins: ["https://recrutas.vercel.app"],
      emailAndPassword: {
        enabled: true,
      },
    });

    console.log('Better Auth created successfully');

    // Create minimal web request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'recrutas.vercel.app';
    const fullUrl = `${protocol}://${host}${req.url.replace('/api/test-minimal-auth', '/api/auth')}`;
    
    console.log('Processing request to:', fullUrl);
    console.log('Request method:', req.method);
    console.log('Request body type:', typeof req.body);
    console.log('Request body:', JSON.stringify(req.body));

    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers.set(key, value);
      }
    });

    let body = null;
    if (req.method === 'POST' && req.body) {
      body = JSON.stringify(req.body);
      headers.set('Content-Type', 'application/json');
    }

    const webRequest = new Request(fullUrl, {
      method: req.method,
      headers,
      body,
    });

    console.log('About to call auth.handler...');

    try {
      const response = await auth.handler(webRequest);
      console.log('Handler response status:', response.status);
      
      const responseText = await response.text();
      console.log('Handler response text:', responseText.substring(0, 200));
      
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
      
    } catch (handlerError) {
      console.error('Handler error:', {
        name: handlerError.name,
        message: handlerError.message,
        stack: handlerError.stack,
        cause: handlerError.cause
      });
      
      res.status(500).json({
        error: 'HANDLER_ERROR',
        name: handlerError.name,
        message: handlerError.message,
        stack: handlerError.stack?.split('\n').slice(0, 5).join('\n')
      });
    }

  } catch (error) {
    console.error('Outer error:', error);
    res.status(500).json({
      error: 'OUTER_ERROR',
      message: error.message,
      details: error.stack
    });
  }
}