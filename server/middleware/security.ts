import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

/**
 * Timing-safe admin secret verification.
 * Returns false and sends 401 if verification fails.
 */
export function verifyAdminSecret(req: Request, res: Response): boolean {
  const secret = req.headers['x-admin-secret'] as string | undefined;
  if (!process.env.ADMIN_SECRET || !secret) {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }
  const expected = Buffer.from(process.env.ADMIN_SECRET);
  const received = Buffer.from(secret);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }
  return true;
}

/**
 * Timing-safe cron secret verification.
 * Returns 500 if CRON_SECRET is not configured, 401 if mismatch.
 */
export function verifyCronSecret(req: Request, res: Response): boolean {
  if (!process.env.CRON_SECRET) {
    res.status(500).json({ message: 'CRON_SECRET not configured' });
    return false;
  }
  const secret = req.headers['x-cron-secret'] as string | undefined;
  if (!secret) {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }
  const expected = Buffer.from(process.env.CRON_SECRET);
  const received = Buffer.from(secret);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }
  return true;
}

/**
 * Stricter rate limiter for admin endpoints: 5 attempts per 15 minutes.
 */
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many admin requests, please try again later' },
});
