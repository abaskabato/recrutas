/**
 * Error Monitoring Service — In-house (Supabase Postgres)
 *
 * Logs errors to the `error_events` table for visibility in /admin.
 * Replaces external Sentry for early access. Lightweight, zero external deps.
 * Can be swapped to GlitchTip/Sentry later by changing this file only.
 */

import crypto from 'crypto';

interface ErrorContext {
  userId?: string;
  action?: string;
  component?: string;
  metadata?: Record<string, any>;
}

interface PerformanceSpan {
  end: () => void;
  setStatus: (status: 'ok' | 'error') => void;
}

// Lazy DB import to avoid circular dependency at startup
let dbRef: any = null;
let errorEventsRef: any = null;

async function getDb() {
  if (!dbRef) {
    try {
      const { db } = await import('./db.js');
      const { errorEvents } = await import('../shared/schema.js');
      dbRef = db;
      errorEventsRef = errorEvents;
    } catch {
      // DB not available (test env, startup race) — silently skip
    }
  }
  return { db: dbRef, errorEvents: errorEventsRef };
}

function fingerprint(message: string, component?: string): string {
  // Group errors by message + component so the admin view isn't flooded
  const input = `${component || 'unknown'}:${message.replace(/\d+/g, 'N').slice(0, 200)}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

// In-memory dedup: skip logging the same fingerprint more than once per minute
const recentFingerprints = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000;

function isDuplicate(fp: string): boolean {
  const now = Date.now();
  const last = recentFingerprints.get(fp);
  if (last && now - last < DEDUP_WINDOW_MS) return true;
  recentFingerprints.set(fp, now);
  // Prune old entries every 100 inserts
  if (recentFingerprints.size > 500) {
    for (const [k, v] of recentFingerprints) {
      if (now - v > DEDUP_WINDOW_MS) recentFingerprints.delete(k);
    }
  }
  return false;
}

/**
 * Capture an exception with optional context
 */
export async function captureException(error: Error, context?: ErrorContext): Promise<string | null> {
  // Always log to console
  console.error('[Error]', {
    message: error.message,
    stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    ...context
  });

  const fp = fingerprint(error.message, context?.component);
  if (isDuplicate(fp)) return fp;

  try {
    const { db, errorEvents } = await getDb();
    if (!db || !errorEvents) return null;

    await db.insert(errorEvents).values({
      level: 'error',
      message: error.message.slice(0, 2000),
      stack: error.stack?.slice(0, 5000) || null,
      endpoint: context?.action?.split(' ')[1] || null,
      method: context?.action?.split(' ')[0] || null,
      userId: context?.userId || null,
      component: context?.component || null,
      metadata: context?.metadata || null,
      fingerprint: fp,
    });

    return fp;
  } catch (dbErr) {
    // Don't let error monitoring crash the app
    console.warn('[ErrorMonitoring] Failed to persist error:', (dbErr as Error).message);
    return null;
  }
}

/**
 * Capture a message/event with optional severity
 */
export async function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' | 'fatal' = 'info',
  context?: ErrorContext
): Promise<string | null> {
  switch (level) {
    case 'fatal':
    case 'error':
      console.error('[Error]', message, context);
      break;
    case 'warning':
      console.warn('[Warning]', message, context);
      break;
    default:
      console.info('[Info]', message, context);
  }

  // Only persist warnings and above
  if (level === 'info') return null;

  const fp = fingerprint(message, context?.component);
  if (isDuplicate(fp)) return fp;

  try {
    const { db, errorEvents } = await getDb();
    if (!db || !errorEvents) return null;

    await db.insert(errorEvents).values({
      level,
      message: message.slice(0, 2000),
      userId: context?.userId || null,
      component: context?.component || null,
      metadata: context?.metadata || null,
      fingerprint: fp,
    });

    return fp;
  } catch {
    return null;
  }
}

/**
 * Start a performance monitoring span (lightweight, console-only)
 */
export async function startSpan(name: string, operation: string): Promise<PerformanceSpan> {
  const startTime = Date.now();

  return {
    end: () => {
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.log(`[Performance] ${operation}/${name} took ${duration}ms`);
      }
    },
    setStatus: (status: 'ok' | 'error') => {
      if (status === 'error') {
        console.warn(`[Performance] ${operation}/${name} completed with error`);
      }
    }
  };
}

/**
 * Set user context (no-op for DB-based monitoring — context passed per-event)
 */
export async function setUser(_user: { id: string; email?: string; role?: string }): Promise<void> {}

/**
 * Clear user context (no-op)
 */
export async function clearUser(): Promise<void> {}

/**
 * Add breadcrumb (no-op — breadcrumbs are a Sentry concept)
 */
export async function addBreadcrumb(
  _category: string,
  _message: string,
  _data?: Record<string, any>
): Promise<void> {}

/**
 * Express error handling middleware
 */
export function errorHandlerMiddleware() {
  return async (err: Error, req: any, res: any, _next: any) => {
    await captureException(err, {
      userId: req.user?.id,
      action: `${req.method} ${req.path}`,
      component: 'express',
      metadata: {
        query: req.query,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
      }
    });

    const IS_PRODUCTION = process.env.NODE_ENV === 'production';
    const status = (err as any).status || (err as any).statusCode || 500;
    const message = IS_PRODUCTION ? 'An unexpected error occurred' : err.message;

    if (!res.headersSent) {
      res.status(status).json({
        error: message,
        ...(IS_PRODUCTION ? {} : { stack: err.stack })
      });
    }
  };
}

/**
 * Request tracing middleware for performance monitoring
 */
export function requestTracingMiddleware() {
  return async (req: any, res: any, next: any) => {
    const span = await startSpan(`${req.method} ${req.path}`, 'http.request');

    res.on('finish', () => {
      span.setStatus(res.statusCode >= 400 ? 'error' : 'ok');
      span.end();
    });

    next();
  };
}

/**
 * Graceful shutdown handler (no-op for DB-based monitoring)
 */
export async function flushAndClose(_timeout: number = 2000): Promise<void> {}

/**
 * Status check
 */
export function isErrorMonitoringEnabled(): boolean {
  return true; // Always enabled — it's just a DB insert
}
