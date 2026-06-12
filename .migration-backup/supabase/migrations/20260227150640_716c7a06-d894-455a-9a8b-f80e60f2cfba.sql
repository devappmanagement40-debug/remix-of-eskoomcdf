-- Allow all authenticated users to read wheel_spins (for "Derniers gagnants")
CREATE POLICY "Authenticated users can read all spins"
ON public.wheel_spins
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create a function to get recent winners with masked phone numbers
CREATE OR REPLACE FUNCTION public.get_recent_winners(lim integer DEFAULT 30)
RETURNS TABLE(id uuid, prize_value numeric, prize_type text, prize_label text, vip_level integer, created_at timestamptz, masked_phone text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ws.id,
    ws.prize_value,
    ws.prize_type,
    ws.prize_label,
    ws.vip_level,
    ws.created_at,
    CASE 
      WHEN p.phone IS NULL OR length(p.phone) < 4 THEN '****'
      ELSE left(p.phone, 2) || '****' || right(p.phone, 4)
    END as masked_phone
  FROM wheel_spins ws
  LEFT JOIN profiles p ON p.user_id = ws.user_id
  ORDER BY ws.created_at DESC
  LIMIT lim;
$$;