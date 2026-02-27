
-- Add description column to products for product detail info
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;

-- Add last_collected_at to user_products for 24h collection tracking
ALTER TABLE public.user_products ADD COLUMN IF NOT EXISTS last_collected_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.user_products ADD COLUMN IF NOT EXISTS total_collected numeric DEFAULT 0;

-- Create banners table for admin-managed banner images
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  link_path text DEFAULT '/',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Admins can manage banners" ON public.banners FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for site assets (banners etc.)
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view site assets" ON storage.objects FOR SELECT USING (bucket_id = 'site-assets');
CREATE POLICY "Admins can upload site assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'site-assets');
CREATE POLICY "Admins can update site assets" ON storage.objects FOR UPDATE USING (bucket_id = 'site-assets');
CREATE POLICY "Admins can delete site assets" ON storage.objects FOR DELETE USING (bucket_id = 'site-assets');

-- Ensure product-images bucket exists  
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;
