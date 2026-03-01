
-- Table for storing payment API configurations
CREATE TABLE public.payment_api_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'custom',
  api_key text,
  secret_key text,
  endpoint_url text,
  callback_url text,
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'production')),
  is_active boolean NOT NULL DEFAULT false,
  country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.payment_api_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage API configs"
ON public.payment_api_configs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- No public read policy - API configs are admin-only

-- Add api_config_id to payment_methods to link to an API config
ALTER TABLE public.payment_methods ADD COLUMN api_config_id uuid REFERENCES public.payment_api_configs(id) ON DELETE SET NULL;

-- Payment logs table for tracking API transactions
CREATE TABLE public.payment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  api_config_id uuid REFERENCES public.payment_api_configs(id),
  payment_method_id uuid REFERENCES public.payment_methods(id),
  amount numeric NOT NULL,
  phone text NOT NULL,
  country_code text NOT NULL DEFAULT '+226',
  status text NOT NULL DEFAULT 'initiated',
  provider_ref text,
  provider_response jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment logs"
ON public.payment_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own payment logs"
ON public.payment_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE TRIGGER update_payment_api_configs_updated_at
BEFORE UPDATE ON public.payment_api_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_logs_updated_at
BEFORE UPDATE ON public.payment_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
