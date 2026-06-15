import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Priority: SUPABASE_POOLER_URL (port 6543, transaction mode) 
//         → SUPABASE_DATABASE_URL (direct)
//         → DATABASE_URL (Replit local)
const connectionString =
  process.env.SUPABASE_POOLER_URL ??
  process.env.SUPABASE_DATABASE_URL ??
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_POOLER_URL, SUPABASE_DATABASE_URL or DATABASE_URL must be set.",
  );
}

// DB_SSL=false  → no SSL (local dev, Replit internal Postgres)
// DB_SSL=true or unset → SSL with self-signed cert allowed (Plesk / pooler)
const sslConfig =
  process.env.DB_SSL === "false"
    ? false
    : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  // Supabase pooler (transaction mode) requires max 1 connection per dyno
  // and does not support prepared statements
  max: process.env.SUPABASE_POOLER_URL ? 10 : undefined,
});

// prepare: false is required for Supabase transaction-mode pooler (PgBouncer)
export const db = drizzle(pool, {
  schema,
  ...(process.env.SUPABASE_POOLER_URL ? { logger: false } : {}),
});

export * from "./schema";
