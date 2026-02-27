-- Add image_url column to info_items for announcement images
ALTER TABLE public.info_items ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url column to vip_conditions for VIP level images
ALTER TABLE public.vip_conditions ADD COLUMN IF NOT EXISTS image_url text;
