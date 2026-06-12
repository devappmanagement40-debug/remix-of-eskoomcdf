-- Enable realtime for tables not yet added
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'withdrawals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_products') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_products;
  END IF;
END $$;
