-- ================================================================
-- GE Energy — SQL COMPLET pour Supabase Production
-- Coller dans: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- Types enum
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL UNIQUE,
  phone text,
  full_name text,
  country_code text,
  balance numeric(18,8) DEFAULT 0,
  deposit_balance numeric(18,8) DEFAULT 0,
  earnings_balance numeric(18,8) DEFAULT 0,
  referral_balance numeric(18,8) DEFAULT 0,
  gift_points integer DEFAULT 0,
  spins_balance integer DEFAULT 0,
  vip_level integer DEFAULT 0,
  referral_code text,
  referred_by text,
  password_hash text,
  is_suspended boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ USER SESSIONS ============
CREATE TABLE IF NOT EXISTS user_sessions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============ USER ROLES ============
CREATE TABLE IF NOT EXISTS user_roles (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  role app_role NOT NULL DEFAULT 'user'
);

-- ============ ADMIN PERMISSIONS ============
CREATE TABLE IF NOT EXISTS admin_permissions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  permission text NOT NULL,
  granted_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============ VIP CONDITIONS ============
CREATE TABLE IF NOT EXISTS vip_conditions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  level integer NOT NULL,
  level_name text NOT NULL,
  min_investment numeric(18,8),
  min_purchases integer,
  min_products_bought integer,
  min_active_members integer,
  min_team_investment numeric(18,8),
  condition_logic text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ VIP HISTORY ============
CREATE TABLE IF NOT EXISTS vip_history (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  old_level integer DEFAULT 0,
  new_level integer DEFAULT 0,
  reason text,
  changed_by text,
  created_at timestamptz DEFAULT now()
);

-- ============ PRODUCT SERIES ============
CREATE TABLE IF NOT EXISTS product_series (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  color text,
  min_vip_level integer,
  min_personal_investment numeric(18,8),
  min_team_investment numeric(18,8),
  min_active_members integer,
  sort_order integer,
  created_at timestamptz DEFAULT now()
);

-- ============ PRODUCTS ============
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  description text,
  price numeric(18,8),
  return_percent numeric(10,4),
  daily_revenue numeric(18,8),
  total_revenue numeric(18,8),
  cycles integer,
  gain_type text NOT NULL DEFAULT 'daily',
  image_url text,
  series_id text REFERENCES product_series(id),
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  is_new boolean DEFAULT false,
  stock_status text DEFAULT 'available',
  max_purchases integer,
  sort_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ USER PRODUCTS ============
CREATE TABLE IF NOT EXISTS user_products (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  product_id text NOT NULL REFERENCES products(id),
  is_active boolean DEFAULT true,
  purchased_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  last_collected_at timestamptz,
  total_collected numeric(18,8) DEFAULT 0
);

-- ============ REFERRAL COMMISSIONS ============
CREATE TABLE IF NOT EXISTS referral_commissions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  beneficiary_id text NOT NULL,
  buyer_id text NOT NULL,
  product_price numeric(18,8) DEFAULT 0,
  commission_amount numeric(18,8) DEFAULT 0,
  commission_rate numeric(10,4) DEFAULT 0,
  level text DEFAULT 'L1',
  created_at timestamptz DEFAULT now()
);

-- ============ COUNTRIES ============
CREATE TABLE IF NOT EXISTS countries (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  country_code text NOT NULL,
  flag_emoji text,
  phone_digits integer,
  is_active boolean DEFAULT true,
  api_enabled boolean DEFAULT false,
  validation_enabled boolean,
  sort_order integer,
  created_at timestamptz DEFAULT now()
);

