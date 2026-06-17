import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

const rawConnectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL environment variable is required.");
}

// Strip sslmode from connection string — we handle SSL via pool options
const connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?$/, "");

const isSupabase = rawConnectionString.includes("supabase.com") || rawConnectionString.includes("pooler.supabase");

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

export * from "../shared/schema";
