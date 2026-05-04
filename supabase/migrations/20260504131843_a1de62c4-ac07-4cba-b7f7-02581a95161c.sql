-- Stock centralizado por material/insumo (unidad base canónica)
CREATE TABLE public.material_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_name text NOT NULL UNIQUE,
  stock numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'Kilos',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.material_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to material_stock" ON public.material_stock FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.material_stock (material_name, stock, unit) VALUES
  ('Arena', 0, 'Kilos'),
  ('Cemento Gris', 0, 'Kilos'),
  ('Cemento Blanco', 0, 'Kilos'),
  ('Celulosa', 0, 'Kilos'),
  ('Silicón', 0, 'Kilos'),
  ('Redispersable', 0, 'Kilos'),
  ('Bobina de Envoplast', 0, 'Kilos'),
  ('Bolsa Gris', 0, 'Unidades'),
  ('Bolsa Blanco', 0, 'Unidades'),
  ('Bolsa Premium', 0, 'Unidades');

-- Estado de jornada (bitácora de incidencias) en cada lote de producción
ALTER TABLE public.production_records
  ADD COLUMN shift_status text NOT NULL DEFAULT 'Normal';