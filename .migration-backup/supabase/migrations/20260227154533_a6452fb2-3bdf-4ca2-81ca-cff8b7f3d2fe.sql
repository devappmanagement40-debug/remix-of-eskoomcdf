
-- 1. Gift Rewards catalog table
CREATE TABLE public.gift_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  points_required INTEGER NOT NULL DEFAULT 100,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gift_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active rewards" ON public.gift_rewards FOR SELECT USING (true);
CREATE POLICY "Admins can manage rewards" ON public.gift_rewards FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. Add gift_points column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gift_points INTEGER DEFAULT 0;

-- 3. Insert points configuration settings
INSERT INTO public.site_settings (key, value, category) VALUES
  ('points_per_active_member', '5', 'points'),
  ('points_per_vip_level_per_day', '10', 'points'),
  ('points_per_deposit_type', 'fixed', 'points'),
  ('points_per_deposit_value', '5', 'points'),
  ('points_per_withdrawal', '3', 'points'),
  ('max_withdrawals_per_day', '1', 'withdrawals'),
  ('max_withdrawals_enabled', 'true', 'withdrawals')
ON CONFLICT DO NOTHING;

-- 4. Create function to auto-debit balance on withdrawal insert
CREATE OR REPLACE FUNCTION public.handle_withdrawal_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earnings NUMERIC;
  v_referral NUMERIC;
  v_balance NUMERIC;
  v_remaining NUMERIC;
  v_debit_earnings NUMERIC;
  v_debit_referral NUMERIC;
  v_deposit_not_withdrawable BOOLEAN;
  v_setting_val TEXT;
BEGIN
  -- Get profile balances
  SELECT earnings_balance, referral_balance, balance
  INTO v_earnings, v_referral, v_balance
  FROM profiles WHERE user_id = NEW.user_id;

  -- Check deposit_not_withdrawable setting
  SELECT value INTO v_setting_val FROM site_settings WHERE key = 'deposit_not_withdrawable';
  v_deposit_not_withdrawable := COALESCE(v_setting_val, 'true') = 'true';

  IF v_deposit_not_withdrawable THEN
    -- Debit from earnings first, then referral
    v_remaining := NEW.amount;
    v_debit_earnings := LEAST(COALESCE(v_earnings, 0), v_remaining);
    v_remaining := v_remaining - v_debit_earnings;
    v_debit_referral := LEAST(COALESCE(v_referral, 0), v_remaining);

    UPDATE profiles SET
      balance = GREATEST(0, COALESCE(balance, 0) - NEW.amount),
      earnings_balance = GREATEST(0, COALESCE(earnings_balance, 0) - v_debit_earnings),
      referral_balance = GREATEST(0, COALESCE(referral_balance, 0) - v_debit_referral)
    WHERE user_id = NEW.user_id;
  ELSE
    UPDATE profiles SET
      balance = GREATEST(0, COALESCE(balance, 0) - NEW.amount)
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_withdrawal_insert
AFTER INSERT ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.handle_withdrawal_insert();

-- 5. Create function to refund on withdrawal rejection
CREATE OR REPLACE FUNCTION public.handle_withdrawal_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when status changes to 'rejected'
  IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    UPDATE profiles SET
      balance = COALESCE(balance, 0) + OLD.amount,
      earnings_balance = COALESCE(earnings_balance, 0) + OLD.amount
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_withdrawal_status_change
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.handle_withdrawal_status_change();

-- 6. Update updated_at trigger for gift_rewards
CREATE TRIGGER update_gift_rewards_updated_at
BEFORE UPDATE ON public.gift_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
