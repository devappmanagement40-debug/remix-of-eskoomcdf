
-- Add phone_digits column to countries table for dynamic validation
ALTER TABLE public.countries ADD COLUMN phone_digits integer DEFAULT 8;
ALTER TABLE public.countries ADD COLUMN validation_enabled boolean DEFAULT true;

-- Update existing countries with correct digit counts
UPDATE public.countries SET phone_digits = 8 WHERE country_code = '+226'; -- Burkina Faso
UPDATE public.countries SET phone_digits = 10 WHERE country_code = '+225'; -- Côte d'Ivoire
UPDATE public.countries SET phone_digits = 8 WHERE country_code = '+223'; -- Mali
UPDATE public.countries SET phone_digits = 9 WHERE country_code = '+221'; -- Sénégal
UPDATE public.countries SET phone_digits = 8 WHERE country_code = '+228'; -- Togo
UPDATE public.countries SET phone_digits = 8 WHERE country_code = '+229'; -- Bénin
UPDATE public.countries SET phone_digits = 8 WHERE country_code = '+227'; -- Niger
UPDATE public.countries SET phone_digits = 9 WHERE country_code = '+224'; -- Guinée
UPDATE public.countries SET phone_digits = 9 WHERE country_code = '+237'; -- Cameroun
UPDATE public.countries SET phone_digits = 9 WHERE country_code = '+243'; -- RD Congo