-- ============ PAYMENT API CONFIGS ============
CREATE TABLE IF NOT EXISTS payment_api_configs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  provider text DEFAULT '',
  mode text DEFAULT 'manual',
  api_key text,
  secret_key text,
  endpoint_url text,
  callback_url text,
  country_id text REFERENCES countries(id),
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ PAYMENT METHODS ============
CREATE TABLE IF NOT EXISTS payment_methods (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  payment_type text DEFAULT 'manual',
  country text DEFAULT '',
  country_id text REFERENCES countries(id),
  phone text,
  holder_name text,
  logo_url text,
  instructions text,
  external_url text,
  api_config_id text REFERENCES payment_api_configs(id),
  is_active boolean DEFAULT true,
  sort_order integer,
  created_at timestamptz DEFAULT now()
);

-- ============ RECHARGES (DEPOSITS) ============
CREATE TABLE IF NOT EXISTS recharges (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  amount numeric(18,8) NOT NULL,
  phone text NOT NULL,
  country_code text DEFAULT '',
  payment_method text,
  transaction_ref text,
  proof_image_url text,
  status text DEFAULT 'pending',
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ USER WALLETS ============
CREATE TABLE IF NOT EXISTS user_wallets (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  phone text NOT NULL,
  network text DEFAULT '',
  country_code text DEFAULT '',
  holder_name text,
  label text,
  created_at timestamptz DEFAULT now()
);

-- ============ WITHDRAWAL METHODS ============
CREATE TABLE IF NOT EXISTS withdrawal_methods (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  payment_type text DEFAULT 'manual',
  api_provider text,
  country_id text REFERENCES countries(id),
  logo_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============ WITHDRAWALS ============
CREATE TABLE IF NOT EXISTS withdrawals (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  amount numeric(18,8) NOT NULL,
  fee_amount numeric(18,8) DEFAULT 0,
  net_amount numeric(18,8) DEFAULT 0,
  processing_fee_amount numeric(18,8) DEFAULT 0,
  processing_fee_paid boolean DEFAULT false,
  processing_fee_proof_url text,
  phone text NOT NULL,
  network text DEFAULT '',
  country_code text DEFAULT '',
  wallet_id text REFERENCES user_wallets(id),
  status text DEFAULT 'pending',
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ WITHDRAWAL FEE PAYMENTS ============
CREATE TABLE IF NOT EXISTS withdrawal_fee_payments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  capital_amount numeric(18,8) DEFAULT 0,
  fee_amount numeric(18,8) DEFAULT 0,
  proof_url text,
  status text DEFAULT 'pending',
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ PAYMENT LOGS ============
CREATE TABLE IF NOT EXISTS payment_logs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  amount numeric(18,8) NOT NULL,
  phone text NOT NULL,
  country_code text DEFAULT '',
  status text DEFAULT 'pending',
  payment_method_id text REFERENCES payment_methods(id),
  api_config_id text REFERENCES payment_api_configs(id),
  provider_ref text,
  provider_response jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ OMNIPAY CALLBACKS ============
CREATE TABLE IF NOT EXISTS omnipay_callbacks (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reference text NOT NULL,
  status_result text NOT NULL,
  status_code text,
  message text,
  omnipay_id text,
  withdrawal_id text,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============ SITE SETTINGS ============
CREATE TABLE IF NOT EXISTS site_settings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key text NOT NULL UNIQUE,
  value text,
  category text DEFAULT 'general',
  updated_at timestamptz DEFAULT now()
);

-- ============ SOCIAL LINKS ============
CREATE TABLE IF NOT EXISTS social_links (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key text NOT NULL,
  label text NOT NULL,
  url text,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- ============ OFFICIAL DOCUMENTS ============
CREATE TABLE IF NOT EXISTS official_documents (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  doc_type text DEFAULT 'policy',
  description text,
  file_url text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ POPUP MESSAGES ============
CREATE TABLE IF NOT EXISTS popup_messages (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  trigger_key text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  button_confirm text,
  button_cancel text,
  tabs jsonb,
  is_active boolean DEFAULT true,
  sort_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ FAQ ITEMS ============
CREATE TABLE IF NOT EXISTS faq_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question text NOT NULL,
  answer text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ BANNERS ============
CREATE TABLE IF NOT EXISTS banners (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  image_url text NOT NULL,
  link_path text,
  is_active boolean DEFAULT true,
  sort_order integer,
  created_at timestamptz DEFAULT now()
);

-- ============ INFO ITEMS ============
CREATE TABLE IF NOT EXISTS info_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ CHAT MESSAGES ============
CREATE TABLE IF NOT EXISTS chat_messages (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  message text NOT NULL,
  sender text DEFAULT 'user',
  is_ai boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============ GIFT CODES ============
CREATE TABLE IF NOT EXISTS gift_codes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code text NOT NULL UNIQUE,
  points_value integer DEFAULT 0,
  max_uses integer DEFAULT 1,
  used_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ GIFT CODE USES ============
CREATE TABLE IF NOT EXISTS gift_code_uses (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code_id text NOT NULL REFERENCES gift_codes(id),
  user_id text NOT NULL,
  points_awarded integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============ GIFT REWARDS ============
CREATE TABLE IF NOT EXISTS gift_rewards (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  points_required integer DEFAULT 0,
  money_value numeric(18,8) DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ POINT EXCHANGES ============
CREATE TABLE IF NOT EXISTS point_exchanges (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  reward_id text REFERENCES gift_rewards(id),
  reward_name text NOT NULL,
  points_spent integer NOT NULL,
  money_credited numeric(18,8) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============ WHEEL PRIZES ============
CREATE TABLE IF NOT EXISTS wheel_prizes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label text NOT NULL,
  prize_type text DEFAULT 'cash',
  value numeric(18,8) DEFAULT 0,
  probability numeric(10,6) DEFAULT 0,
  is_active boolean DEFAULT true,
  is_winnable boolean DEFAULT true,
  vip_level integer,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ WHEEL SPINS ============
CREATE TABLE IF NOT EXISTS wheel_spins (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  prize_id text REFERENCES wheel_prizes(id),
  prize_label text NOT NULL,
  prize_type text DEFAULT 'cash',
  prize_value numeric(18,8) DEFAULT 0,
  vip_level integer,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ ADMIN LOGS ============
CREATE TABLE IF NOT EXISTS admin_logs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_id text NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details text,
  created_at timestamptz DEFAULT now()
);

-- ================================================================
-- DONNEES INITIALES
-- ================================================================

-- Pays
INSERT INTO countries (id,name,country_code,flag_emoji,phone_digits,is_active,api_enabled,sort_order) VALUES
  (gen_random_uuid()::text,'Haïti','+509','🇭🇹',8,true,false,1),
  (gen_random_uuid()::text,'Sénégal','+221','🇸🇳',9,true,false,2),
  (gen_random_uuid()::text,'Côte d''Ivoire','+225','🇨🇮',10,true,false,3),
  (gen_random_uuid()::text,'Mali','+223','🇲🇱',8,true,false,4),
  (gen_random_uuid()::text,'Cameroun','+237','🇨🇲',9,true,false,5),
  (gen_random_uuid()::text,'Guinée','+224','🇬🇳',9,true,false,6),
  (gen_random_uuid()::text,'Togo','+228','🇹🇬',8,true,false,7),
  (gen_random_uuid()::text,'Bénin','+229','🇧🇯',8,true,false,8),
  (gen_random_uuid()::text,'France','+33','🇫🇷',9,true,false,9),
  (gen_random_uuid()::text,'USA','+1','🇺🇸',10,true,false,10)
ON CONFLICT DO NOTHING;

-- Settings
INSERT INTO site_settings (id,key,value,category) VALUES
  (gen_random_uuid()::text,'site_name','GE Energy','general'),
  (gen_random_uuid()::text,'site_description','Plateforme d''investissement numérique','general'),
  (gen_random_uuid()::text,'site_logo','/logo-ge.jpg','general'),
  (gen_random_uuid()::text,'currency','USD','general'),
  (gen_random_uuid()::text,'currency_symbol','$','general'),
  (gen_random_uuid()::text,'min_deposit','10','finance'),
  (gen_random_uuid()::text,'min_withdrawal','5','finance'),
  (gen_random_uuid()::text,'withdrawal_fee_percent','0','finance'),
  (gen_random_uuid()::text,'referral_bonus_l1','10','referral'),
  (gen_random_uuid()::text,'referral_bonus_l2','5','referral'),
  (gen_random_uuid()::text,'spin_cost','0','wheel'),
  (gen_random_uuid()::text,'daily_spins_limit','1','wheel'),
  (gen_random_uuid()::text,'maintenance_mode','false','general'),
  (gen_random_uuid()::text,'whatsapp_url','https://wa.me/15093001001','social')
ON CONFLICT (key) DO NOTHING;

-- Series produits
INSERT INTO product_series (id,name,color,sort_order) VALUES
  (gen_random_uuid()::text,'Starter','#22c55e',1),
  (gen_random_uuid()::text,'Premium','#3b82f6',2),
  (gen_random_uuid()::text,'VIP','#f59e0b',3)
ON CONFLICT DO NOTHING;

-- Wheel prizes
INSERT INTO wheel_prizes (id,label,prize_type,value,probability,is_active,is_winnable,sort_order) VALUES
  (gen_random_uuid()::text,'0.50$','cash',0.50,25,true,true,1),
  (gen_random_uuid()::text,'1$','cash',1,20,true,true,2),
  (gen_random_uuid()::text,'2$','cash',2,15,true,true,3),
  (gen_random_uuid()::text,'5$','cash',5,10,true,true,4),
  (gen_random_uuid()::text,'10$','cash',10,8,true,true,5),
  (gen_random_uuid()::text,'20$','cash',20,5,true,true,6),
  (gen_random_uuid()::text,'50$','cash',50,2,true,true,7),
  (gen_random_uuid()::text,'Pas de chance','none',0,15,true,false,8)
ON CONFLICT DO NOTHING;

-- Payment methods
INSERT INTO payment_methods (id,name,payment_type,country,phone,holder_name,is_active,sort_order) VALUES
  (gen_random_uuid()::text,'MonCash','manual','HT','+509 3001-0001','GE Energy',true,1),
  (gen_random_uuid()::text,'Wave','manual','SN','','GE Energy',true,2),
  (gen_random_uuid()::text,'Orange Money','manual','CI','','GE Energy',true,3)
ON CONFLICT DO NOTHING;

-- Social links
INSERT INTO social_links (id,key,label,url,is_active) VALUES
  (gen_random_uuid()::text,'whatsapp','WhatsApp','https://wa.me/15093001001',true)
ON CONFLICT DO NOTHING;

-- ================================================================
-- COMPTE ADMIN (mot de passe: Admin@GEE2024!)
-- ================================================================
DO $$
DECLARE
  admin_id text := gen_random_uuid()::text;
  admin_user_id text := gen_random_uuid()::text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE phone = '+5093001001') THEN
    INSERT INTO profiles (id,user_id,phone,full_name,country_code,referral_code,password_hash)
    VALUES (admin_id, admin_user_id, '+5093001001', 'Administrator', '+0', 'ADMIN001',
      '$2b$12$KqLl.TAxdTrhQPa1t4LvyuD36kXZU.P6yVqYkowMdvHL3yjTgNaDq');
    INSERT INTO user_roles (id,user_id,role) VALUES (gen_random_uuid()::text, admin_user_id, 'admin');
  END IF;
END $$;

-- ================================================================
-- RLS: désactiver pour le service_role (pas de politique nécessaire)
-- ================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- VERIFICATION
-- ================================================================
SELECT tablename, 
  (SELECT count(*) FROM information_schema.columns WHERE table_name=t.tablename AND table_schema='public')::text || ' colonnes' as cols
FROM pg_tables t WHERE schemaname='public' ORDER BY tablename;
