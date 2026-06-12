-- Add proof_image_url column to recharges table for payment proof uploads
ALTER TABLE public.recharges ADD COLUMN IF NOT EXISTS proof_image_url text;