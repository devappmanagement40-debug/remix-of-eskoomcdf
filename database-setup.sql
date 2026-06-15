-- ============================================================
-- GE Energy — Script de création de la base de données
-- À exécuter UNE SEULE FOIS sur votre PostgreSQL Plesk
-- Via phpPgAdmin, pgAdmin, ou psql
-- ============================================================

-- Type ENUM pour les rôles
CREATE TYPE "public"."app_role" AS ENUM('admin', 'moderator', 'user');

-- Profils utilisateurs
CREATE TABLE "profiles" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "phone" text,
  "full_name" text,
  "country_code" text,
  "balance" numeric(18, 8) DEFAULT '0',
  "deposit_balance" numeric(18, 8) DEFAULT '0',
  "earnings_balance" numeric(18, 8) DEFAULT '0',
  "referral_balance" numeric(18, 8) DEFAULT '0',
  "gift_points" integer DEFAULT 0,
  "spins_balance" integer DEFAULT 0,
  "vip_level" integer DEFAULT 0,
  "referral_code" text,
  "referred_by" text,
  "password_hash" text,
  "is_suspended" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);

-- Sessions utilisateurs (auth tokens)
CREATE TABLE "user_sessions" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "token" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "user_sessions_token_unique" UNIQUE("token")
);

-- Rôles utilisateurs
CREATE TABLE "user_roles" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "role" "app_role" DEFAULT 'user' NOT NULL
);

-- Permissions admin
CREATE TABLE "admin_permissions" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "permission" text NOT NULL,
  "granted_by" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Conditions VIP
CREATE TABLE "vip_conditions" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "level" integer NOT NULL,
  "level_name" text NOT NULL,
  "min_investment" numeric(18, 8),
  "min_purchases" integer,
  "min_products_bought" integer,
  "min_active_members" integer,
  "min_team_investment" numeric(18, 8),
  "condition_logic" text,
  "image_url" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Historique VIP
CREATE TABLE "vip_history" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "old_level" integer DEFAULT 0,
  "new_level" integer DEFAULT 0,
  "reason" text,
  "changed_by" text,
  "created_at" timestamp DEFAULT now()
);

-- Séries de produits
CREATE TABLE "product_series" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "color" text,
  "min_vip_level" integer,
  "min_personal_investment" numeric(18, 8),
  "min_team_investment" numeric(18, 8),
  "min_active_members" integer,
  "sort_order" integer,
  "created_at" timestamp DEFAULT now()
);

-- Produits d'investissement
CREATE TABLE "products" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "price" numeric(18, 8),
  "return_percent" numeric(10, 4),
  "daily_revenue" numeric(18, 8),
  "total_revenue" numeric(18, 8),
  "cycles" integer,
  "gain_type" text DEFAULT 'daily' NOT NULL,
  "image_url" text,
  "series_id" text,
  "is_active" boolean DEFAULT true,
  "is_featured" boolean DEFAULT false,
  "is_new" boolean DEFAULT false,
  "stock_status" text DEFAULT 'available',
  "max_purchases" integer,
  "sort_order" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Produits achetés par les utilisateurs
CREATE TABLE "user_products" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "product_id" text NOT NULL,
  "is_active" boolean DEFAULT true,
  "purchased_at" timestamp DEFAULT now(),
  "expires_at" timestamp,
  "last_collected_at" timestamp,
  "total_collected" numeric(18, 8) DEFAULT '0'
);

-- Commissions de parrainage
CREATE TABLE "referral_commissions" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "beneficiary_id" text NOT NULL,
  "buyer_id" text NOT NULL,
  "product_price" numeric(18, 8) DEFAULT '0',
  "commission_amount" numeric(18, 8) DEFAULT '0',
  "commission_rate" numeric(10, 4) DEFAULT '0',
  "level" text DEFAULT 'L1',
  "created_at" timestamp DEFAULT now()
);

-- Pays disponibles
CREATE TABLE "countries" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "country_code" text NOT NULL,
  "flag_emoji" text,
  "phone_digits" integer,
  "is_active" boolean DEFAULT true,
  "api_enabled" boolean DEFAULT false,
  "validation_enabled" boolean,
  "sort_order" integer,
  "created_at" timestamp DEFAULT now()
);

