/**
 * Error Monitoring Service
 * Provides Sentry integration for error tracking and performance monitoring
 *
 * This module wraps Sentry functionality with graceful degradation
 * when Sentry is not configured (development mode or missing API key)
 */

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

// Check if Sentry should be initialized
const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SENTRY_ENABLED = !!SENTRY_DSN;

// Sentry lazy initialization - use 'any' to avoid TypeScript issues with dynamic imports
let sentryInstance: any = null;
let sentryInitialized = false;

async function getSentry(): Promise<any> {
  if (!SENTRY_ENABLED) return null;

  if (!sentryInitialized) {
    try {
      const Sentry = await import('@sentry/node');
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.npm_package_version || '1.0.0',
        tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // Sample 10% in production
        profilesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
        integrations: [],
        beforeSend(event: any) {
          // Scrub sensitive data
          if (event.request?.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }
          return event;
        },
      });
      sentryInstance = Sentry;
      sentryInitialized = true;
      console.log('[ErrorMonitoring] Sentry initialized successfully');
    } catch (error) {
      console.warn('[ErrorMonitoring] Failed to initialize Sentry:', (error as Error).message);
      sentryInitialized = true; // Mark as initialized to prevent retry loops
      return null;
    }
  }

  return sentryInstance;
}

/**
 * Capture an exception with optional context
 */
export async function captureException(error: Error, context?: ErrorContext): Promise<string | null> {
  const sentry = await getSentry();

  // Always log errors regardless of Sentry status
  console.error('[Error]', {
    message: error.message,
    stack: error.stack,
    ...context
  });

  if (!sentry) {
    return null;
  }

  try {
    sentry.withScope((scope) => {
      if (context?.userId) {
        scope.setUser({ id: context.userId });
      }
      if (context?.action) {
        scope.setTag('action', context.action);
      }
      if (context?.component) {
        scope.setTag('component', context.component);
      }
      if (context?.metadata) {
        scope.setContext('metadata', context.metadata);
      }
    });

    const eventId = sentry.captureException(error);
    return eventId;
  } catch (sentryError) {
    console.warn('[ErrorMonitoring] Failed to send to Sentry:', (sentryError as Error).message);
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
  const sentry = await getSentry();

  // Log based on level
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

  if (!sentry) {
    return null;
  }

  try {
    const eventId = sentry.captureMessage(message, level);
    return eventId;
  } catch (sentryError) {
    console.warn('[ErrorMonitoring] Failed to send message to Sentry');
    return null;
  }
}

/**
 * Start a performance monitoring span
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
 * Set user context for all subsequent events
 */
export async function setUser(user: { id: string; email?: string; role?: string }): Promise<void> {
  const sentry = await getSentry();
  if (sentry) {
    sentry.setUser(user);
  }
}

/**
 * Clear user context (on logout)
 */
export async function clearUser(): Promise<void> {
  const sentry = await getSentry();
  if (sentry) {
    sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export async function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  const sentry = await getSentry();
  if (sentry) {
    sentry.addBreadcrumb({
      category,
      message,
      data,
      level: 'info',
      timestamp: Date.now() / 1000,
    });
  }
}

/**
 * Express error handling middleware
 */
export function errorHandlerMiddleware() {
  return async (err: Error, req: any, res: any, next: any) => {
    // Capture the error
    await captureException(err, {
      userId: req.user?.id,
      action: `${req.method} ${req.path}`,
      component: 'express',
      metadata: {
        query: req.query,
        body: req.body ? '[REDACTED]' : undefined,
        userAgent: req.headers['user-agent'],
      }
    });

    // Send error response
    const status = (err as any).status || (err as any).statusCode || 500;
    const message = IS_PRODUCTION ? 'An unexpected error occurred' : err.message;

    res.status(status).json({
      error: message,
      ...(IS_PRODUCTION ? {} : { stack: err.stack })
    });
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
 * Graceful shutdown handler
 */
export async function flushAndClose(timeout: number = 2000): Promise<void> {
  const sentry = await getSentry();
  if (sentry) {
    await sentry.close(timeout);
    console.log('[ErrorMonitoring] Sentry closed');
  }
}

// Export status check
export function isErrorMonitoringEnabled(): boolean {
  return SENTRY_ENABLED;
}
