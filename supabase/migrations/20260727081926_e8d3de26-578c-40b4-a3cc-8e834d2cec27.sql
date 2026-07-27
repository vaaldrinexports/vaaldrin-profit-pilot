DROP POLICY IF EXISTS "Owners/admins add members" ON public.org_members;

CREATE POLICY "Owners/admins add members"
ON public.org_members
FOR INSERT
TO authenticated
WITH CHECK (public.has_org_access(org_id, ARRAY['owner'::org_role, 'admin'::org_role]));

DROP POLICY IF EXISTS "Owners/admins remove members" ON public.org_members;

CREATE POLICY "Owners/admins remove members"
ON public.org_members
FOR DELETE
TO authenticated
USING (
  public.has_org_access(org_id, ARRAY['owner'::org_role, 'admin'::org_role])
  OR (
    user_id = auth.uid()
    AND role <> 'owner'::org_role
  )
);