-- Configurations API paiement
CREATE TABLE "payment_api_configs" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "provider" text DEFAULT '',
  "mode" text DEFAULT 'manual',
  "api_key" text,
  "secret_key" text,
  "endpoint_url" text,
  "callback_url" text,
  "country_id" text,
  "is_active" boolean DEFAULT true,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Méthodes de paiement
CREATE TABLE "payment_methods" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "payment_type" text DEFAULT 'manual',
  "country" text DEFAULT '',
  "country_id" text,
  "phone" text,
  "holder_name" text,
  "logo_url" text,
  "instructions" text,
  "external_url" text,
  "api_config_id" text,
  "is_active" boolean DEFAULT true,
  "sort_order" integer,
  "created_at" timestamp DEFAULT now()
);

-- Recharges (dépôts)
CREATE TABLE "recharges" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "amount" numeric(18, 8) NOT NULL,
  "phone" text NOT NULL,
  "country_code" text DEFAULT '',
  "payment_method" text,
  "transaction_ref" text,
  "proof_image_url" text,
  "status" text DEFAULT 'pending',
  "admin_note" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Portefeuilles crypto
CREATE TABLE "user_wallets" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "phone" text NOT NULL,
  "network" text DEFAULT '',
  "country_code" text DEFAULT '',
  "holder_name" text,
  "label" text,
  "created_at" timestamp DEFAULT now()
);

-- Méthodes de retrait
CREATE TABLE "withdrawal_methods" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "payment_type" text DEFAULT 'manual',
  "api_provider" text,
  "country_id" text,
  "logo_url" text,
  "is_active" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);

-- Retraits
CREATE TABLE "withdrawals" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "amount" numeric(18, 8) NOT NULL,
  "fee_amount" numeric(18, 8) DEFAULT '0',
  "net_amount" numeric(18, 8) DEFAULT '0',
  "processing_fee_amount" numeric(18, 8) DEFAULT '0',
  "processing_fee_paid" boolean DEFAULT false,
  "processing_fee_proof_url" text,
  "phone" text NOT NULL,
  "network" text DEFAULT '',
  "country_code" text DEFAULT '',
  "wallet_id" text,
  "status" text DEFAULT 'pending',
  "admin_note" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Paiements frais de retrait
CREATE TABLE "withdrawal_fee_payments" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "capital_amount" numeric(18, 8) DEFAULT '0',
  "fee_amount" numeric(18, 8) DEFAULT '0',
  "proof_url" text,
  "status" text DEFAULT 'pending',
  "admin_note" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Logs de paiement
CREATE TABLE "payment_logs" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "amount" numeric(18, 8) NOT NULL,
  "phone" text NOT NULL,
  "country_code" text DEFAULT '',
  "status" text DEFAULT 'pending',
  "payment_method_id" text,
  "api_config_id" text,
  "provider_ref" text,
  "provider_response" jsonb,
  "error_message" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Callbacks Omnipay
CREATE TABLE "omnipay_callbacks" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" text NOT NULL,
  "status_result" text NOT NULL,
  "status_code" text,
  "message" text,
  "omnipay_id" text,
  "withdrawal_id" text,
  "raw_payload" jsonb,
  "created_at" timestamp DEFAULT now()
);

-- Paramètres du site
CREATE TABLE "site_settings" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "value" text,
  "category" text DEFAULT 'general',
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);

-- Liens sociaux
CREATE TABLE "social_links" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "url" text,
  "is_active" boolean DEFAULT true,
  "updated_at" timestamp DEFAULT now()
);

-- Banners/Publicités
CREATE TABLE "banners" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "image_url" text NOT NULL,
  "link_path" text,
  "is_active" boolean DEFAULT true,
  "sort_order" integer,
  "created_at" timestamp DEFAULT now()
);

-- FAQ
CREATE TABLE "faq_items" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "is_active" boolean DEFAULT true,
  "sort_order" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Documents officiels
CREATE TABLE "official_documents" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "doc_type" text DEFAULT 'policy',
  "description" text,
  "file_url" text NOT NULL,
  "is_active" boolean DEFAULT true,
  "sort_order" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Messages popup
