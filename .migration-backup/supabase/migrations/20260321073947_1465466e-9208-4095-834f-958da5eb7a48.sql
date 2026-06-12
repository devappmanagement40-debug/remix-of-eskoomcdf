
-- Table to track processing fee payments (separate from withdrawals)
CREATE TABLE public.withdrawal_fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fee_amount numeric NOT NULL DEFAULT 0,
  capital_amount numeric NOT NULL DEFAULT 0,
  proof_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_fee_payments ENABLE ROW LEVEL SECURITY;

-- Users can create their own fee payments
CREATE POLICY "Users can create own fee payments"
ON public.withdrawal_fee_payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own fee payments
CREATE POLICY "Users can view own fee payments"
ON public.withdrawal_fee_payments FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own pending fee payments (upload proof)
CREATE POLICY "Users can update own pending fee payments"
ON public.withdrawal_fee_payments FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Admins can manage all
CREATE POLICY "Admins can manage fee payments"
ON public.withdrawal_fee_payments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Moderators can view and update
CREATE POLICY "Moderators can view fee payments"
ON public.withdrawal_fee_payments FOR SELECT
USING (has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can update fee payments"
ON public.withdrawal_fee_payments FOR UPDATE
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_withdrawal_fee_payments_updated_at
BEFORE UPDATE ON public.withdrawal_fee_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
