import { pgTable, text, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";

export const banners = pgTable("banners", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  imageUrl: text("image_url").notNull(),
  linkPath: text("link_path"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const infoItems = pgTable("info_items", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  userId: text("user_id").notNull(),
  message: text("message").notNull(),
  sender: text("sender").default("user"),
  isAi: boolean("is_ai").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const giftCodes = pgTable("gift_codes", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  code: text("code").notNull().unique(),
  pointsValue: integer("points_value").default(0),
  maxUses: integer("max_uses").default(1),
  usedCount: integer("used_count").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const giftCodeUses = pgTable("gift_code_uses", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  codeId: text("code_id").notNull().references(() => giftCodes.id),
  userId: text("user_id").notNull(),
  pointsAwarded: integer("points_awarded").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const giftRewards = pgTable("gift_rewards", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  name: text("name").notNull(),
  pointsRequired: integer("points_required").default(0),
  moneyValue: numeric("money_value", { precision: 18, scale: 8 }).default("0"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pointExchanges = pgTable("point_exchanges", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  userId: text("user_id").notNull(),
  rewardId: text("reward_id").references(() => giftRewards.id),
  rewardName: text("reward_name").notNull(),
  pointsSpent: integer("points_spent").notNull(),
  moneyCredited: numeric("money_credited", { precision: 18, scale: 8 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wheelPrizes = pgTable("wheel_prizes", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  label: text("label").notNull(),
  prizeType: text("prize_type").default("cash"),
  value: numeric("value", { precision: 18, scale: 8 }).default("0"),
  probability: numeric("probability", { precision: 10, scale: 6 }).default("0"),
  isActive: boolean("is_active").default(true),
  isWinnable: boolean("is_winnable").default(true),
  vipLevel: integer("vip_level"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wheelSpins = pgTable("wheel_spins", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  userId: text("user_id").notNull(),
  prizeId: text("prize_id").references(() => wheelPrizes.id),
  prizeLabel: text("prize_label").notNull(),
  prizeType: text("prize_type").default("cash"),
  prizeValue: numeric("prize_value", { precision: 18, scale: 8 }).default("0"),
  vipLevel: integer("vip_level"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
