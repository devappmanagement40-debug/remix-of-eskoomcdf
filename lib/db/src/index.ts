import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Priority:
//   1. SUPABASE_DATABASE_URL — external hosting (Plesk / VPS), requires SSL
//   2. DATABASE_URL           — Replit dev environment (local Postgres, no SSL)
const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No database URL found. Set DATABASE_URL (Replit dev) or SUPABASE_DATABASE_URL (Plesk/production)."
  );
}

const isSupabase = !!process.env.SUPABASE_DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
