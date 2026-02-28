
-- Add money_value to gift_rewards for point-to-money conversion
ALTER TABLE public.gift_rewards ADD COLUMN IF NOT EXISTS money_value numeric NOT NULL DEFAULT 0;

-- Create point_exchanges table to track all point conversions
CREATE TABLE public.point_exchanges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reward_id uuid REFERENCES public.gift_rewards(id),
  points_spent integer NOT NULL,
  money_credited numeric NOT NULL,
  reward_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.point_exchanges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exchanges" ON public.point_exchanges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exchanges" ON public.point_exchanges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all exchanges" ON public.point_exchanges
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for point_exchanges
ALTER PUBLICATION supabase_realtime ADD TABLE public.point_exchanges;
