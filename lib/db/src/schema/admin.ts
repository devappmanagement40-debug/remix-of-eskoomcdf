import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const adminLogs = pgTable("admin_logs", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  adminId: text("admin_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});
