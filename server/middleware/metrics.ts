/**
 * Request metrics middleware
 *
 * Samples 20% of API requests and stores latency + status in request_metrics.
 * Used by the /admin/metrics dashboard for p50/p95/p99 per endpoint.
 * Non-blocking: DB write happens after response is sent.
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { requestMetrics } from '../../shared/schema.js';

const SAMPLE_RATE = 0.20; // 20% sampling

// Normalize endpoint path — replace numeric IDs with :id to group routes
function normalizeEndpoint(path: string): string {
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid');
}

export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only sample API routes, skip health + static
    if (!req.path.startsWith('/api') || req.path === '/api/health') {
      return next();
    }
    // Sample at configured rate
    if (Math.random() > SAMPLE_RATE) {
      return next();
    }

    const start = Date.now();
    const endpoint = normalizeEndpoint(req.path);
    const method = req.method;

    res.on('finish', () => {
      if (!db) return;
      const durationMs = Date.now() - start;
      const statusCode = res.statusCode;
      const errorMessage = statusCode >= 500 ? res.statusMessage || 'Server Error' : undefined;

      // Fire-and-forget DB write — never blocks the response
      db.insert(requestMetrics).values({
        endpoint,
        method,
        statusCode,
        durationMs,
        errorMessage,
      }).catch(err => {
        // Silently swallow — metrics loss is acceptable, logging is not
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Metrics] Failed to write metric:', err.message);
        }
      });
    });

    next();
  };
}
