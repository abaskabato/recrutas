import { db } from "./db";
import { sql } from "drizzle-orm";
async function resetDatabase() {
    try {
        console.log("Dropping existing tables...");
        // Drop tables in correct order to avoid foreign key constraints
        await db.execute(sql `DROP TABLE IF EXISTS verifications CASCADE`);
        await db.execute(sql `DROP TABLE IF EXISTS accounts CASCADE`);
        await db.execute(sql `DROP TABLE IF EXISTS sessions CASCADE`);
        await db.execute(sql `DROP TABLE IF EXISTS users CASCADE`);
        console.log("Creating users table...");
        await db.execute(sql `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        image TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        first_name TEXT,
        last_name TEXT,
        phone_number TEXT,
        profile_image_url TEXT,
        role TEXT DEFAULT 'candidate',
        profile_complete BOOLEAN DEFAULT false
      )
    `);
        console.log("Creating sessions table...");
        await db.execute(sql `
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        "expiresAt" TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" TEXT NOT NULL REFERENCES users(id)
      )
    `);
        console.log("Creating accounts table...");
        await db.execute(sql `
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES users(id),
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP,
        "refreshTokenExpiresAt" TIMESTAMP,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
        console.log("Creating verifications table...");
        await db.execute(sql `
      CREATE TABLE verifications (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
        console.log("Database reset complete!");
        process.exit(0);
    }
    catch (error) {
        console.error("Error resetting database:", error);
        process.exit(1);
    }
}
resetDatabase();
