
-- Retroactively credit missing commissions for all purchases that have no commission record
-- This fixes the 37+ purchases before the fix AND the 2 that failed client-side

DO $$
DECLARE
  rec RECORD;
  v_buyer_profile_id uuid;
  v_product_price numeric;
  v_has_commission boolean;
BEGIN
  FOR rec IN
    SELECT up.user_id, up.product_id, up.purchased_at
    FROM user_products up
    JOIN profiles prof ON prof.user_id = up.user_id
    WHERE prof.referred_by IS NOT NULL
    ORDER BY up.purchased_at ASC
  LOOP
    -- Get buyer profile id
    SELECT id INTO v_buyer_profile_id FROM profiles WHERE user_id = rec.user_id;
    
    -- Get product price
    SELECT price INTO v_product_price FROM products WHERE id = rec.product_id;
    
    -- Check if commission already exists for this purchase
    SELECT EXISTS(
      SELECT 1 FROM referral_commissions rc
      WHERE rc.buyer_id = rec.user_id
        AND rc.product_price = v_product_price
        AND rc.created_at BETWEEN rec.purchased_at - interval '10 minutes' AND rec.purchased_at + interval '10 minutes'
    ) INTO v_has_commission;
    
    -- Only credit if no commission exists
    IF NOT v_has_commission AND v_product_price > 0 THEN
      PERFORM credit_referral_commissions(v_buyer_profile_id, v_product_price);
    END IF;
  END LOOP;
END;
$$;
