import { Client } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dropSql = await fs.readFile(path.resolve(process.cwd(), 'drop_all_tables.sql'), 'utf8');
const setupSql = await fs.readFile(path.resolve(process.cwd(), 'setup-supabase-schema.sql'), 'utf8');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("DATABASE_URL is not set in your .env file.");
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
});

async function resetDatabase() {
  try {
    await client.connect();
    console.log("Connected to the database.");

    console.log("Step 1: Dropping all tables...");
    await client.query(dropSql);
    console.log("All tables dropped successfully.");

    console.log("Step 2: Setting up the new schema...");
    await client.query(setupSql);
    console.log("Schema created successfully.");

    console.log("Database reset and setup complete!");

  } catch (err) {
    console.error("Error during database reset:", err);
    process.exit(1);
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

resetDatabase();
