CREATE OR REPLACE FUNCTION public.handle_withdrawal_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Refund when status changes to 'rejected' from 'pending' or 'processing'
  IF (OLD.status = 'pending' OR OLD.status = 'processing') AND NEW.status = 'rejected' THEN
    UPDATE profiles SET
      balance = COALESCE(balance, 0) + OLD.amount,
      earnings_balance = COALESCE(earnings_balance, 0) + OLD.amount
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN NEW;
END;
$function$;