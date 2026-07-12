
INSERT INTO public.mi_source_health (source_key, source_name, category, data_type, refresh_interval_minutes, status)
VALUES ('discovery.trends', 'Product Discovery Engine', 'discovery', 'live', 360, 'pending')
ON CONFLICT (source_key) DO NOTHING;
