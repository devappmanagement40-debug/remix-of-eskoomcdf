import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
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
