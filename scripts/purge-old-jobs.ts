/**
 * Purge old external jobs — standalone cron script
 * Deletes external jobs older than N days to prevent unbounded table growth.
 *
 * Usage: npx tsx scripts/purge-old-jobs.ts [--retainDays=90]
 */

import { db, client } from '../server/db.js';
import { sql } from 'drizzle-orm/sql';

function parseRetainDays(): number {
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--retainDays=(\d+)$/);
    if (match) return Math.max(30, Math.min(365, parseInt(match[1], 10)));
  }
  return 90;
}

async function main() {
  if (!db) { console.error('[Purge] Database not available'); process.exit(1); }

  const retainDays = parseRetainDays();
  console.log(`[Purge] Deleting external jobs older than ${retainDays} days...`);

  const candidates = await db.execute(sql`
    SELECT jp.id FROM job_postings jp
    WHERE (jp.source != 'platform' OR jp.source IS NULL)
      AND jp.external_url IS NOT NULL
      AND jp.created_at < NOW() - (${retainDays} || ' days')::interval
  `);
  const candidateIds = ((candidates as any).rows ?? (candidates as any)).map((r: any) => r.id);

  if (candidateIds.length === 0) {
    console.log(`[Purge] No jobs to purge (retainDays=${retainDays})`);
    return;
  }

  for (const table of ['job_applications', 'job_matches', 'exam_attempts', 'job_exams', 'chat_rooms', 'notifications', 'interviews', 'saved_jobs', 'hidden_jobs']) {
    const col = table === 'notifications' ? 'related_job_id' : 'job_id';
    await db.execute(sql.raw(`DELETE FROM ${table} WHERE ${col} IN (${candidateIds.join(',')})`));
  }
  const result = await db.execute(sql.raw(`DELETE FROM job_postings WHERE id IN (${candidateIds.join(',')}) RETURNING id`));
  const deleted = ((result as any).rows ?? (result as any)).length;
  console.log(`[Purge] Deleted ${deleted} external jobs older than ${retainDays} days`);
}

main()
  .then(() => { client?.end(); process.exit(0); })
  .catch((err) => { console.error('[Purge] Fatal:', err); client?.end(); process.exit(1); });
