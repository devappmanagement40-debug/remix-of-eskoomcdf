import { pgTable, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  value: text("value"),
  category: text("category").default("general"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const socialLinks = pgTable("social_links", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull(),
  label: text("label").notNull(),
  url: text("url"),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const officialDocuments = pgTable("official_documents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  docType: text("doc_type").default("policy"),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const popupMessages = pgTable("popup_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  triggerKey: text("trigger_key").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  buttonConfirm: text("button_confirm"),
  buttonCancel: text("button_cancel"),
  tabs: jsonb("tabs"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const faqItems = pgTable("faq_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
