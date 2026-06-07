CREATE TABLE IF NOT EXISTS public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'amber',
  pinned boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO anon, authenticated;
GRANT ALL ON public.notes TO service_role;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access to notes" ON public.notes
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;

-- Seed the three finished product rows so updates persist correctly
INSERT INTO public.finished_product_stock (product_name, stock)
VALUES ('Pego Gris', 0), ('Pego Blanco', 0), ('Pego Premium', 0)
ON CONFLICT DO NOTHING;