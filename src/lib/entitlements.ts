import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getPaddleEnvironment } from "@/lib/paddle";

export type Plan = "free" | "pro" | "business";

export interface OrgEntitlements {
  orgId: string;
  plan: Plan;
  status: string;
  isActive: boolean; // in trial, active, or grace period after cancel
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  quotesUsedThisMonth: number;
  limits: {
    quotesPerMonth: number | null; // null = unlimited
    users: number;
    watermarkedPdfs: boolean;
    marketIntelligence: boolean;
    buyerIntelligence: boolean;
    apiAccess: boolean;
    auditExport: boolean;
  };
}

const PLAN_LIMITS: Record<Plan, OrgEntitlements["limits"]> = {
  free: {
    quotesPerMonth: 5,
    users: 1,
    watermarkedPdfs: true,
    marketIntelligence: false,
    buyerIntelligence: false,
    apiAccess: false,
    auditExport: false,
  },
  pro: {
    quotesPerMonth: 100,
    users: 3,
    watermarkedPdfs: false,
    marketIntelligence: true,
    buyerIntelligence: true,
    apiAccess: false,
    auditExport: false,
  },
  business: {
    quotesPerMonth: null,
    users: 15,
    watermarkedPdfs: false,
    marketIntelligence: true,
    buyerIntelligence: true,
    apiAccess: true,
    auditExport: true,
  },
};

async function fetchEntitlements(orgId: string): Promise<OrgEntitlements> {
  const env = getPaddleEnvironment();
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, plan, subscription_status, trial_ends_at, current_period_end, cancel_at_period_end, billing_environment")
    .eq("id", orgId)
    .maybeSingle();
  if (error || !org) throw error ?? new Error("Organization not found");

  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);
  const { data: usage } = await supabase
    .from("usage_counters")
    .select("quotes_created")
    .eq("org_id", orgId)
    .eq("period_start", periodStart.toISOString().slice(0, 10))
    .maybeSingle();

  const now = Date.now();
  const periodEndTs = org.current_period_end ? new Date(org.current_period_end).getTime() : null;
  const trialEndTs = org.trial_ends_at ? new Date(org.trial_ends_at).getTime() : null;

  // Only honor a paid plan when the subscription was created in the current
  // client environment (test vs live) — prevents test subs from unlocking live.
  const envMatches = !org.billing_environment || org.billing_environment === env;
  let effectivePlan: Plan = envMatches ? ((org.plan as Plan) ?? "free") : "free";

  const status = String(org.subscription_status ?? "inactive");
  const trialing = status === "trialing" && trialEndTs && trialEndTs > now;
  const active = ["active", "trialing", "past_due"].includes(status) && (!periodEndTs || periodEndTs > now);
  const grace = status === "canceled" && periodEndTs && periodEndTs > now;
  const isActive = Boolean(trialing || active || grace);

  if (!isActive) effectivePlan = "free";

  return {
    orgId: org.id as string,
    plan: effectivePlan,
    status,
    isActive,
    cancelAtPeriodEnd: Boolean(org.cancel_at_period_end),
    currentPeriodEnd: org.current_period_end,
    trialEndsAt: org.trial_ends_at,
    quotesUsedThisMonth: usage?.quotes_created ?? 0,
    limits: PLAN_LIMITS[effectivePlan],
  };
}

export function useEntitlements(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["entitlements", orgId],
    queryFn: () => fetchEntitlements(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

export function canUse(
  ent: OrgEntitlements | undefined,
  feature: keyof OrgEntitlements["limits"],
): boolean {
  if (!ent) return false;
  const v = ent.limits[feature];
  if (typeof v === "boolean") return feature === "watermarkedPdfs" ? !v : v;
  return true;
}

export function canCreateQuote(ent: OrgEntitlements | undefined): boolean {
  if (!ent) return false;
  const limit = ent.limits.quotesPerMonth;
  if (limit == null) return true;
  return ent.quotesUsedThisMonth < limit;
}
