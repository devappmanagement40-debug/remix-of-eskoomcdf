-- =============================================
-- ESKOM ENERGY — Schema complet Supabase
-- Collez ce script dans : Supabase Dashboard → SQL Editor → New query
-- =============================================

-- ENUM
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL UNIQUE,
  phone TEXT,
  full_name TEXT,
  country_code TEXT,
  balance NUMERIC(18,8) DEFAULT 0,
  deposit_balance NUMERIC(18,8) DEFAULT 0,
  earnings_balance NUMERIC(18,8) DEFAULT 0,
  referral_balance NUMERIC(18,8) DEFAULT 0,
  gift_points INTEGER DEFAULT 0,
  spins_balance INTEGER DEFAULT 0,
  vip_level INTEGER DEFAULT 0,
  referral_code TEXT,
  referred_by TEXT,
  is_suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- USER ROLES
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'user'
);

-- ADMIN PERMISSIONS
CREATE TABLE IF NOT EXISTS admin_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- VIP CONDITIONS
CREATE TABLE IF NOT EXISTS vip_conditions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  level INTEGER NOT NULL,
  level_name TEXT NOT NULL,
  min_investment NUMERIC(18,8),
  min_purchases INTEGER,
  min_products_bought INTEGER,
  min_active_members INTEGER,
  min_team_investment NUMERIC(18,8),
  condition_logic TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- VIP HISTORY
CREATE TABLE IF NOT EXISTS vip_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  old_level INTEGER DEFAULT 0,
  new_level INTEGER DEFAULT 0,
  reason TEXT,
  changed_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- USER SESSIONS
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PRODUCT SERIES
CREATE TABLE IF NOT EXISTS product_series (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  color TEXT,
  min_vip_level INTEGER,
  min_personal_investment NUMERIC(18,8),
  min_team_investment NUMERIC(18,8),
  min_active_members INTEGER,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(18,8),
  return_percent NUMERIC(10,4),
  daily_revenue NUMERIC(18,8),
  total_revenue NUMERIC(18,8),
  cycles INTEGER,
  gain_type TEXT NOT NULL DEFAULT 'daily',
  image_url TEXT,
  series_id TEXT REFERENCES product_series(id),
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  stock_status TEXT DEFAULT 'available',
  max_purchases INTEGER,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- USER PRODUCTS
CREATE TABLE IF NOT EXISTS user_products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  is_active BOOLEAN DEFAULT true,
  purchased_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_collected_at TIMESTAMP,
  total_collected NUMERIC(18,8) DEFAULT 0
);

-- REFERRAL COMMISSIONS
CREATE TABLE IF NOT EXISTS referral_commissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  beneficiary_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  product_price NUMERIC(18,8) DEFAULT 0,
  commission_amount NUMERIC(18,8) DEFAULT 0,
  commission_rate NUMERIC(10,4) DEFAULT 0,
  level TEXT DEFAULT 'L1',
  created_at TIMESTAMP DEFAULT NOW()
);

-- COUNTRIES
CREATE TABLE IF NOT EXISTS countries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  flag_emoji TEXT,
  phone_digits INTEGER,
  is_active BOOLEAN DEFAULT true,
  api_enabled BOOLEAN DEFAULT false,
  validation_enabled BOOLEAN,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PAYMENT API CONFIGS
