import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL environment variable is required.");
}

const isSupabase = connectionString.includes("supabase.com") || connectionString.includes("pooler.supabase");

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

export * from "../shared/schema";
