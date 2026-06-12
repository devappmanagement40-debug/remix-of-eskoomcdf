
-- Allow admins to delete withdrawals (for user cleanup)
CREATE POLICY "Admins can delete withdrawals"
ON public.withdrawals
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete recharges (for user cleanup)
CREATE POLICY "Admins can delete recharges"
ON public.recharges
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete wheel spins (for user cleanup)
CREATE POLICY "Admins can delete spins"
ON public.wheel_spins
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete point exchanges (for user cleanup)
CREATE POLICY "Admins can delete exchanges"
ON public.point_exchanges
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));
