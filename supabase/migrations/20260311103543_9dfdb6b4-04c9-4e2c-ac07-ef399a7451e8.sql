
-- Create a trigger on user_products to automatically credit referral commissions
-- This replaces the unreliable client-side RPC call

CREATE OR REPLACE FUNCTION public.trigger_referral_commission_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_buyer_profile_id uuid;
  v_referred_by uuid;
  v_product_price numeric;
BEGIN
  -- Get buyer's profile id and referral info
  SELECT id, referred_by INTO v_buyer_profile_id, v_referred_by
  FROM profiles WHERE user_id = NEW.user_id;

  -- Only proceed if user was referred
  IF v_referred_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get product price
  SELECT price INTO v_product_price FROM products WHERE id = NEW.product_id;

  IF v_product_price IS NULL OR v_product_price <= 0 THEN
    RETURN NEW;
  END IF;

  -- Call the existing commission function
  PERFORM credit_referral_commissions(v_buyer_profile_id, v_product_price);

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_user_product_insert_commission
  AFTER INSERT ON public.user_products
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_referral_commission_on_purchase();
