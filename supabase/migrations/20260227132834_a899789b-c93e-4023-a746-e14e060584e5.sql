
-- 1. Countries table
CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_code text NOT NULL,
  flag_emoji text DEFAULT '🏳️',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active countries" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Admins can manage countries" ON public.countries FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial countries
INSERT INTO public.countries (name, country_code, flag_emoji, sort_order) VALUES
  ('Burkina Faso', '+226', '🇧🇫', 1),
  ('Côte d''Ivoire', '+225', '🇨🇮', 2),
  ('Mali', '+223', '🇲🇱', 3);

-- 2. Link payment methods to countries via a junction table
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL;

-- 3. VIP level conditions table
CREATE TABLE public.vip_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL UNIQUE,
  level_name text NOT NULL,
  min_investment numeric DEFAULT 0,
  min_active_members integer DEFAULT 0,
  min_purchases integer DEFAULT 0,
  min_products_bought integer DEFAULT 0,
  condition_logic text DEFAULT 'OR' CHECK (condition_logic IN ('AND', 'OR')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.vip_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vip conditions" ON public.vip_conditions FOR SELECT USING (true);
CREATE POLICY "Admins can manage vip conditions" ON public.vip_conditions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default VIP levels
INSERT INTO public.vip_conditions (level, level_name, min_investment) VALUES
  (0, 'VIP0', 0),
  (1, 'VIP1', 10000),
  (2, 'VIP2', 50000),
  (3, 'VIP3', 100000),
  (4, 'VIP4', 250000),
  (5, 'VIP5', 500000);

-- 4. Add max_purchases to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_purchases integer DEFAULT NULL;

-- 5. User purchases tracking table
CREATE TABLE public.user_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  purchased_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  expires_at timestamptz DEFAULT NULL
);

ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products" ON public.user_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON public.user_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all user products" ON public.user_products FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Add vip_level to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vip_level integer DEFAULT 0;
