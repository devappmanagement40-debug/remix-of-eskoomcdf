
-- Create gift_codes table for exchange codes
CREATE TABLE public.gift_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  points_value integer NOT NULL DEFAULT 0,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create gift_code_uses table to track who used what
CREATE TABLE public.gift_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid REFERENCES public.gift_codes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  points_awarded integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_code_uses ENABLE ROW LEVEL SECURITY;

-- RLS policies for gift_codes
CREATE POLICY "Admins can manage gift codes" ON public.gift_codes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read active gift codes" ON public.gift_codes FOR SELECT USING (true);

-- RLS policies for gift_code_uses
CREATE POLICY "Admins can manage all code uses" ON public.gift_code_uses FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own code uses" ON public.gift_code_uses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own code uses" ON public.gift_code_uses FOR SELECT USING (auth.uid() = user_id);
