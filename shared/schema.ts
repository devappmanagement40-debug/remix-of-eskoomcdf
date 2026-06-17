import { pgTable, text, numeric, boolean, timestamp, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";

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
  email: text("email"),
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

export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const countries = pgTable("countries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  countryCode: text("country_code").notNull(),
  flagEmoji: text("flag_emoji"),
  phoneDigits: integer("phone_digits"),
  isActive: boolean("is_active").default(true),
  apiEnabled: boolean("api_enabled").default(false),
  validationEnabled: boolean("validation_enabled"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentApiConfigs = pgTable("payment_api_configs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  provider: text("provider").default(""),
  mode: text("mode").default("manual"),
  apiKey: text("api_key"),
  secretKey: text("secret_key"),
  endpointUrl: text("endpoint_url"),
  callbackUrl: text("callback_url"),
  countryId: text("country_id").references(() => countries.id),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  paymentType: text("payment_type").default("manual"),
  country: text("country").default(""),
  countryId: text("country_id").references(() => countries.id),
  phone: text("phone"),
  holderName: text("holder_name"),
  logoUrl: text("logo_url"),
  instructions: text("instructions"),
  externalUrl: text("external_url"),
  apiConfigId: text("api_config_id").references(() => paymentApiConfigs.id),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recharges = pgTable("recharges", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  phone: text("phone").notNull(),
  countryCode: text("country_code").default(""),
  paymentMethod: text("payment_method"),
  transactionRef: text("transaction_ref"),
  proofImageUrl: text("proof_image_url"),
  status: text("status").default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userWallets = pgTable("user_wallets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  phone: text("phone").notNull(),
  network: text("network").default(""),
  countryCode: text("country_code").default(""),
  holderName: text("holder_name"),
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const withdrawalMethods = pgTable("withdrawal_methods", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  paymentType: text("payment_type").default("manual"),
  apiProvider: text("api_provider"),
  countryId: text("country_id").references(() => countries.id),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const withdrawals = pgTable("withdrawals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  feeAmount: numeric("fee_amount", { precision: 18, scale: 8 }).default("0"),
  netAmount: numeric("net_amount", { precision: 18, scale: 8 }).default("0"),
  processingFeeAmount: numeric("processing_fee_amount", { precision: 18, scale: 8 }).default("0"),
  processingFeePaid: boolean("processing_fee_paid").default(false),
  processingFeeProofUrl: text("processing_fee_proof_url"),
  phone: text("phone").notNull(),
  network: text("network").default(""),
  countryCode: text("country_code").default(""),
  walletId: text("wallet_id").references(() => userWallets.id),
  status: text("status").default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const withdrawalFeePayments = pgTable("withdrawal_fee_payments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  capitalAmount: numeric("capital_amount", { precision: 18, scale: 8 }).default("0"),
  feeAmount: numeric("fee_amount", { precision: 18, scale: 8 }).default("0"),
  proofUrl: text("proof_url"),
  status: text("status").default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentLogs = pgTable("payment_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  phone: text("phone").notNull(),
  countryCode: text("country_code").default(""),
  status: text("status").default("pending"),
  paymentMethodId: text("payment_method_id").references(() => paymentMethods.id),
  apiConfigId: text("api_config_id").references(() => paymentApiConfigs.id),
  providerRef: text("provider_ref"),
  providerResponse: jsonb("provider_response"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const omnipayCallbacks = pgTable("omnipay_callbacks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  reference: text("reference").notNull(),
  statusResult: text("status_result").notNull(),
  statusCode: text("status_code"),
  message: text("message"),
  omnipayId: text("omnipay_id"),
  withdrawalId: text("withdrawal_id"),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const banners = pgTable("banners", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  imageUrl: text("image_url").notNull(),
  linkPath: text("link_path"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const infoItems = pgTable("info_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  message: text("message").notNull(),
  sender: text("sender").default("user"),
  isAi: boolean("is_ai").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const giftCodes = pgTable("gift_codes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
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
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  codeId: text("code_id").notNull().references(() => giftCodes.id),
  userId: text("user_id").notNull(),
  pointsAwarded: integer("points_awarded").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const giftRewards = pgTable("gift_rewards", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
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
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  rewardId: text("reward_id").references(() => giftRewards.id),
  rewardName: text("reward_name").notNull(),
  pointsSpent: integer("points_spent").notNull(),
  moneyCredited: numeric("money_credited", { precision: 18, scale: 8 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wheelPrizes = pgTable("wheel_prizes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
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
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
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

export const adminLogs = pgTable("admin_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  adminId: text("admin_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});
