-- ================================================================
-- GE Energy — Script de création des tables manquantes Supabase
-- À coller dans : Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- 1. payments
CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  amount numeric(18,8) NOT NULL,
  type text DEFAULT 'deposit',
  status text DEFAULT 'pending',
  reference text,
  provider text,
  provider_ref text,
  metadata jsonb,
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. deposits (recharges)
CREATE TABLE IF NOT EXISTS deposits (
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

-- 3. news
CREATE TABLE IF NOT EXISTS news (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  content text,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  body text,
  type text DEFAULT 'info',
  target_all boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 5. user_notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  notification_id text,
  title text NOT NULL,
  body text,
  type text DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 6. service_messages (support client)
CREATE TABLE IF NOT EXISTS service_messages (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  message text NOT NULL,
  sender text DEFAULT 'user',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 7. gift_code_redemptions
CREATE TABLE IF NOT EXISTS gift_code_redemptions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code_id text,
  user_id text NOT NULL,
  points_awarded integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 8. card_links (portefeuilles liés)
CREATE TABLE IF NOT EXISTS card_links (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  phone text NOT NULL,
  network text DEFAULT '',
  country_code text DEFAULT '',
  holder_name text,
  label text,
  created_at timestamptz DEFAULT now()
);

-- 9. user_points
CREATE TABLE IF NOT EXISTS user_points (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL UNIQUE,
  points integer DEFAULT 0,
  total_earned integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- 10. point_redemptions
CREATE TABLE IF NOT EXISTS point_redemptions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  reward_id text,
  reward_name text NOT NULL,
  points_spent integer NOT NULL,
  money_credited numeric(18,8) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 11. content_blocks
CREATE TABLE IF NOT EXISTS content_blocks (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key text NOT NULL UNIQUE,
  title text,
  content text,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- 12. app_images
CREATE TABLE IF NOT EXISTS app_images (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key text NOT NULL UNIQUE,
  url text NOT NULL,
  label text,
  updated_at timestamptz DEFAULT now()
);

-- 13. admin_actions
CREATE TABLE IF NOT EXISTS admin_actions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_id text NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details text,
  created_at timestamptz DEFAULT now()
);

-- ================================================================
-- Activer Row Level Security (RLS) sur toutes les nouvelles tables
-- ================================================================
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'payments','deposits','news','notifications','user_notifications',
    'service_messages','gift_code_redemptions','card_links','user_points',
    'point_redemptions','content_blocks','app_images','admin_actions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- Politique permissive pour le service_role (API serveur)
-- Le service_role bypass le RLS automatiquement dans Supabase
-- Donc aucune politique supplémentaire n'est nécessaire pour le backend.

-- ================================================================
-- Vérification finale
-- ================================================================
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'payments','deposits','news','notifications','user_notifications',
    'service_messages','gift_code_redemptions','card_links','user_points',
    'point_redemptions','content_blocks','app_images','admin_actions'
  )
ORDER BY tablename;
