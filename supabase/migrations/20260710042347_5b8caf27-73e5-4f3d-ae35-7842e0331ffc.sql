
-- Phase 2: Market Intelligence data health + dedupe indexes
CREATE TABLE IF NOT EXISTS public.mi_source_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_key TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  category TEXT NOT NULL,
  data_type TEXT NOT NULL,
  refresh_interval_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_success_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  records_last_run INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mi_source_health TO authenticated;
GRANT ALL ON public.mi_source_health TO service_role;
ALTER TABLE public.mi_source_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_health" ON public.mi_source_health FOR SELECT TO authenticated USING (true);

CREATE TRIGGER mi_source_health_updated
BEFORE UPDATE ON public.mi_source_health
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- dedupe news by url
CREATE UNIQUE INDEX IF NOT EXISTS mi_news_url_unique ON public.mi_news (url) WHERE url IS NOT NULL;

-- speed up latest-signal lookups
CREATE INDEX IF NOT EXISTS mi_signals_lookup_idx ON public.mi_signals (signal_type, product_id, country_iso2, captured_at DESC);

-- Seed source registry
INSERT INTO public.mi_source_health (source_key, source_name, category, data_type, refresh_interval_minutes) VALUES
  ('fx.erapi',          'open.er-api.com',           'exchange_rate',  'live',              15),
  ('news.google',       'Google News RSS',           'news',           'live',              30),
  ('weather.open-meteo','Open-Meteo',                'weather',        'live',              360),
  ('trends.google',     'Google Trends (via RSS)',   'search_trend',   'live',              720),
  ('commodity.apeda',   'APEDA AgriExchange',        'commodity_price','latest_available',  1440),
  ('commodity.spiceboard','Indian Spices Board',     'commodity_price','latest_available',  1440),
  ('regulations.dgft',  'DGFT Notifications',        'regulation',     'latest_available',  720),
  ('trade.comtrade',    'UN Comtrade',               'trade_stats',    'historical_official',10080)
ON CONFLICT (source_key) DO NOTHING;
