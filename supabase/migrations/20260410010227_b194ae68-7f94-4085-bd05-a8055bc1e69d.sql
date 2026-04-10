
CREATE TABLE public.raw_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  material_name text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL DEFAULT 'Kilos',
  sack_count numeric NULL,
  kilos_per_sack numeric NULL,
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to raw_materials"
  ON public.raw_materials
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
