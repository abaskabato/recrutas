/**
 * One-shot migration: add columns that exist in Drizzle schema but not in the DB.
 * Safe to run multiple times (IF NOT EXISTS).
 *
 * Usage: npx tsx scripts/add-missing-columns.ts
 */

import { db } from '../server/db.js';
import { sql } from 'drizzle-orm/sql';

const migrations = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source VARCHAR(50)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code_used VARCHAR(40)`,
];

async function main() {
  if (!db) { console.error('[migrate] Database not available'); process.exit(1); }

  for (const ddl of migrations) {
    console.log(`[migrate] ${ddl}`);
    await db.execute(sql.raw(ddl));
  }

  console.log('[migrate] Done — all columns added.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error('[migrate] Fatal:', err); process.exit(1); });
