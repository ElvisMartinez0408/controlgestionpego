-- Stock manual de producto terminado (sacos)
CREATE TABLE public.finished_product_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL UNIQUE,
  stock numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.finished_product_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to finished_product_stock" ON public.finished_product_stock FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.finished_product_stock (product_name, stock) VALUES
  ('Pego Gris', 0),
  ('Pego Blanco', 0),
  ('Pego Premium', 0);

-- Insumos personalizados con umbral de alerta
CREATE TABLE public.custom_supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'Kilos',
  alert_threshold numeric NOT NULL DEFAULT 0,
  current_quantity numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_supplies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to custom_supplies" ON public.custom_supplies FOR ALL USING (true) WITH CHECK (true);