// Better Auth handler for Vercel deployment
import { auth } from '../auth-config-vercel.js';

export default async function handler(req, res) {
  try {
    // Create a proper Web Request object for Better Auth
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const url = new URL(req.url, `${protocol}://${host}`);

    // Set up headers properly
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      }
    });

    // Handle request body
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        headers.set('Content-Type', 'application/json');
      }
    }

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
    });

    // Call Better Auth handler
    const response = await auth.handler(webRequest);
    
    // Forward response status and headers
    res.status(response.status);
    
    // Copy headers from Better Auth response
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    // Get response body
    const responseBody = await response.text();
    
    // Send response
    if (responseBody) {
      res.send(responseBody);
    } else {
      res.end();
    }
    
  } catch (error) {
    console.error('Better Auth error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: error.message 
    });
  }
}