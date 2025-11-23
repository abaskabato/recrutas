import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase-client';

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
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      console.error('isAuthenticated: Supabase token verification failed:', error?.message);
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    (req as any).user = data.user;
    console.log('isAuthenticated: User authenticated:', data.user.id);
    next();
  } catch (error) {
    console.error('isAuthenticated: Error during authentication:', error);
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
};