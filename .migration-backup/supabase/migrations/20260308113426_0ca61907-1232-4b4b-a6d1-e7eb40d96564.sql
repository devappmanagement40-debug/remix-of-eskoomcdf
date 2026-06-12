-- Add admin SELECT policy on profiles so admins can see all user profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for storage objects to allow authenticated users to upload to recharge-proofs
CREATE POLICY "Users can upload recharge proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-assets' AND (storage.foldername(name))[1] = 'recharge-proofs');