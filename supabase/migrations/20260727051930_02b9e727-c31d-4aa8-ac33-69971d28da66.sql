DROP POLICY IF EXISTS "Owners/admins manage members" ON public.org_members;
DROP POLICY IF EXISTS "Members insert" ON public.org_members;
DROP POLICY IF EXISTS "org_members_insert" ON public.org_members;
DROP POLICY IF EXISTS "Insert members" ON public.org_members;

CREATE POLICY "org_members_insert_guarded"
ON public.org_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_org_access(org_id, ARRAY['owner','admin']::org_role[])
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.org_id = org_members.org_id
        AND lower(i.email) = lower((SELECT u.email FROM auth.users u WHERE u.id = auth.uid()))
        AND i.expires_at > now()
        AND i.role = org_members.role
    )
  )
);