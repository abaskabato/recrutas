import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase-client';

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  console.log('isAuthenticated middleware triggered');
  console.log('Request headers:', req.headers);
  let token: string | undefined;

  // 1. Check for Bearer token in Authorization header
  if (req.headers.authorization) {
    console.log('Authorization header found:', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7, authHeader.length);
      console.log('Extracted Bearer token:', token);
    }
  }

  // 2. If no Bearer token, check for Supabase auth cookie
  if (!token) {
    console.log('No Bearer token, checking for auth cookie.');
    const cookieHeader = req.headers.cookie;
    console.log('Cookie header:', cookieHeader);
    const authCookie = cookieHeader
      ?.split(';')
      .find(c => c.trim().startsWith('sb-'));

    if (authCookie) {
      console.log('Auth cookie found:', authCookie);
      try {
        const cookieValue = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
        token = cookieValue.access_token;
        console.log('Extracted token from cookie:', token);
      } catch (e) {
        console.error('Error parsing auth cookie:', e);
      }
    }
  }
  
  // 3. If still no token, try to get it from the request object itself (for websockets)
  if (!token && (req as any).token) {
    token = (req as any).token;
    console.log('Extracted token from request object:', token);
  }

  if (!token) {
    // Check for Supabase session cookie as a last resort
    console.log('No token yet, checking req.cookies');
    const supabaseCookie = Object.keys(req.cookies || {}).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    if (supabaseCookie) {
      token = req.cookies[supabaseCookie];
      console.log('Extracted token from req.cookies:', token);
    }
  }

  if (!token) {
    console.log('No token found after all checks.');
    return res.status(401).json({ error: 'No authorization token provided.' });
  }

  console.log('Final token being used for auth:', token);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error) {
    console.error('Supabase auth error:', error.message);
    return res.status(401).json({ error: `Authentication failed: ${error.message}` });
  }

  if (!user) {
    console.log('Supabase user not found for token.');
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  console.log('User authenticated successfully:', user.id);
  (req as any).user = user;

  next();
};