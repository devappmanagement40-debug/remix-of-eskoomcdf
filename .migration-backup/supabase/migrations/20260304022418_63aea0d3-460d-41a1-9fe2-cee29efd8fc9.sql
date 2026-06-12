UPDATE payment_api_configs 
SET callback_url = 'https://vigdgbydpumkauibuxmn.supabase.co/functions/v1/sendavapay-webhook' 
WHERE provider = 'sendavapay';