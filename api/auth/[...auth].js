// Better Auth handler for Vercel deployment
export default async function handler(req, res) {
  try {
    console.log('Auth handler called:', req.method, req.url);
    
    // Import auth config dynamically to avoid issues
    const { auth } = await import('../auth-config-vercel.js');
    
    // Create a proper Web Request object for Better Auth
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'recrutas.vercel.app';
    const url = new URL(req.url, `${protocol}://${host}`);

    console.log('Request URL:', url.toString());

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
    
    console.log('Auth response status:', response.status);
    
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
      message: error.message,
      stack: error.stack
    });
  }
}