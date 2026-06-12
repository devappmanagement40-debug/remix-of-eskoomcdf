
-- Create withdrawal_methods table for managing withdrawal networks per country
CREATE TABLE public.withdrawal_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  logo_url TEXT,
  payment_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'api'
  api_provider TEXT, -- e.g. 'mtn', 'orange', etc. for future API integration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_methods ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage withdrawal methods"
  ON public.withdrawal_methods FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active withdrawal methods"
  ON public.withdrawal_methods FOR SELECT
  USING (true);
