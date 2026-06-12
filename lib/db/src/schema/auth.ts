import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
