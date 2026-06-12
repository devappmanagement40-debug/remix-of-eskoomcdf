
-- Add spins_balance to profiles to track available wheel spins
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS spins_balance integer NOT NULL DEFAULT 0;
