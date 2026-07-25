
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mi_products','mi_countries','mi_signals','mi_scores','mi_news','mi_source_health']
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public MI read" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Public MI read" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;
