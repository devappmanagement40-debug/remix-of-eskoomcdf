
CREATE OR REPLACE FUNCTION public.credit_referral_commissions(
  _buyer_profile_id uuid,
  _product_price numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referred_by uuid;
  v_pct_b numeric;
  v_pct_c numeric;
  v_pct_d numeric;
  v_bonus numeric;
  v_parent_referred_by uuid;
  v_setting_val text;
BEGIN
  -- Get buyer's referrer
  SELECT referred_by INTO v_referred_by FROM profiles WHERE id = _buyer_profile_id;
  IF v_referred_by IS NULL THEN RETURN; END IF;

  -- Get commission percentages from settings
  SELECT value INTO v_setting_val FROM site_settings WHERE key = 'referral_bonus_level_b';
  v_pct_b := COALESCE(v_setting_val::numeric, 10) / 100;
  
  SELECT value INTO v_setting_val FROM site_settings WHERE key = 'referral_bonus_level_c';
  v_pct_c := COALESCE(v_setting_val::numeric, 3) / 100;
  
  SELECT value INTO v_setting_val FROM site_settings WHERE key = 'referral_bonus_level_d';
  v_pct_d := COALESCE(v_setting_val::numeric, 1) / 100;

  -- Level B (direct referrer)
  v_bonus := ROUND(_product_price * v_pct_b);
  IF v_bonus > 0 THEN
    UPDATE profiles SET
      balance = COALESCE(balance, 0) + v_bonus,
      referral_balance = COALESCE(referral_balance, 0) + v_bonus
    WHERE id = v_referred_by
    RETURNING referred_by INTO v_parent_referred_by;

    -- Level C
    IF v_parent_referred_by IS NOT NULL THEN
      v_bonus := ROUND(_product_price * v_pct_c);
      IF v_bonus > 0 THEN
        UPDATE profiles SET
          balance = COALESCE(balance, 0) + v_bonus,
          referral_balance = COALESCE(referral_balance, 0) + v_bonus
        WHERE id = v_parent_referred_by
        RETURNING referred_by INTO v_parent_referred_by;

        -- Level D
        IF v_parent_referred_by IS NOT NULL THEN
          v_bonus := ROUND(_product_price * v_pct_d);
          IF v_bonus > 0 THEN
            UPDATE profiles SET
              balance = COALESCE(balance, 0) + v_bonus,
              referral_balance = COALESCE(referral_balance, 0) + v_bonus
            WHERE id = v_parent_referred_by;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
END;
$$;
