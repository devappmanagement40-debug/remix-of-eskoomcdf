
-- Allow admins to insert/update/delete moderator roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow moderators to read their own permissions
CREATE POLICY "Users can read own permissions" ON public.admin_permissions
  FOR SELECT TO public USING (auth.uid() = user_id);

-- Allow moderators to read data they need based on permissions
-- Moderators need read access to profiles, recharges, withdrawals, products
CREATE POLICY "Moderators can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can view all recharges" ON public.recharges
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can update recharges" ON public.recharges
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can view all withdrawals" ON public.withdrawals
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can update withdrawals" ON public.withdrawals
  FOR UPDATE TO public
  USING (has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can manage products" ON public.products
  FOR ALL TO public
  USING (has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can manage series" ON public.product_series
  FOR ALL TO public
  USING (has_role(auth.uid(), 'moderator'::app_role));
