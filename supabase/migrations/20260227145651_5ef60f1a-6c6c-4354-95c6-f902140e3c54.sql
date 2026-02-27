
-- Add payment_type to payment_methods (manual vs external_link)
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'manual';
-- Add external_url for link-based payments
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS external_url text;
-- Add logo_url for payment method images
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS logo_url text;

-- Insert default site settings for deposit/withdrawal configuration
INSERT INTO public.site_settings (key, value, category) VALUES
  ('deposit_amounts', '5000,10000,20000,50000,100000,200000', 'deposit')
ON CONFLICT DO NOTHING;

INSERT INTO public.site_settings (key, value, category) VALUES
  ('deposit_min', '1000', 'deposit')
ON CONFLICT DO NOTHING;

INSERT INTO public.site_settings (key, value, category) VALUES
  ('deposit_max', '1000000', 'deposit')
ON CONFLICT DO NOTHING;

INSERT INTO public.site_settings (key, value, category) VALUES
  ('deposit_rules', 'Montant minimum : {min} FCFA|Montant maximum : {max} FCFA|Délai de traitement : 5 à 30 minutes|Le dépôt est crédité après vérification', 'deposit')
ON CONFLICT DO NOTHING;

INSERT INTO public.site_settings (key, value, category) VALUES
  ('withdrawal_amounts', '1000,5000,10000,20000,50000', 'withdrawal')
ON CONFLICT DO NOTHING;

INSERT INTO public.site_settings (key, value, category) VALUES
  ('withdrawal_min', '800', 'withdrawal')
ON CONFLICT DO NOTHING;

INSERT INTO public.site_settings (key, value, category) VALUES
  ('withdrawal_max', '500000', 'withdrawal')
ON CONFLICT DO NOTHING;

INSERT INTO public.site_settings (key, value, category) VALUES
  ('withdrawal_fee_percent', '10', 'withdrawal')
ON CONFLICT DO NOTHING;

INSERT INTO public.site_settings (key, value, category) VALUES
  ('withdrawal_rules', 'Montant minimum : {min} FCFA|Frais de retrait : {fee}%|Délai de traitement : 1 à 24 heures|Seuls les gains et bonus sont retirables', 'withdrawal')
ON CONFLICT DO NOTHING;

INSERT INTO public.site_settings (key, value, category) VALUES
  ('require_screenshot', 'false', 'deposit')
ON CONFLICT DO NOTHING;
