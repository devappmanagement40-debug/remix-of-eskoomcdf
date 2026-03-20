
-- Add processing fee columns to withdrawals
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS processing_fee_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_fee_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS processing_fee_proof_url TEXT;

-- Add site setting for the processing fee percentage
INSERT INTO public.site_settings (key, value, category)
VALUES ('withdrawal_processing_fee_percent', '35', 'withdrawals')
ON CONFLICT (key) DO NOTHING;
