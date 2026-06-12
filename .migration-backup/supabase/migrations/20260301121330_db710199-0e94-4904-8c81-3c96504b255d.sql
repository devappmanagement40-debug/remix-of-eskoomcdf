
-- Ensure admin role exists for the admin user in LIVE
INSERT INTO public.user_roles (user_id, role)
VALUES ('258a9744-0f68-4351-87e3-ccc3396ca3c1', 'admin')
ON CONFLICT DO NOTHING;

-- Ensure essential countries exist
INSERT INTO public.countries (country_code, name, is_active, sort_order, phone_digits, flag_emoji)
VALUES 
  ('+226', 'Burkina Faso', true, 1, 8, '🇧🇫'),
  ('+225', 'Côte d''Ivoire', true, 2, 10, '🇨🇮'),
  ('+228', 'Togo', true, 3, 8, '🇹🇬'),
  ('+229', 'Bénin', true, 4, 8, '🇧🇯'),
  ('+221', 'Sénégal', true, 5, 9, '🇸🇳'),
  ('+237', 'Cameroun', true, 6, 9, '🇨🇲')
ON CONFLICT DO NOTHING;

-- Seed withdrawal methods linked to countries
-- We use a DO block to link by country_code
DO $$
DECLARE
  v_bf uuid; v_ci uuid; v_tg uuid; v_bj uuid; v_sn uuid; v_cm uuid;
BEGIN
  SELECT id INTO v_bf FROM countries WHERE country_code = '+226' LIMIT 1;
  SELECT id INTO v_ci FROM countries WHERE country_code = '+225' LIMIT 1;
  SELECT id INTO v_tg FROM countries WHERE country_code = '+228' LIMIT 1;
  SELECT id INTO v_bj FROM countries WHERE country_code = '+229' LIMIT 1;
  SELECT id INTO v_sn FROM countries WHERE country_code = '+221' LIMIT 1;
  SELECT id INTO v_cm FROM countries WHERE country_code = '+237' LIMIT 1;

  -- Only insert if no withdrawal_methods exist yet (avoid duplicates in TEST)
  IF NOT EXISTS (SELECT 1 FROM withdrawal_methods WHERE country_id IS NOT NULL LIMIT 1) THEN
    -- +225 Côte d'Ivoire
    INSERT INTO withdrawal_methods (name, country_id, is_active, sort_order) VALUES
      ('Wave', v_ci, true, 1),
      ('MTN Money', v_ci, true, 2),
      ('Orange Money', v_ci, true, 3);
    -- +226 Burkina Faso
    INSERT INTO withdrawal_methods (name, country_id, is_active, sort_order) VALUES
      ('Orange Money', v_bf, true, 1),
      ('Wave', v_bf, true, 2);
    -- +228 Togo
    INSERT INTO withdrawal_methods (name, country_id, is_active, sort_order) VALUES
      ('T-Money', v_tg, true, 1),
      ('Moov Money', v_tg, true, 2);
    -- +229 Bénin
    INSERT INTO withdrawal_methods (name, country_id, is_active, sort_order) VALUES
      ('MTN Money Bénin', v_bj, true, 1),
      ('Moov Money Bénin', v_bj, true, 2);
    -- +221 Sénégal
    INSERT INTO withdrawal_methods (name, country_id, is_active, sort_order) VALUES
      ('Orange Money', v_sn, true, 1),
      ('Wave', v_sn, true, 2);
    -- +237 Cameroun
    INSERT INTO withdrawal_methods (name, country_id, is_active, sort_order) VALUES
      ('Orange Money Cameroun', v_cm, true, 1),
      ('MTN Money Cameroun', v_cm, true, 2);
  END IF;
END $$;

-- Ensure essential site_settings exist
INSERT INTO public.site_settings (key, value, category)
VALUES 
  ('deposit_not_withdrawable', 'true', 'finance'),
  ('sarah_enabled', 'true', 'support')
ON CONFLICT DO NOTHING;
