ALTER TABLE public.material_stock REPLICA IDENTITY FULL;
ALTER TABLE public.finished_product_stock REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.material_stock; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.finished_product_stock; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;