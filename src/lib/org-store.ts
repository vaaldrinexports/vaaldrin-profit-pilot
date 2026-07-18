import { supabase } from "@/integrations/supabase/client";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member" | "viewer";
  plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
}

const CURRENT_ORG_KEY = "vaaldrin.currentOrgId";

export function getCurrentOrgIdCached(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CURRENT_ORG_KEY);
}

export function setCurrentOrgId(orgId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENT_ORG_KEY, orgId);
}

export async function listMyOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from("org_members")
    .select("role, organizations!inner(id,name,slug,plan,subscription_status,trial_ends_at)")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listMyOrganizations", error);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    id: r.organizations.id,
    name: r.organizations.name,
    slug: r.organizations.slug,
    role: r.role,
    plan: r.organizations.plan,
    subscription_status: r.organizations.subscription_status,
    trial_ends_at: r.organizations.trial_ends_at,
  }));
}

/** Resolves current org: cached choice if still a member, else first membership. */
export async function resolveCurrentOrgId(): Promise<string | null> {
  const orgs = await listMyOrganizations();
  if (orgs.length === 0) return null;
  const cached = getCurrentOrgIdCached();
  if (cached && orgs.some((o) => o.id === cached)) return cached;
  setCurrentOrgId(orgs[0].id);
  return orgs[0].id;
}

export async function requireCurrentOrgId(): Promise<string> {
  const id = await resolveCurrentOrgId();
  if (!id) throw new Error("No workspace found for this user");
  return id;
}
