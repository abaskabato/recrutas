/**
 * Migration Runner - Applies pending migrations to the database
 * Usage: npx ts-node run-migration.ts
 */

import 'dotenv/config';
import { db } from './server/lib/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  try {
    console.log('Starting migrations...\n');

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const migrationSql = fs.readFileSync(filePath, 'utf-8');

      console.log(`Running: ${file}`);
      try {
        // Execute raw SQL
        await db.execute(sql.raw(migrationSql));
        console.log(`✓ ${file}\n`);
      } catch (error: any) {
        // Check if error is because column/index already exists (which is fine)
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          console.log(`ℹ ${file} - column/index already exists (skipping)\n`);
        } else {
          console.error(`✗ ${file} failed:`);
          console.error(error.message);
          throw error;
        }
      }
    }

    console.log('✓ All migrations completed!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
