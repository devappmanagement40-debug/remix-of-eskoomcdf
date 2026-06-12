
ALTER TABLE public.wheel_prizes ADD COLUMN IF NOT EXISTS is_winnable boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.wheel_prizes.is_winnable IS 'If false, the prize is displayed on the wheel but can never be won';
