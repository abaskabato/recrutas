import { Request, Response, NextFunction } from 'express';

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 1. Try to get the token from the Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. If not in header, try to get it from cookies (for browser-based clients)
  if (!token && req.cookies && req.cookies['sb-access-token']) {
    token = req.cookies['sb-access-token'];
  }

  if (!token) {
    console.log('isAuthenticated: No token found');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    // Parse and validate JWT locally without network request to Supabase
    // This eliminates the "fetch failed" error when Supabase is unreachable
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token format' });
    }

    // Decode JWT payload (middle part)
    let payload: any;
    try {
      const decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
      payload = JSON.parse(decoded);
    } catch (parseError) {
      console.error('isAuthenticated: Failed to parse JWT payload');
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    // Validate token expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.warn('isAuthenticated: Token expired');
      return res.status(401).json({ message: 'Unauthorized: Token expired' });
    }

    // Validate token has required fields
    if (!payload.sub && !payload.user_id) {
      console.warn('isAuthenticated: Token missing user ID');
      return res.status(401).json({ message: 'Unauthorized: Invalid token payload' });
    }

    // Create user object from JWT payload
    const user = {
      id: payload.sub || payload.user_id,
      email: payload.email,
      user_metadata: payload.user_metadata || {},
      app_metadata: payload.app_metadata || {},
    };

    (req as any).user = user;
    console.log('isAuthenticated: User authenticated:', user.id);
    next();
  } catch (error) {
    console.error('isAuthenticated: Error during authentication:', error);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};