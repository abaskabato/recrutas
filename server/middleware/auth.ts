import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase-client';

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authorization.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  (req as any).user = user;

  next();
};