CREATE TABLE IF NOT EXISTS payment_api_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  provider TEXT DEFAULT '',
  mode TEXT DEFAULT 'manual',
  api_key TEXT,
  secret_key TEXT,
  endpoint_url TEXT,
  callback_url TEXT,
  country_id TEXT REFERENCES countries(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PAYMENT METHODS
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  payment_type TEXT DEFAULT 'manual',
  country TEXT DEFAULT '',
  country_id TEXT REFERENCES countries(id),
  phone TEXT,
  holder_name TEXT,
  logo_url TEXT,
  instructions TEXT,
  external_url TEXT,
  api_config_id TEXT REFERENCES payment_api_configs(id),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RECHARGES (dépôts)
CREATE TABLE IF NOT EXISTS recharges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  amount NUMERIC(18,8) NOT NULL,
  phone TEXT NOT NULL,
  country_code TEXT DEFAULT '',
  payment_method TEXT,
  transaction_ref TEXT,
  proof_image_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- USER WALLETS
CREATE TABLE IF NOT EXISTS user_wallets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  network TEXT DEFAULT '',
  country_code TEXT DEFAULT '',
  holder_name TEXT,
  label TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- WITHDRAWAL METHODS
CREATE TABLE IF NOT EXISTS withdrawal_methods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  payment_type TEXT DEFAULT 'manual',
  api_provider TEXT,
  country_id TEXT REFERENCES countries(id),
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- WITHDRAWALS (retraits)
CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  amount NUMERIC(18,8) NOT NULL,
  fee_amount NUMERIC(18,8) DEFAULT 0,
  net_amount NUMERIC(18,8) DEFAULT 0,
  processing_fee_amount NUMERIC(18,8) DEFAULT 0,
  processing_fee_paid BOOLEAN DEFAULT false,
  processing_fee_proof_url TEXT,
  phone TEXT NOT NULL,
  network TEXT DEFAULT '',
  country_code TEXT DEFAULT '',
  wallet_id TEXT REFERENCES user_wallets(id),
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- WITHDRAWAL FEE PAYMENTS
CREATE TABLE IF NOT EXISTS withdrawal_fee_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  capital_amount NUMERIC(18,8) DEFAULT 0,
  fee_amount NUMERIC(18,8) DEFAULT 0,
  proof_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PAYMENT LOGS
CREATE TABLE IF NOT EXISTS payment_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  amount NUMERIC(18,8) NOT NULL,
  phone TEXT NOT NULL,
  country_code TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  payment_method_id TEXT REFERENCES payment_methods(id),
  api_config_id TEXT REFERENCES payment_api_configs(id),
  provider_ref TEXT,
  provider_response JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- OMNIPAY CALLBACKS
CREATE TABLE IF NOT EXISTS omnipay_callbacks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reference TEXT NOT NULL,
  status_result TEXT NOT NULL,
  status_code TEXT,
  message TEXT,
  omnipay_id TEXT,
  withdrawal_id TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SITE SETTINGS
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  category TEXT DEFAULT 'general',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- SOCIAL LINKS
CREATE TABLE IF NOT EXISTS social_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- OFFICIAL DOCUMENTS
CREATE TABLE IF NOT EXISTS official_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  doc_type TEXT DEFAULT 'policy',
  description TEXT,
  file_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- POPUP MESSAGES
CREATE TABLE IF NOT EXISTS popup_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  trigger_key TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  button_confirm TEXT,
  button_cancel TEXT,
  tabs JSONB,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- FAQ ITEMS
CREATE TABLE IF NOT EXISTS faq_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- BANNERS
CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  image_url TEXT NOT NULL,
  link_path TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- INFO ITEMS
CREATE TABLE IF NOT EXISTS info_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  sender TEXT DEFAULT 'user',
  is_ai BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- GIFT CODES
CREATE TABLE IF NOT EXISTS gift_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL UNIQUE,
  points_value INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- GIFT CODE USES
CREATE TABLE IF NOT EXISTS gift_code_uses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code_id TEXT NOT NULL REFERENCES gift_codes(id),
  user_id TEXT NOT NULL,
  points_awarded INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- GIFT REWARDS
CREATE TABLE IF NOT EXISTS gift_rewards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  points_required INTEGER DEFAULT 0,
  money_value NUMERIC(18,8) DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- POINT EXCHANGES
CREATE TABLE IF NOT EXISTS point_exchanges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  reward_id TEXT REFERENCES gift_rewards(id),
  reward_name TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  money_credited NUMERIC(18,8) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- WHEEL PRIZES
CREATE TABLE IF NOT EXISTS wheel_prizes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label TEXT NOT NULL,
  prize_type TEXT DEFAULT 'cash',
  value NUMERIC(18,8) DEFAULT 0,
  probability NUMERIC(10,6) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_winnable BOOLEAN DEFAULT true,
  vip_level INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- WHEEL SPINS
CREATE TABLE IF NOT EXISTS wheel_spins (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  prize_id TEXT REFERENCES wheel_prizes(id),
  prize_label TEXT NOT NULL,
  prize_type TEXT DEFAULT 'cash',
  prize_value NUMERIC(18,8) DEFAULT 0,
  vip_level INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ADMIN LOGS
CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
