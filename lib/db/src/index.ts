import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error("DATABASE_URL environment variable is required.");
}

// Strip sslmode from connection string — Replit's local Postgres does not use SSL
const connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?$/, "");

export const pool = new Pool({
  connectionString,
  ssl: false,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
