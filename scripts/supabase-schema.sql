-- =============================================
-- ESKOM ENERGY — Schéma complet Supabase
-- Instructions : Supabase Dashboard → SQL Editor → New query → Coller → Run
-- Ce script est idempotent (peut être rejoué sans risque)
-- =============================================

-- ==================== ENUMS ====================
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ==================== TABLES ====================

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

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS admin_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vip_conditions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  level INTEGER NOT NULL,
  level_name TEXT NOT NULL,
  min_investment NUMERIC(18,8) DEFAULT 0,
  min_purchases INTEGER DEFAULT 0,
  min_products_bought INTEGER DEFAULT 0,
  min_active_members INTEGER DEFAULT 0,
  min_team_investment NUMERIC(18,8) DEFAULT 0,
  condition_logic TEXT DEFAULT 'OR',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vip_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  old_level INTEGER DEFAULT 0,
  new_level INTEGER DEFAULT 0,
  reason TEXT,
  changed_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS countries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  flag_emoji TEXT,
  phone_digits INTEGER DEFAULT 8,
  is_active BOOLEAN DEFAULT true,
  api_enabled BOOLEAN DEFAULT false,
  validation_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  category TEXT DEFAULT 'general',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS faq_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  image_url TEXT NOT NULL,
  link_path TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  sender TEXT DEFAULT 'user',
  is_ai BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS gift_code_uses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code_id TEXT NOT NULL REFERENCES gift_codes(id),
  user_id TEXT NOT NULL,
  points_awarded INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS point_exchanges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  reward_id TEXT REFERENCES gift_rewards(id),
  reward_name TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  money_credited NUMERIC(18,8) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== DÉSACTIVER RLS ====================
-- L'app utilise une auth personnalisée (téléphone), pas Supabase Auth.
-- On désactive le RLS sur toutes les tables pour que la clé anon puisse lire/écrire.

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE vip_conditions DISABLE ROW LEVEL SECURITY;
ALTER TABLE vip_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_series DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE countries DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_api_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE recharges DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_fee_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE omnipay_callbacks DISABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE social_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE official_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE popup_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE banners DISABLE ROW LEVEL SECURITY;
ALTER TABLE info_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE gift_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE gift_code_uses DISABLE ROW LEVEL SECURITY;
ALTER TABLE gift_rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE point_exchanges DISABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_prizes DISABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_spins DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs DISABLE ROW LEVEL SECURITY;

-- ==================== FONCTIONS RPC ====================

-- has_role : vérifie si un user a un rôle donné (utilisé par l'AdminPanel)
CREATE OR REPLACE FUNCTION has_role(_user_id TEXT, _role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- ==================== DONNÉES INITIALES ====================

-- Pays : Haïti (données de départ — modifiable dans l'Admin → Countries)
INSERT INTO countries (name, country_code, flag_emoji, phone_digits, is_active, api_enabled, validation_enabled, sort_order)
VALUES ('Haïti', '+509', '🇭🇹', 8, true, false, true, 0)
ON CONFLICT DO NOTHING;

-- VIP Levels (niveaux 0 à 5 — modifiables dans Admin → Levels)
INSERT INTO vip_conditions (level, level_name, min_investment, min_purchases, min_products_bought, min_active_members, min_team_investment, condition_logic)
VALUES
  (0, 'VIP 0 — Débutant',    0,    0, 0,  0,    0,    'OR'),
  (1, 'VIP 1 — Bronze',     100,   1, 1,  0,    0,    'OR'),
  (2, 'VIP 2 — Argent',     500,   2, 2,  3,  500,    'OR'),
  (3, 'VIP 3 — Or',        1000,   3, 3,  5, 2000,    'OR'),
  (4, 'VIP 4 — Platine',   3000,   5, 5, 10, 5000,    'OR'),
  (5, 'VIP 5 — Diamant',  10000,  10, 8, 20,20000,    'OR')
ON CONFLICT DO NOTHING;

-- Popup d'accueil (utilisé par Admin → Announcements)
INSERT INTO popup_messages (trigger_key, title, message, button_confirm, button_cancel, is_active, sort_order)
VALUES (
  'welcome_promo',
  'Offre Spéciale 🎁',
  'Bienvenue sur ESKOM Energy ! Commencez à investir dès aujourd''hui et gagnez des revenus quotidiens. Les nouveaux membres bénéficient d''un support prioritaire !',
  'Commencer maintenant',
  'Plus tard',
  true,
  0
)
ON CONFLICT DO NOTHING;

-- Liens sociaux par défaut (Admin → Links)
INSERT INTO social_links (key, label, url, is_active)
VALUES
  ('telegram',  'Telegram',   NULL, true),
  ('whatsapp',  'WhatsApp',   NULL, true),
  ('facebook',  'Facebook',   NULL, true),
  ('instagram', 'Instagram',  NULL, true),
  ('tiktok',    'TikTok',     NULL, false),
  ('youtube',   'YouTube',    NULL, false)
ON CONFLICT DO NOTHING;

-- Paramètres du site par défaut (Admin → Site / Rewards / Emma AI / etc.)
INSERT INTO site_settings (key, value, category)
VALUES
  -- Général
  ('site_name',                     'ESKOM Energy',   'general'),
  ('site_tagline',                  'Investissez intelligemment', 'general'),
  ('site_contact_email',            '',               'general'),
  ('site_contact_phone',            '',               'general'),
  -- Finance
  ('min_deposit',                   '10',             'finance'),
  ('max_deposit',                   '100000',         'finance'),
  ('min_withdrawal',                '10',             'finance'),
  ('max_withdrawal',                '100000',         'finance'),
  ('withdrawal_fee_percent',        '0',              'finance'),
  ('processing_fee_enabled',        'false',          'finance'),
  ('processing_fee_amount',         '0',              'finance'),
  -- Emma AI
  ('sarah_enabled',                 'false',          'sarah'),
  ('sarah_ai_provider',             'lovable',        'sarah'),
  -- Points ESK
  ('points_per_active_member',      '0',              'points'),
  ('points_per_vip_level_per_day',  '0',              'points'),
  ('points_per_deposit_type',       'fixed',          'points'),
  ('points_per_deposit_value',      '0',              'points'),
  ('points_per_withdrawal',         '0',              'points'),
  -- Roue
  ('wheel_enabled',                 'false',          'wheel'),
  ('wheel_spins_per_day',           '1',              'wheel'),
  -- Référencement
  ('referral_l1_rate',              '5',              'referral'),
  ('referral_l2_rate',              '2',              'referral'),
  ('referral_l3_rate',              '1',              'referral'),
  -- App
  ('app_store_url',                 '',               'app'),
  ('play_store_url',                '',               'app'),
  -- Dates
  ('platform_launch_date',          '',               'dates'),
  ('maintenance_mode',              'false',          'maintenance')
ON CONFLICT (key) DO NOTHING;

-- ==================== INFORMATIONS ====================
-- Pour créer votre premier compte admin :
-- 1. Créez un compte dans l'appli (téléphone + mot de passe)
-- 2. Trouvez votre user_id dans la table "profiles"
-- 3. Exécutez : INSERT INTO user_roles (user_id, role) VALUES ('VOTRE_USER_ID', 'admin');
