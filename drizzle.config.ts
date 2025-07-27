import { defineConfig } from "drizzle-kit";
import fs from "fs";

const getDbUrl = () => {
  try {
    const envFileContent = fs.readFileSync('.env.production', 'utf8');
    const dbUrlMatch = envFileContent.match(/^DATABASE_URL=(.*)$/m);
    if (dbUrlMatch && dbUrlMatch[1]) {
      return dbUrlMatch[1].replace(/"/g, '');
    }
  } catch (error) {
    // ignore
  }
  return process.env.DRIZZLE_DATABASE_URL || process.env.DATABASE_URL;
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
