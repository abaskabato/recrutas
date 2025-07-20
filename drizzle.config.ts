import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DRIZZLE_DATABASE_URL || process.env.DATABASE_URL;

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
