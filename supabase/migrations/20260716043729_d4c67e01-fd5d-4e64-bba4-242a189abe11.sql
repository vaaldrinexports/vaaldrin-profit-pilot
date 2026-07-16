CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule for this job so re-runs are idempotent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-market-intelligence') THEN
    PERFORM cron.unschedule('refresh-market-intelligence');
  END IF;
END $$;

SELECT cron.schedule(
  'refresh-market-intelligence',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--39633084-6c51-41f2-b98f-11012526b200.lovable.app/api/public/hooks/refresh-mi',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "e6K4vN9Xr2LpQ8mTf7ZaHs3Wd1CyBu5JkR0nPm4Yq8Ex6Sv9"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);