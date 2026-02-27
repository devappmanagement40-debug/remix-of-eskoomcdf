
-- Site settings (key-value store for all site configuration)
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  category text NOT NULL DEFAULT 'general',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Payment methods (admin-configurable)
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL DEFAULT 'Burkina Faso',
  phone text,
  holder_name text,
  instructions text,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active payment methods" ON public.payment_methods FOR SELECT USING (true);
CREATE POLICY "Admins can manage payment methods" ON public.payment_methods FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Social / support links
CREATE TABLE public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  url text,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read social links" ON public.social_links FOR SELECT USING (true);
CREATE POLICY "Admins can manage social links" ON public.social_links FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin action logs
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read logs" ON public.admin_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert logs" ON public.admin_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add is_suspended to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_methods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_links;

-- Seed default social links
INSERT INTO public.social_links (key, label, url) VALUES
('whatsapp', 'WhatsApp', ''),
('telegram', 'Telegram', ''),
('support', 'Support URL', ''),
('facebook', 'Facebook', ''),
('instagram', 'Instagram', '');

-- Seed default site settings
INSERT INTO public.site_settings (key, value, category) VALUES
('site_name', 'ESKOM Energy', 'general'),
('welcome_text', 'Bienvenue sur ESKOM Energy', 'general'),
('terms_url', '', 'general'),
('vip_threshold_1', '10000', 'vip'),
('vip_threshold_2', '50000', 'vip'),
('vip_threshold_3', '100000', 'vip'),
('vip_threshold_4', '200000', 'vip'),
('vip_threshold_5', '500000', 'vip'),
('withdrawal_fee_percent', '10', 'finance'),
('min_withdrawal', '800', 'finance');
