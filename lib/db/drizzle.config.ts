import { defineConfig } from "drizzle-kit";

// Support both Replit dev (DATABASE_URL) and Plesk prod (SUPABASE_DATABASE_URL)
const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
const isSupabase = !!process.env.SUPABASE_DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL must be set");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: isSupabase ? "allow" : false,
  },
});
