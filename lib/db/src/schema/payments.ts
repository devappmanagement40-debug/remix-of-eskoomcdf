import { pgTable, text, numeric, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

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
  phone: text("phone"),
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
