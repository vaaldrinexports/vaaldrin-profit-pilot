
CREATE TABLE public.mi_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  hs_code text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mi_products TO authenticated;
GRANT ALL ON public.mi_products TO service_role;
ALTER TABLE public.mi_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read products" ON public.mi_products FOR SELECT TO authenticated USING (true);

CREATE TABLE public.mi_countries (
  iso2 text PRIMARY KEY,
  name text NOT NULL,
  region text,
  currency text
);
GRANT SELECT ON public.mi_countries TO authenticated;
GRANT ALL ON public.mi_countries TO service_role;
ALTER TABLE public.mi_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read countries" ON public.mi_countries FOR SELECT TO authenticated USING (true);

CREATE TABLE public.mi_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.mi_products(id) ON DELETE CASCADE,
  country_iso2 text REFERENCES public.mi_countries(iso2) ON DELETE CASCADE,
  signal_type text NOT NULL,
  value numeric,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  source_url text,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mi_signals_pc ON public.mi_signals(product_id, country_iso2, captured_at DESC);
GRANT SELECT ON public.mi_signals TO authenticated;
GRANT ALL ON public.mi_signals TO service_role;
ALTER TABLE public.mi_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read signals" ON public.mi_signals FOR SELECT TO authenticated USING (true);

CREATE TABLE public.mi_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.mi_products(id) ON DELETE CASCADE,
  country_iso2 text REFERENCES public.mi_countries(iso2) ON DELETE CASCADE,
  demand_score numeric,
  opportunity_score numeric,
  competition text,
  price_trend text,
  avg_price_usd numeric,
  supply_situation text,
  ai_recommendation text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, country_iso2)
);
CREATE INDEX mi_scores_product ON public.mi_scores(product_id);
GRANT SELECT ON public.mi_scores TO authenticated;
GRANT ALL ON public.mi_scores TO service_role;
ALTER TABLE public.mi_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read scores" ON public.mi_scores FOR SELECT TO authenticated USING (true);

CREATE TABLE public.mi_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.mi_products(id) ON DELETE CASCADE,
  country_iso2 text REFERENCES public.mi_countries(iso2) ON DELETE CASCADE,
  headline text NOT NULL,
  url text,
  source text,
  sentiment text,
  summary text,
  published_at timestamptz,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mi_news_published ON public.mi_news(published_at DESC);
GRANT SELECT ON public.mi_news TO authenticated;
GRANT ALL ON public.mi_news TO service_role;
ALTER TABLE public.mi_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read news" ON public.mi_news FOR SELECT TO authenticated USING (true);
