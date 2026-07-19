
-- Paddle-specific columns on organizations (repurposing existing plan/status fields)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS paddle_price_id text,
  ADD COLUMN IF NOT EXISTS billing_environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orgs_paddle_sub ON public.organizations(paddle_subscription_id);

-- Feature-gate helper: is the org's subscription currently entitled?
CREATE OR REPLACE FUNCTION public.org_has_active_plan(_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org
      AND o.plan IN ('pro','business')
      AND (
        (o.subscription_status IN ('active','trialing','past_due')
          AND (o.current_period_end IS NULL OR o.current_period_end > now()))
        OR (o.subscription_status = 'canceled'
          AND o.current_period_end IS NOT NULL AND o.current_period_end > now())
      )
  );
$$;

-- Monthly quote counter increment (Free tier = 5/mo)
CREATE OR REPLACE FUNCTION public.increment_quote_usage(_org uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  period_start_val date := date_trunc('month', now())::date;
  new_count integer;
BEGIN
  INSERT INTO public.usage_counters (org_id, period_start, quotes_created, mi_refreshes)
    VALUES (_org, period_start_val, 1, 0)
  ON CONFLICT (org_id, period_start)
    DO UPDATE SET quotes_created = usage_counters.quotes_created + 1
  RETURNING quotes_created INTO new_count;
  RETURN new_count;
END $$;
