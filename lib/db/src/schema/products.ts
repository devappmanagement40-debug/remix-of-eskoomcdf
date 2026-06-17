import { pgTable, text, numeric, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const productSeries = pgTable("product_series", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  color: text("color"),
  minVipLevel: integer("min_vip_level"),
  minPersonalInvestment: numeric("min_personal_investment", { precision: 18, scale: 8 }),
  minTeamInvestment: numeric("min_team_investment", { precision: 18, scale: 8 }),
  minActiveMembers: integer("min_active_members"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 18, scale: 8 }),
  returnPercent: numeric("return_percent", { precision: 10, scale: 4 }),
  dailyRevenue: numeric("daily_revenue", { precision: 18, scale: 8 }),
  totalRevenue: numeric("total_revenue", { precision: 18, scale: 8 }),
  cycles: integer("cycles"),
  gainType: text("gain_type").notNull().default("daily"),
  imageUrl: text("image_url"),
  seriesId: text("series_id").references(() => productSeries.id),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  isNew: boolean("is_new").default(false),
  stockStatus: text("stock_status").default("available"),
  maxPurchases: integer("max_purchases"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userProducts = pgTable("user_products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  productId: text("product_id").notNull().references(() => products.id),
  isActive: boolean("is_active").default(true),
  purchasedAt: timestamp("purchased_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  lastCollectedAt: timestamp("last_collected_at"),
  totalCollected: numeric("total_collected", { precision: 18, scale: 8 }).default("0"),
});

export const referralCommissions = pgTable("referral_commissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  beneficiaryId: text("beneficiary_id").notNull(),
  buyerId: text("buyer_id").notNull(),
  productPrice: numeric("product_price", { precision: 18, scale: 8 }).default("0"),
  commissionAmount: numeric("commission_amount", { precision: 18, scale: 8 }).default("0"),
  commissionRate: numeric("commission_rate", { precision: 10, scale: 4 }).default("0"),
  level: text("level").default("L1"),
  createdAt: timestamp("created_at").defaultNow(),
});
