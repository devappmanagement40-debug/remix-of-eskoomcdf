import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Configure this environment variable with your PostgreSQL connection string."
  );
}

const isSupabase =
  connectionString.includes("supabase.com") ||
  connectionString.includes("pooler.supabase");

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
export * from "./profiles";
export * from "./auth";
export * from "./products";
export * from "./payments";
export * from "./settings";
export * from "./content";
export * from "./admin";