CREATE TABLE "popup_messages" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trigger_key" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "button_confirm" text,
  "button_cancel" text,
  "tabs" jsonb,
  "is_active" boolean DEFAULT true,
  "sort_order" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Chat / SAV
CREATE TABLE "chat_messages" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "message" text NOT NULL,
  "sender" text DEFAULT 'user',
  "is_ai" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

-- Codes cadeaux
CREATE TABLE "gift_codes" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "points_value" integer DEFAULT 0,
  "max_uses" integer DEFAULT 1,
  "used_count" integer DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "gift_codes_code_unique" UNIQUE("code")
);

-- Utilisations des codes cadeaux
CREATE TABLE "gift_code_uses" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code_id" text NOT NULL,
  "user_id" text NOT NULL,
  "points_awarded" integer NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Récompenses cadeaux
CREATE TABLE "gift_rewards" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "points_required" integer DEFAULT 0,
  "money_value" numeric(18, 8) DEFAULT '0',
  "image_url" text,
  "is_active" boolean DEFAULT true,
  "sort_order" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Échanges de points
CREATE TABLE "point_exchanges" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "reward_id" text,
  "reward_name" text NOT NULL,
  "points_spent" integer NOT NULL,
  "money_credited" numeric(18, 8) NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Infos/Actualités
CREATE TABLE "info_items" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "image_url" text,
  "is_active" boolean DEFAULT true,
  "sort_order" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Prix de la roue de loterie
CREATE TABLE "wheel_prizes" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "label" text NOT NULL,
  "prize_type" text DEFAULT 'cash',
  "value" numeric(18, 8) DEFAULT '0',
  "probability" numeric(10, 6) DEFAULT '0',
  "is_active" boolean DEFAULT true,
  "is_winnable" boolean DEFAULT true,
  "vip_level" integer,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Spins de la roue
CREATE TABLE "wheel_spins" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "prize_id" text,
  "prize_label" text NOT NULL,
  "prize_type" text DEFAULT 'cash',
  "prize_value" numeric(18, 8) DEFAULT '0',
  "vip_level" integer,
  "status" text DEFAULT 'pending',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Logs admin
CREATE TABLE "admin_logs" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_id" text NOT NULL,
  "action" text NOT NULL,
  "target_type" text,
  "target_id" text,
  "details" text,
  "created_at" timestamp DEFAULT now()
);

-- ============================================================
-- Clés étrangères
-- ============================================================
ALTER TABLE "products" ADD CONSTRAINT "products_series_id_fk"
  FOREIGN KEY ("series_id") REFERENCES "product_series"("id");

ALTER TABLE "user_products" ADD CONSTRAINT "user_products_product_id_fk"
  FOREIGN KEY ("product_id") REFERENCES "products"("id");

ALTER TABLE "payment_api_configs" ADD CONSTRAINT "payment_api_configs_country_id_fk"
  FOREIGN KEY ("country_id") REFERENCES "countries"("id");

ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_method_id_fk"
  FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id");

ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_api_config_id_fk"
  FOREIGN KEY ("api_config_id") REFERENCES "payment_api_configs"("id");

ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_country_id_fk"
  FOREIGN KEY ("country_id") REFERENCES "countries"("id");

ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_api_config_id_fk"
  FOREIGN KEY ("api_config_id") REFERENCES "payment_api_configs"("id");

ALTER TABLE "withdrawal_methods" ADD CONSTRAINT "withdrawal_methods_country_id_fk"
  FOREIGN KEY ("country_id") REFERENCES "countries"("id");

ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_wallet_id_fk"
  FOREIGN KEY ("wallet_id") REFERENCES "user_wallets"("id");

ALTER TABLE "gift_code_uses" ADD CONSTRAINT "gift_code_uses_code_id_fk"
  FOREIGN KEY ("code_id") REFERENCES "gift_codes"("id");

ALTER TABLE "point_exchanges" ADD CONSTRAINT "point_exchanges_reward_id_fk"
  FOREIGN KEY ("reward_id") REFERENCES "gift_rewards"("id");

ALTER TABLE "wheel_spins" ADD CONSTRAINT "wheel_spins_prize_id_fk"
  FOREIGN KEY ("prize_id") REFERENCES "wheel_prizes"("id");

-- ============================================================
-- Vérification : doit afficher 35 tables
-- SELECT count(*) FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- ============================================================
