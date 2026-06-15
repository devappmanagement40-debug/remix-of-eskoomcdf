import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Always use the Replit PostgreSQL DATABASE_URL — ignore any legacy Supabase vars
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set.");
}

export const pool = new Pool({
  connectionString,
  ssl: false,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
