
-- Add referral system columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- Generate referral codes for existing profiles
UPDATE public.profiles SET referral_code = UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)) WHERE referral_code IS NULL;

-- Create index for referral lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- Allow users to read other profiles for team feature (limited)
CREATE POLICY "Users can view team members profiles"
ON public.profiles
FOR SELECT
USING (
  referred_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR referred_by IN (SELECT p2.id FROM public.profiles p2 WHERE p2.referred_by IN (SELECT p3.id FROM public.profiles p3 WHERE p3.user_id = auth.uid()))
  OR referred_by IN (SELECT p2.id FROM public.profiles p2 WHERE p2.referred_by IN (SELECT p3.id FROM public.profiles p3 WHERE p3.referred_by IN (SELECT p4.id FROM public.profiles p4 WHERE p4.user_id = auth.uid())))
);
