
-- Allow moderators to insert admin_logs
CREATE POLICY "Moderators can insert logs"
ON public.admin_logs
FOR INSERT
TO public
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to read admin_logs
CREATE POLICY "Moderators can read logs"
ON public.admin_logs
FOR SELECT
TO public
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to read omnipay_callbacks
CREATE POLICY "Moderators can read callbacks"
ON public.omnipay_callbacks
FOR SELECT
TO public
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to read user_wallets (needed to see withdrawal wallet info)
CREATE POLICY "Moderators can read wallets"
ON public.user_wallets
FOR SELECT
TO public
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to read site_settings (needed for withdrawal mode etc)
-- Already has "Anyone can read" so this is fine
