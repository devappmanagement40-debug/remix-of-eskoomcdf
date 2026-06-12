
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view team members profiles" ON public.profiles;

-- Create a security definer function to get team member IDs without RLS recursion
CREATE OR REPLACE FUNCTION public.get_team_profile_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_profile AS (
    SELECT id FROM profiles WHERE user_id = _user_id
  ),
  level_b AS (
    SELECT id FROM profiles WHERE referred_by IN (SELECT id FROM my_profile)
  ),
  level_c AS (
    SELECT id FROM profiles WHERE referred_by IN (SELECT id FROM level_b)
  ),
  level_d AS (
    SELECT id FROM profiles WHERE referred_by IN (SELECT id FROM level_c)
  )
  SELECT id FROM level_b
  UNION ALL
  SELECT id FROM level_c
  UNION ALL
  SELECT id FROM level_d;
$$;

-- Recreate the policy using the function
CREATE POLICY "Users can view team members profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR id IN (SELECT public.get_team_profile_ids(auth.uid()))
);

-- Drop the old "Users can view own profile" since the new policy covers it
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
