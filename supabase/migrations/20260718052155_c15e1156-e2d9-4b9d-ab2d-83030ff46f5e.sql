
-- 1) Revoke public/anon execute on SECURITY DEFINER helpers; grant to authenticated only.
REVOKE EXECUTE ON FUNCTION public.has_org_access(uuid, public.org_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_org_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_org_access(uuid, public.org_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_org_ids() TO authenticated;

-- 2) Tighten invitation update policy (drop WITH CHECK (true))
DROP POLICY "Owners/admins/invitee update invite" ON public.invitations;
CREATE POLICY "Org staff modify invite" ON public.invitations FOR UPDATE TO authenticated
  USING (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_access(org_id, ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "Invitee accepts own invite" ON public.invitations FOR UPDATE TO authenticated
  USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
    AND accepted_at IS NULL AND expires_at > now())
  WITH CHECK (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
    AND accepted_at IS NOT NULL);

-- 3) Auto-provision a personal workspace on user signup + accept any pending invites
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_org uuid; base_slug text; final_slug text; n int := 0;
BEGIN
  base_slug := regexp_replace(lower(coalesce(split_part(NEW.email,'@',1),'user')), '[^a-z0-9]+','-','g');
  IF base_slug = '' THEN base_slug := 'workspace'; END IF;
  final_slug := base_slug;
  WHILE EXISTS(SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    n := n + 1; final_slug := base_slug || '-' || n;
  END LOOP;
  INSERT INTO public.organizations (name, slug, created_by, plan, subscription_status)
    VALUES (coalesce(split_part(NEW.email,'@',1),'My') || '''s workspace', final_slug, NEW.id, 'free', 'trialing')
    RETURNING id INTO new_org;
  INSERT INTO public.org_members (org_id, user_id, role) VALUES (new_org, NEW.id, 'owner');

  -- Auto-accept any pending invites for this email
  INSERT INTO public.org_members (org_id, user_id, role)
    SELECT org_id, NEW.id, role FROM public.invitations
    WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL AND expires_at > now()
    ON CONFLICT DO NOTHING;
  UPDATE public.invitations SET accepted_at = now()
    WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL AND expires_at > now();

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_org();
