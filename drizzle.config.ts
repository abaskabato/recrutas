import { defineConfig } from "drizzle-kit";
import fs from "fs";

const getDbUrl = () => {
  try {
    const envFileContent = fs.readFileSync('.env.production', 'utf8');

    // PRIORITY 1: Try DIRECT_URL first (port 5432 - required for schema operations)
    const directUrlMatch = envFileContent.match(/^DIRECT_URL=(.*)$/m);
    if (directUrlMatch && directUrlMatch[1]) {
      console.log('[drizzle-config] Using DIRECT_URL for schema operations');
      return directUrlMatch[1].replace(/"/g, '');
    }

    // PRIORITY 2: Fall back to DATABASE_URL (port 6543 - pooler, not ideal for migrations)
    const dbUrlMatch = envFileContent.match(/^DATABASE_URL=(.*)$/m);
    if (dbUrlMatch && dbUrlMatch[1]) {
      console.log('[drizzle-config] Warning: Using DATABASE_URL (pooler) - may have issues with schema introspection');
      return dbUrlMatch[1].replace(/"/g, '');
    }
  } catch (error) {
    // ignore
  }

  // PRIORITY 3: Check environment variables
  const url = process.env.DIRECT_URL || process.env.DRIZZLE_DATABASE_URL || process.env.DATABASE_URL;
  console.log('[drizzle-config] Using environment variable for database URL');
  return url;
}

const dbUrl = getDbUrl();

if (!dbUrl) {
  throw new Error("DATABASE_URL or DRIZZLE_DATABASE_URL is not set. Please check your .env file.");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
  strict: true,
  verbose: true,
  introspect: {
    casing: "preserve",
  },
});
