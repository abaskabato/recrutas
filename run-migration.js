#!/usr/bin/env node

/**
 * Migration Runner - Applies pending migrations to the Postgres database
 * Usage: node run-migration.js
 */

import { config } from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

config();

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`Running migration: ${file}`);
      try {
        await client.query(sql);
        console.log(`✓ ${file} completed successfully`);
      } catch (error) {
        // Check if error is because column already exists (which is fine)
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`ℹ ${file} - column/index already exists (skipping)`);
        } else {
          console.error(`✗ ${file} failed:`, error.message);
          throw error;
        }
      }
    }

    console.log('\n✓ All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
