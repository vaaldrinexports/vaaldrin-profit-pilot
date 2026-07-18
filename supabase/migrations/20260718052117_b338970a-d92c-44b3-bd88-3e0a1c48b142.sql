
-- =========================================================
-- PHASE 1: Multi-tenant SaaS foundation
-- =========================================================

-- Role enum
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'business', 'enterprise');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'paused');

-- ---------- organizations ----------
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  plan public.subscription_plan NOT NULL DEFAULT 'free',
  subscription_status public.subscription_status NOT NULL DEFAULT 'trialing',
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  current_period_end timestamptz,
  company_gstin text,
  company_address text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- org_members ----------
CREATE TABLE public.org_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX org_members_user_idx ON public.org_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_members TO authenticated;
GRANT ALL ON public.org_members TO service_role;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- ---------- invitations ----------
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);
CREATE INDEX invitations_email_idx ON public.invitations(lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ---------- platform_admins ----------
CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- ---------- usage_counters ----------
CREATE TABLE public.usage_counters (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  quotes_created int NOT NULL DEFAULT 0,
  mi_refreshes int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, period_start)
);
GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- ---------- Security definer helpers (prevent RLS recursion) ----------
CREATE OR REPLACE FUNCTION public.has_org_access(_org uuid, _roles public.org_role[] DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.org_members
    WHERE org_id = _org AND user_id = auth.uid()
      AND (_roles IS NULL OR role = ANY(_roles))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.my_org_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.org_members WHERE user_id = auth.uid();
$$;

-- ---------- Policies: organizations ----------
CREATE POLICY "Members read their orgs" ON public.organizations FOR SELECT TO authenticated
  USING (public.has_org_access(id) OR public.is_platform_admin());
CREATE POLICY "Authenticated create orgs" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners/admins update org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_access(id, ARRAY['owner','admin']::public.org_role[]) OR public.is_platform_admin())
  WITH CHECK (public.has_org_access(id, ARRAY['owner','admin']::public.org_role[]) OR public.is_platform_admin());
CREATE POLICY "Owners delete org" ON public.organizations FOR DELETE TO authenticated
  USING (public.has_org_access(id, ARRAY['owner']::public.org_role[]) OR public.is_platform_admin());

-- ---------- Policies: org_members ----------
CREATE POLICY "Members read own memberships" ON public.org_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_org_access(org_id) OR public.is_platform_admin());
CREATE POLICY "Owners/admins add members" ON public.org_members FOR INSERT TO authenticated
  WITH CHECK (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]) OR user_id = auth.uid());
CREATE POLICY "Owners/admins update roles" ON public.org_members FOR UPDATE TO authenticated
  USING (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "Owners/admins remove members" ON public.org_members FOR DELETE TO authenticated
  USING (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]) OR user_id = auth.uid());

-- ---------- Policies: invitations ----------
CREATE POLICY "Org staff read invites" ON public.invitations FOR SELECT TO authenticated
  USING (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[])
    OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));
CREATE POLICY "Owners/admins create invites" ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "Owners/admins/invitee update invite" ON public.invitations FOR UPDATE TO authenticated
  USING (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[])
    OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())))
  WITH CHECK (true);
CREATE POLICY "Owners/admins delete invite" ON public.invitations FOR DELETE TO authenticated
  USING (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]));

-- ---------- Policies: platform_admins ----------
CREATE POLICY "Admins read admin list" ON public.platform_admins FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- ---------- Policies: usage_counters ----------
CREATE POLICY "Members read own usage" ON public.usage_counters FOR SELECT TO authenticated
  USING (public.has_org_access(org_id) OR public.is_platform_admin());

-- =========================================================
-- Add org_id to existing tenant tables
-- =========================================================

ALTER TABLE public.quotes ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.app_settings ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.audit_log ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- MI tables (shared globally today) get an optional org_id for future per-org caching
ALTER TABLE public.mi_countries ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.mi_products ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.mi_signals ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.mi_scores ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.mi_news ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.mi_source_health ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- =========================================================
-- Backfill: personal org per existing user
-- =========================================================

