import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL)!,
  },
});
