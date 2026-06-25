-- App settings: one row per user
CREATE TABLE public.app_settings (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own settings" ON public.app_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own settings" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own settings" ON public.app_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own settings" ON public.app_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Saved quotation snapshots
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quotation_number TEXT,
  buyer_company TEXT,
  product_name TEXT,
  quantity NUMERIC,
  uom TEXT,
  contract_currency TEXT,
  unit_price NUMERIC,
  total_contract_value NUMERIC,
  net_profit_inr NUMERIC,
  profit_pct NUMERIC,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX quotes_user_saved_at_idx ON public.quotes (user_id, saved_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own quotes" ON public.quotes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own quotes" ON public.quotes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own quotes" ON public.quotes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own quotes" ON public.quotes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Auto update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();