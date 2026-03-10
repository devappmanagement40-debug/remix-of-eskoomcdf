
-- Allow users to check if their team members have products (for active status display)
CREATE POLICY "Users can view team members products"
ON public.user_products
FOR SELECT
USING (
  user_id IN (
    SELECT p.user_id FROM profiles p
    WHERE p.id IN (SELECT get_team_profile_ids(auth.uid()))
  )
);
