
-- ============================================
-- WHEEL PRIZES TABLE
-- ============================================
CREATE TABLE public.wheel_prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  prize_type TEXT NOT NULL DEFAULT 'cash', -- 'cash' or 'vip'
  vip_level INTEGER NULL, -- only for vip prizes
  probability NUMERIC NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wheel_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage wheel prizes" ON public.wheel_prizes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active wheel prizes" ON public.wheel_prizes FOR SELECT
  USING (true);

-- Seed default prizes
INSERT INTO public.wheel_prizes (label, value, prize_type, probability, sort_order) VALUES
  ('50', 50, 'cash', 25, 1),
  ('100', 100, 'cash', 20, 2),
  ('200', 200, 'cash', 15, 3),
  ('VIP1', 0, 'vip', 5, 4),
  ('500', 500, 'cash', 15, 5),
  ('3K', 3000, 'cash', 10, 6),
  ('10K', 10000, 'cash', 7, 7),
  ('50K', 50000, 'cash', 3, 8);

UPDATE public.wheel_prizes SET vip_level = 1 WHERE label = 'VIP1';

-- ============================================
-- WHEEL SPINS TABLE (track all spins + VIP validation)
-- ============================================
CREATE TABLE public.wheel_spins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prize_id UUID REFERENCES public.wheel_prizes(id),
  prize_label TEXT NOT NULL,
  prize_value NUMERIC NOT NULL DEFAULT 0,
  prize_type TEXT NOT NULL DEFAULT 'cash',
  vip_level INTEGER NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'pending_vip', 'vip_approved', 'vip_rejected'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all spins" ON public.wheel_spins FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own spins" ON public.wheel_spins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spins" ON public.wheel_spins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SPLIT BALANCE: add deposit_balance, earnings_balance, referral_balance
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN deposit_balance NUMERIC DEFAULT 0,
  ADD COLUMN earnings_balance NUMERIC DEFAULT 0,
  ADD COLUMN referral_balance NUMERIC DEFAULT 0;

-- ============================================
-- WHEEL SETTINGS via site_settings
-- ============================================
INSERT INTO public.site_settings (key, value, category) VALUES
  ('wheel_title', 'Roue de la Fortune', 'wheel'),
  ('wheel_subtitle', '100% Gagnant • Cadeaux Divers', 'wheel'),
  ('wheel_rules', 'Règle 1 : Chaque investissement vous donne droit à un tirage.\nRègle 2 : Inviter un membre valide vous donne droit à un tirage.', 'wheel'),
  ('wheel_win_message', 'Félicitations ! Vous avez gagné', 'wheel'),
  ('wheel_banner_url', '', 'wheel'),
  ('wheel_icon_url', '', 'wheel'),
  ('support_icon_url', '', 'wheel'),
  ('wheel_info_title', 'Règlement du jeu', 'wheel'),
  ('deposit_not_withdrawable', 'true', 'finance')
ON CONFLICT DO NOTHING;

-- ============================================
-- VIP HISTORY LOG
-- ============================================
CREATE TABLE public.vip_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  old_level INTEGER NOT NULL DEFAULT 0,
  new_level INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  changed_by UUID, -- admin who changed it
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vip_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vip history" ON public.vip_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own vip history" ON public.vip_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vip history" ON public.vip_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
