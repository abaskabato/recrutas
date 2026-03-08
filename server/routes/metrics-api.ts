/**
 * Metrics API routes for the admin metrics dashboard.
 * All routes require x-admin-secret header.
 */

import { Express } from 'express';
import { db } from '../db.js';
import { requestMetrics, jobPostings, users, jobMatches, jobApplications } from '../../shared/schema.js';
import { sql } from 'drizzle-orm/sql';
import { getLimiterStats } from '../lib/groq-limiter.js';
import { redisEnabled } from '../lib/redis.js';
import { getModelInfo } from '../ml-matching.js';

function adminAuth(req: any, res: any): boolean {
  const secret = req.headers['x-admin-secret'];
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }
  return true;
}

export function registerMetricsRoutes(app: Express) {
  // ── Latency percentiles per endpoint (last N hours) ──────────────────────

  app.get('/api/admin/metrics/latency', async (req: any, res) => {
    if (!adminAuth(req, res)) return;
    if (!db) return res.status(503).json({ message: 'Database not available' });

    const hours = parseInt((req.query.hours as string) || '24', 10);
    const since = new Date(Date.now() - hours * 3600000);

    try {
      const rows = await db.execute(sql`
        SELECT
          endpoint,
          method,
          COUNT(*)::int                                          AS count,
          ROUND(percentile_cont(0.50) WITHIN GROUP (ORDER BY duration_ms))::int AS p50,
          ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95,
          ROUND(percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms))::int AS p99,
          ROUND(AVG(duration_ms))::int                           AS avg_ms,
          SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END)::int AS errors,
          SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::int AS client_errors
        FROM request_metrics
        WHERE created_at >= ${since.toISOString()}
        GROUP BY endpoint, method
        ORDER BY count DESC
        LIMIT 50
      `);
      res.json({ hours, data: (rows as any).rows ?? rows });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch latency metrics', error: error.message });
    }
  });

  // ── Error rate time series (last 24h by hour) ─────────────────────────────

  app.get('/api/admin/metrics/errors', async (req: any, res) => {
    if (!adminAuth(req, res)) return;
    if (!db) return res.status(503).json({ message: 'Database not available' });

    const hours = parseInt((req.query.hours as string) || '24', 10);
    const since = new Date(Date.now() - hours * 3600000);

    try {
      const rows = await db.execute(sql`
        SELECT
          date_trunc('hour', created_at) AS hour,
          COUNT(*)::int                  AS total,
          SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END)::int AS errors,
          SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::int AS client_errors,
          ROUND(
            100.0 * SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) /
            NULLIF(COUNT(*), 0), 2
          ) AS error_rate_pct
        FROM request_metrics
        WHERE created_at >= ${since.toISOString()}
        GROUP BY 1
        ORDER BY 1 ASC
      `);
      res.json({ hours, data: (rows as any).rows ?? rows });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch error metrics', error: error.message });
    }
  });

  // ── Match quality distribution ────────────────────────────────────────────

  app.get('/api/admin/metrics/match-quality', async (req: any, res) => {
    if (!adminAuth(req, res)) return;
    if (!db) return res.status(503).json({ message: 'Database not available' });

    try {
      const rows = await db.execute(sql`
        SELECT
          CASE
            WHEN match_score >= 80 THEN 'excellent (80-100)'
            WHEN match_score >= 60 THEN 'good (60-79)'
            WHEN match_score >= 40 THEN 'fair (40-59)'
            ELSE 'poor (<40)'
          END AS bucket,
          COUNT(*)::int AS count,
          ROUND(AVG(match_score), 1) AS avg_score
        FROM job_matches
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 2 DESC
      `);

      const total = await db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          ROUND(AVG(match_score), 1) AS avg_score,
          ROUND(percentile_cont(0.50) WITHIN GROUP (ORDER BY match_score), 1) AS median_score
        FROM job_matches
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      res.json({
        distribution: (rows as any).rows ?? rows,
        summary: ((total as any).rows ?? total)[0],
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch match quality metrics', error: error.message });
    }
  });

  // ── Platform growth time series ───────────────────────────────────────────

  app.get('/api/admin/metrics/growth', async (req: any, res) => {
    if (!adminAuth(req, res)) return;
    if (!db) return res.status(503).json({ message: 'Database not available' });

    const days = parseInt((req.query.days as string) || '30', 10);

    try {
      const [newUsers, newJobs, newApplications] = await Promise.all([
        db.execute(sql`
          SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS count
          FROM users
          WHERE "createdAt" >= NOW() - (${days} || ' days')::interval
          GROUP BY 1 ORDER BY 1 ASC
        `),
        db.execute(sql`
          SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS count
          FROM job_postings
          WHERE created_at >= NOW() - (${days} || ' days')::interval
          GROUP BY 1 ORDER BY 1 ASC
        `),
        db.execute(sql`
          SELECT date_trunc('day', applied_at) AS day, COUNT(*)::int AS count
          FROM job_applications
          WHERE applied_at >= NOW() - (${days} || ' days')::interval
          GROUP BY 1 ORDER BY 1 ASC
        `),
      ]);

      res.json({
        days,
        users: (newUsers as any).rows ?? newUsers,
        jobs: (newJobs as any).rows ?? newJobs,
        applications: (newApplications as any).rows ?? newApplications,
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch growth metrics', error: error.message });
    }
  });

  // ── HF API cache hit rate (embedding reuse) ───────────────────────────────

  app.get('/api/admin/metrics/embedding-cache', async (req: any, res) => {
    if (!adminAuth(req, res)) return;
    if (!db) return res.status(503).json({ message: 'Database not available' });

    try {
      const rows = await db.execute(sql`
        SELECT
          COUNT(*)::int                                                     AS total_active_jobs,
          SUM(CASE WHEN vector_embedding IS NOT NULL THEN 1 ELSE 0 END)::int AS with_embedding,
          SUM(CASE WHEN embedding_updated_at > NOW() - INTERVAL '7 days'
                    AND vector_embedding IS NOT NULL THEN 1 ELSE 0 END)::int AS fresh_embeddings,
          ROUND(
            100.0 * SUM(CASE WHEN vector_embedding IS NOT NULL THEN 1 ELSE 0 END) /
            NULLIF(COUNT(*), 0), 1
          ) AS coverage_pct
        FROM job_postings
        WHERE status = 'active'
      `);

      res.json(((rows as any).rows ?? rows)[0]);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch embedding cache metrics', error: error.message });
    }
  });

  // ── Job feed health ───────────────────────────────────────────────────────

  app.get('/api/admin/metrics/job-feed', async (req: any, res) => {
    if (!adminAuth(req, res)) return;
    if (!db) return res.status(503).json({ message: 'Database not available' });

    try {
      const rows = await db.execute(sql`
        SELECT
          source,
          status,
          COUNT(*)::int AS count,
          ROUND(AVG(ghost_job_score), 1) AS avg_ghost_score,
          MIN(created_at) AS oldest_job,
          MAX(created_at) AS newest_job
        FROM job_postings
        GROUP BY source, status
        ORDER BY count DESC
        LIMIT 30
      `);

      const tableSize = await db.execute(sql`
        SELECT pg_size_pretty(pg_total_relation_size('job_postings')) AS table_size
      `);

      res.json({
        breakdown: (rows as any).rows ?? rows,
        tableSize: (((tableSize as any).rows ?? tableSize)[0] as any)?.table_size,
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch job feed metrics', error: error.message });
    }
  });

  // ── System health snapshot ────────────────────────────────────────────────

  app.get('/api/admin/metrics/system', async (req: any, res) => {
    if (!adminAuth(req, res)) return;

    res.json({
      groqLimiter: getLimiterStats(),
      redis: { enabled: redisEnabled },
      mlModel: getModelInfo(),
      inngest: { enabled: !!process.env.INNGEST_EVENT_KEY },
      sentry: { enabled: !!process.env.SENTRY_DSN },
      environment: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      uptime: process.uptime(),
      memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    });
  });
}
