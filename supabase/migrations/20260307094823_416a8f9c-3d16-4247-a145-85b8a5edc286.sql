-- Add Togo to countries
INSERT INTO countries (name, country_code, flag_emoji, phone_digits, is_active, sort_order, api_enabled)
VALUES ('Togo', '+228', '🇹🇬', 8, true, 5, true);

-- Link TMONEY to Togo
UPDATE payment_methods 
SET country_id = (SELECT id FROM countries WHERE country_code = '+228' LIMIT 1)
WHERE id = '2e569a04-5291-460a-93c5-cf14f9ae6276';