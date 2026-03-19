
INSERT INTO public.site_settings (key, value, category)
VALUES ('withdrawal_mode_auto', 'true', 'withdrawals')
ON CONFLICT (key) DO NOTHING;
