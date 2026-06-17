import { pgTable, text, numeric, boolean, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const appRoleEnum = pgEnum("app_role", ["admin", "moderator", "user"]);

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique(),
  phone: text("phone"),
  fullName: text("full_name"),
  countryCode: text("country_code"),
  balance: numeric("balance", { precision: 18, scale: 8 }).default("0"),
  depositBalance: numeric("deposit_balance", { precision: 18, scale: 8 }).default("0"),
  earningsBalance: numeric("earnings_balance", { precision: 18, scale: 8 }).default("0"),
  referralBalance: numeric("referral_balance", { precision: 18, scale: 8 }).default("0"),
  giftPoints: integer("gift_points").default(0),
  spinsBalance: integer("spins_balance").default(0),
  vipLevel: integer("vip_level").default(0),
  referralCode: text("referral_code"),
  referredBy: text("referred_by"),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  isSuspended: boolean("is_suspended").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  role: appRoleEnum("role").notNull().default("user"),
});

export const adminPermissions = pgTable("admin_permissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  permission: text("permission").notNull(),
  grantedBy: text("granted_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vipConditions = pgTable("vip_conditions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  level: integer("level").notNull(),
  levelName: text("level_name").notNull(),
  minInvestment: numeric("min_investment", { precision: 18, scale: 8 }),
  minPurchases: integer("min_purchases"),
  minProductsBought: integer("min_products_bought"),
  minActiveMembers: integer("min_active_members"),
  minTeamInvestment: numeric("min_team_investment", { precision: 18, scale: 8 }),
  conditionLogic: text("condition_logic"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vipHistory = pgTable("vip_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  oldLevel: integer("old_level").default(0),
  newLevel: integer("new_level").default(0),
  reason: text("reason"),
  changedBy: text("changed_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
