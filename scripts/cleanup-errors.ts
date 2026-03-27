/**
 * Cleanup old error events — standalone cron script
 * Deletes error_events older than 30 days.
 *
 * Usage: npx tsx scripts/cleanup-errors.ts
 */

import { db, client } from '../server/db.js';
import { sql } from 'drizzle-orm/sql';

async function main() {
  if (!db) { console.error('[ErrorCleanup] Database not available'); process.exit(1); }

  console.log('[ErrorCleanup] Deleting error events older than 30 days...');

  const result = await db.execute(sql`
    DELETE FROM error_events WHERE created_at < NOW() - INTERVAL '30 days' RETURNING id
  `);
  const deleted = ((result as any).rows ?? (result as any)).length;
  console.log(`[ErrorCleanup] Deleted ${deleted} error events`);
}

main()
  .then(() => { client?.end(); process.exit(0); })
  .catch((err) => { console.error('[ErrorCleanup] Fatal:', err); client?.end(); process.exit(1); });
