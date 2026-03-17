
-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete chat messages (needed when deleting users)
CREATE POLICY "Admins can delete chat messages"
ON public.chat_messages
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));
