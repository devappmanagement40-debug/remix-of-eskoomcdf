import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// SUPABASE_DATABASE_URL takes priority over Replit's managed DATABASE_URL
const connectionString =
  process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set.",
  );
}

// DB_SSL=false  → no SSL (local dev, Replit internal Postgres)
// DB_SSL=true or unset → SSL with self-signed cert allowed (Plesk / external Postgres)
const sslConfig =
  process.env.DB_SSL === "false"
    ? false
    : { rejectUnauthorized: false };

export const pool = new Pool({ connectionString, ssl: sslConfig });
export const db = drizzle(pool, { schema });

export * from "./schema";