DO $$
DECLARE u RECORD; new_org uuid; base_slug text; final_slug text; n int;
BEGIN
  FOR u IN SELECT id, email FROM auth.users LOOP
    base_slug := regexp_replace(lower(coalesce(split_part(u.email,'@',1),'user')), '[^a-z0-9]+','-','g');
    final_slug := base_slug; n := 0;
    WHILE EXISTS(SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
      n := n + 1; final_slug := base_slug || '-' || n;
    END LOOP;
    INSERT INTO public.organizations (name, slug, created_by, plan, subscription_status)
      VALUES (coalesce(split_part(u.email,'@',1),'My workspace') || '''s workspace', final_slug, u.id, 'free', 'trialing')
      RETURNING id INTO new_org;
    INSERT INTO public.org_members (org_id, user_id, role) VALUES (new_org, u.id, 'owner');
    UPDATE public.quotes SET org_id = new_org WHERE user_id = u.id AND org_id IS NULL;
    UPDATE public.app_settings SET org_id = new_org WHERE user_id = u.id AND org_id IS NULL;
    UPDATE public.audit_log SET org_id = new_org WHERE user_id = u.id AND org_id IS NULL;
  END LOOP;
END $$;

-- Shared MI workspace so cached market intel remains visible during transition
DO $$
DECLARE mi_org uuid;
BEGIN
  INSERT INTO public.organizations (name, slug, plan, subscription_status)
    VALUES ('Vaaldrin Global (shared MI cache)', 'vaaldrin-global', 'enterprise', 'active')
    RETURNING id INTO mi_org;
  UPDATE public.mi_countries SET org_id = mi_org WHERE org_id IS NULL;
  UPDATE public.mi_products SET org_id = mi_org WHERE org_id IS NULL;
  UPDATE public.mi_signals SET org_id = mi_org WHERE org_id IS NULL;
  UPDATE public.mi_scores SET org_id = mi_org WHERE org_id IS NULL;
  UPDATE public.mi_news SET org_id = mi_org WHERE org_id IS NULL;
  UPDATE public.mi_source_health SET org_id = mi_org WHERE org_id IS NULL;
END $$;

-- Now enforce NOT NULL on tenant tables (quotes/app_settings/mi_*). Audit log stays nullable.
ALTER TABLE public.quotes ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.app_settings ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.mi_countries ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.mi_products ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.mi_signals ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.mi_scores ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.mi_news ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.mi_source_health ALTER COLUMN org_id SET NOT NULL;

-- Drop the per-user PK on app_settings so each org has one settings row (keep user_id for auditing who wrote it)
ALTER TABLE public.app_settings DROP CONSTRAINT app_settings_pkey;
ALTER TABLE public.app_settings ADD PRIMARY KEY (org_id);

-- Indexes
CREATE INDEX quotes_org_saved_at_idx ON public.quotes(org_id, saved_at DESC);
CREATE INDEX audit_log_org_created_idx ON public.audit_log(org_id, created_at DESC);
CREATE INDEX mi_scores_org_idx ON public.mi_scores(org_id);
CREATE INDEX mi_signals_org_idx ON public.mi_signals(org_id);

-- =========================================================
-- Replace legacy per-user RLS with org-scoped policies
-- =========================================================

-- quotes
DROP POLICY "Users delete own quotes" ON public.quotes;
DROP POLICY "Users insert own quotes" ON public.quotes;
DROP POLICY "Users read own quotes" ON public.quotes;
DROP POLICY "Users update own quotes" ON public.quotes;
CREATE POLICY "Org members read quotes" ON public.quotes FOR SELECT TO authenticated
  USING (public.has_org_access(org_id) OR public.is_platform_admin());
CREATE POLICY "Org editors insert quotes" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (public.has_org_access(org_id, ARRAY['owner','admin','member']::public.org_role[]) AND user_id = auth.uid());
CREATE POLICY "Org editors update quotes" ON public.quotes FOR UPDATE TO authenticated
  USING (public.has_org_access(org_id, ARRAY['owner','admin','member']::public.org_role[]))
  WITH CHECK (public.has_org_access(org_id, ARRAY['owner','admin','member']::public.org_role[]));
CREATE POLICY "Org editors delete quotes" ON public.quotes FOR DELETE TO authenticated
  USING (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]));

-- app_settings
DROP POLICY "Users delete own settings" ON public.app_settings;
DROP POLICY "Users insert own settings" ON public.app_settings;
DROP POLICY "Users read own settings" ON public.app_settings;
DROP POLICY "Users update own settings" ON public.app_settings;
CREATE POLICY "Org members read settings" ON public.app_settings FOR SELECT TO authenticated
  USING (public.has_org_access(org_id) OR public.is_platform_admin());
CREATE POLICY "Org admins write settings" ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "Org admins update settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]));

-- audit_log
DROP POLICY "Users insert own audit rows" ON public.audit_log;
DROP POLICY "Users read own audit rows" ON public.audit_log;
CREATE POLICY "Org admins read audit" ON public.audit_log FOR SELECT TO authenticated
  USING ((org_id IS NOT NULL AND public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]))
    OR user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "Members append audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (org_id IS NULL OR public.has_org_access(org_id)));

-- MI tables (drop existing anon-open policies and replace with org-scoped + platform-admin read)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
    WHERE schemaname='public' AND tablename LIKE 'mi_%'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "Org or global MI read (countries)" ON public.mi_countries FOR SELECT TO authenticated
  USING (public.has_org_access(org_id) OR public.is_platform_admin()
    OR org_id = (SELECT id FROM public.organizations WHERE slug='vaaldrin-global'));
CREATE POLICY "Org or global MI read (products)" ON public.mi_products FOR SELECT TO authenticated
  USING (public.has_org_access(org_id) OR public.is_platform_admin()
    OR org_id = (SELECT id FROM public.organizations WHERE slug='vaaldrin-global'));
CREATE POLICY "Org or global MI read (signals)" ON public.mi_signals FOR SELECT TO authenticated
  USING (public.has_org_access(org_id) OR public.is_platform_admin()
    OR org_id = (SELECT id FROM public.organizations WHERE slug='vaaldrin-global'));
CREATE POLICY "Org or global MI read (scores)" ON public.mi_scores FOR SELECT TO authenticated
  USING (public.has_org_access(org_id) OR public.is_platform_admin()
    OR org_id = (SELECT id FROM public.organizations WHERE slug='vaaldrin-global'));
CREATE POLICY "Org or global MI read (news)" ON public.mi_news FOR SELECT TO authenticated
  USING (public.has_org_access(org_id) OR public.is_platform_admin()
    OR org_id = (SELECT id FROM public.organizations WHERE slug='vaaldrin-global'));
CREATE POLICY "Org or global MI read (health)" ON public.mi_source_health FOR SELECT TO authenticated
  USING (public.has_org_access(org_id) OR public.is_platform_admin()
    OR org_id = (SELECT id FROM public.organizations WHERE slug='vaaldrin-global'));
