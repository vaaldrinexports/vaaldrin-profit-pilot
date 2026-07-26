-- 1) Remove public (anon) SELECT policies on MI tables; keep authenticated policies intact.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mi_source_health','mi_products','mi_scores','mi_news','mi_countries','mi_signals']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public MI read" ON public.%I', t);
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
  END LOOP;
END $$;

-- 2) Revoke EXECUTE on SECURITY DEFINER helper functions from anon and authenticated.
--    These are called only from other SECURITY DEFINER contexts / triggers / server-side code.
REVOKE EXECUTE ON FUNCTION public.has_org_access(uuid, public.org_role[]) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.org_has_active_plan(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_org_ids() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_quote_usage(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_org() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- 3) Unschedule the previously-scheduled market-intelligence cron job.
--    The referenced endpoint no longer exists and the hardcoded secret in the
--    original migration has been rotated, so the job cannot be reused.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-market-intelligence') THEN
    PERFORM cron.unschedule('refresh-market-intelligence');
  END IF;
END $$;