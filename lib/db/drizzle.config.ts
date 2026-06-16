import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.SUPABASE_DATABASE_URL;

if (!dbUrl) {
  throw new Error("SUPABASE_DATABASE_URL doit être défini");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: "allow",
  },
});
