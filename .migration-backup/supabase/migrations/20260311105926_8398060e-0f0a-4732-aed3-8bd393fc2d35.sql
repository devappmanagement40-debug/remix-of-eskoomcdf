ALTER TABLE public.products ADD COLUMN stock_status text NOT NULL DEFAULT 'available';
COMMENT ON COLUMN public.products.stock_status IS 'Product stock status: available, sold_out, terminated';