
-- Create referral commission history table
CREATE TABLE public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  product_price numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'B',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- Users can view commissions they received
CREATE POLICY "Users can view own commissions"
ON public.referral_commissions FOR SELECT
USING (beneficiary_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

-- Admins full access
CREATE POLICY "Admins can manage commissions"
ON public.referral_commissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update credit_referral_commissions to log each commission
CREATE OR REPLACE FUNCTION public.credit_referral_commissions(_buyer_profile_id uuid, _product_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referred_by uuid;
  v_buyer_user_id uuid;
  v_pct_b numeric;
  v_pct_c numeric;
  v_pct_d numeric;
  v_bonus numeric;
  v_parent_referred_by uuid;
  v_setting_val text;
  v_beneficiary_user_id uuid;
BEGIN
  SELECT referred_by, user_id INTO v_referred_by, v_buyer_user_id FROM profiles WHERE id = _buyer_profile_id;
  IF v_referred_by IS NULL THEN RETURN; END IF;

  SELECT value INTO v_setting_val FROM site_settings WHERE key = 'referral_bonus_level_b';
  v_pct_b := COALESCE(v_setting_val::numeric, 10) / 100;
  SELECT value INTO v_setting_val FROM site_settings WHERE key = 'referral_bonus_level_c';
  v_pct_c := COALESCE(v_setting_val::numeric, 3) / 100;
  SELECT value INTO v_setting_val FROM site_settings WHERE key = 'referral_bonus_level_d';
  v_pct_d := COALESCE(v_setting_val::numeric, 1) / 100;

  -- Level B
  v_bonus := ROUND(_product_price * v_pct_b);
  IF v_bonus > 0 THEN
    UPDATE profiles SET
      balance = COALESCE(balance, 0) + v_bonus,
      referral_balance = COALESCE(referral_balance, 0) + v_bonus
    WHERE id = v_referred_by
    RETURNING referred_by, user_id INTO v_parent_referred_by, v_beneficiary_user_id;

    INSERT INTO referral_commissions (beneficiary_id, buyer_id, product_price, commission_rate, commission_amount, level)
    VALUES (v_beneficiary_user_id, v_buyer_user_id, _product_price, v_pct_b * 100, v_bonus, 'B');

    -- Level C
    IF v_parent_referred_by IS NOT NULL THEN
      v_bonus := ROUND(_product_price * v_pct_c);
      IF v_bonus > 0 THEN
        UPDATE profiles SET
          balance = COALESCE(balance, 0) + v_bonus,
          referral_balance = COALESCE(referral_balance, 0) + v_bonus
        WHERE id = v_parent_referred_by
        RETURNING referred_by, user_id INTO v_parent_referred_by, v_beneficiary_user_id;

        INSERT INTO referral_commissions (beneficiary_id, buyer_id, product_price, commission_rate, commission_amount, level)
        VALUES (v_beneficiary_user_id, v_buyer_user_id, _product_price, v_pct_c * 100, v_bonus, 'C');

        -- Level D
        IF v_parent_referred_by IS NOT NULL THEN
          v_bonus := ROUND(_product_price * v_pct_d);
          IF v_bonus > 0 THEN
            UPDATE profiles SET
              balance = COALESCE(balance, 0) + v_bonus,
              referral_balance = COALESCE(referral_balance, 0) + v_bonus
            WHERE id = v_parent_referred_by
            RETURNING user_id INTO v_beneficiary_user_id;

            INSERT INTO referral_commissions (beneficiary_id, buyer_id, product_price, commission_rate, commission_amount, level)
            VALUES (v_beneficiary_user_id, v_buyer_user_id, _product_price, v_pct_d * 100, v_bonus, 'D');
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
END;
$$;
