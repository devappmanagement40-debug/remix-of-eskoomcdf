
-- Add team investment condition to vip_conditions
ALTER TABLE public.vip_conditions ADD COLUMN IF NOT EXISTS min_team_investment numeric DEFAULT 0;

-- Add access conditions to product_series
ALTER TABLE public.product_series ADD COLUMN IF NOT EXISTS min_vip_level integer DEFAULT 0;
ALTER TABLE public.product_series ADD COLUMN IF NOT EXISTS min_personal_investment numeric DEFAULT 0;
ALTER TABLE public.product_series ADD COLUMN IF NOT EXISTS min_team_investment numeric DEFAULT 0;
ALTER TABLE public.product_series ADD COLUMN IF NOT EXISTS min_active_members integer DEFAULT 0;
