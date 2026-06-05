
-- Restore anon access to all data tables so the app works across all devices/browsers
-- (App uses PIN-based gating on the client; no Supabase Auth sessions)

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'attendance_records','custom_supplies','employees','finished_product_stock',
    'material_stock','production_records','raw_materials','sale_records'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);

    -- Drop old authenticated-only policy if present, replace with public policy
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated full access to %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all access to %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Public full access to %s" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
