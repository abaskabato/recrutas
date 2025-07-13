// Better Auth handler for Vercel deployment
import { auth } from '../../server/betterAuth.js';

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
        
        await client`
          INSERT INTO "session" (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
          VALUES (${sessionId}, ${userId}, ${sessionToken}, ${expiresAt}, NOW(), NOW())
        `;

        // Set session cookie
        res.setHeader('Set-Cookie', [
          `better-auth.session_token=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; Secure`,
          `better-auth.csrf_token=${nanoid(32)}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; Secure`
        ]);

        console.log('User created successfully:', userId);
        
        return res.status(200).json({
          user: { 
            id: userId, 
            name, 
            email,
            emailVerified: false,
            image: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            role: null
          },
          session: { 
            id: sessionId, 
            userId, 
            expiresAt,
            token: sessionToken
          }
        });
        
      } finally {
        await client.end();
      }
    }
    
    // Handle sign-in
    if (req.url?.includes('/sign-in') && req.method === 'POST') {
      const { email, password } = req.body;
      
      console.log('Sign-in attempt:', email);
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required' 
        });
      }

      const client = createVercelDB();
      
      try {
        // Find user
        const users = await client`
          SELECT * FROM "user" WHERE email = ${email} LIMIT 1
        `;
        
        if (users.length === 0) {
          return res.status(400).json({ 
            error: 'Invalid credentials' 
          });
        }
        
        const user = users[0];
        
        // Create session (password verification can be added later)
        const sessionId = nanoid();
        const sessionToken = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        await client`
          INSERT INTO "session" (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
          VALUES (${sessionId}, ${user.id}, ${sessionToken}, ${expiresAt}, NOW(), NOW())
        `;

        // Set session cookie
        res.setHeader('Set-Cookie', [
          `better-auth.session_token=${sessionToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; Secure`,
          `better-auth.csrf_token=${nanoid(32)}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; Secure`
        ]);

        console.log('User signed in successfully:', user.id);
        
        return res.status(200).json({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: user.role
          },
          session: { 
            id: sessionId, 
            userId: user.id, 
            expiresAt,
            token: sessionToken
          }
        });
        
      } finally {
        await client.end();
      }
    }
    
    // Handle get session
    if (req.url?.includes('/get-session') || req.url?.includes('/session')) {
      return res.status(200).json({ 
        session: null, 
        user: null 
      });
    }
    
    // Handle sign-out
    if (req.url?.includes('/sign-out') && req.method === 'POST') {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                         req.cookies?.['better-auth.session_token'];
      
      if (sessionToken) {
        const client = createVercelDB();
        try {
          await client`
            DELETE FROM "session" WHERE token = ${sessionToken}
          `;
        } finally {
          await client.end();
        }
      }
      
      // Clear session cookies
      res.setHeader('Set-Cookie', [
        'better-auth.session_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure',
        'better-auth.csrf_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure'
      ]);
      
      return res.status(200).json({ success: true });
    }
    
    return res.status(404).json({ error: 'Endpoint not found' });
    
  } catch (error) {
    console.error('Auth endpoint error:', error);
    return res.status(500).json({ 
      error: 'Authentication service error',
      details: error.message 
    });
  }
}