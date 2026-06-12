
CREATE TABLE public.omnipay_callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid REFERENCES public.withdrawals(id) ON DELETE SET NULL,
  reference text NOT NULL,
  omnipay_id text,
  status_code text,
  status_result text NOT NULL,
  message text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.omnipay_callbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage callbacks" ON public.omnipay_callbacks FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
