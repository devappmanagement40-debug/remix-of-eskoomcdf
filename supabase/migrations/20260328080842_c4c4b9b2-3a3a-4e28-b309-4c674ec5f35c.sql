DELETE FROM chat_messages WHERE is_ai = true AND ((message ILIKE '%35\%%' AND (message ILIKE '%solde de gains%' OR message ILIKE '%retrait%' OR message ILIKE '%réinvest%')) OR (message ILIKE '%frais de traitement%' AND message ILIKE '%retrait%') OR (message ILIKE '%65\%%' AND message ILIKE '%solde de gains%'));

UPDATE site_settings SET value = '0' WHERE key = 'withdrawal_processing_fee_percent';