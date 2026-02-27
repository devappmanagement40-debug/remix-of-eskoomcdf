
-- Product series (categories/tabs)
CREATE TABLE public.product_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT 'primary',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_series ENABLE ROW LEVEL SECURITY;

-- Everyone can view series
CREATE POLICY "Anyone can view series" ON public.product_series FOR SELECT USING (true);
CREATE POLICY "Admins can insert series" ON public.product_series FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update series" ON public.product_series FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete series" ON public.product_series FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Products within series
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES public.product_series(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  image_url text,
  return_percent numeric DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  daily_revenue numeric DEFAULT 0,
  cycles integer DEFAULT 365,
  price numeric DEFAULT 0,
  is_new boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
