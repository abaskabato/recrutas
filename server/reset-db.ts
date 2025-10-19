import { db } from "./db";
import { sql } from "drizzle-orm";

import { db } from "./db";
import { sql } from "drizzle-orm";

async function resetDatabase() {
  try {
    console.log("Dropping existing tables...");
    
    await db.execute(sql`DROP TABLE IF EXISTS interviews CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS connection_status CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS notification_preferences CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS notifications CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS activity_logs CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS match_feedback CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS application_insights CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS application_events CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS application_updates CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS job_applications CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS chat_messages CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS chat_rooms CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS job_matches CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS exam_attempts CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS job_exams CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS job_postings CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS candidate_users CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS companies CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS sessions CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS accounts CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS verifications CASCADE`);

    console.log("Database reset complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error resetting database:", error);
    process.exit(1);
  }
}

resetDatabase();

resetDatabase();