
-- Create a secure function to validate referral codes without needing auth
CREATE OR REPLACE FUNCTION public.validate_referral_code(code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_id uuid;
BEGIN
  SELECT id INTO profile_id
  FROM profiles
  WHERE UPPER(referral_code) = UPPER(TRIM(code))
  LIMIT 1;
  
  RETURN profile_id;
END;
$$;
