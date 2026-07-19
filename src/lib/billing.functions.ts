import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPaddleClient, gatewayFetch, type PaddleEnv } from "@/lib/paddle.server";

async function getOrgForUser(supabase: any, orgId: string, userId: string) {
  // ensure caller is a member
  const { data: member } = await supabase
    .from("org_members").select("role").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
  if (!member) throw new Error("Not a member of this workspace");
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, plan, subscription_status, current_period_end, trial_ends_at, cancel_at_period_end, paddle_customer_id, paddle_subscription_id, paddle_price_id, billing_environment")
    .eq("id", orgId).maybeSingle();
  if (error || !org) throw error ?? new Error("Workspace not found");
  return { org, role: member.role as string };
}

export const getBillingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string }) => d)
  .handler(async ({ data, context }) => {
    const { org, role } = await getOrgForUser(context.supabase, data.orgId, context.userId);
    const env = (org.billing_environment as PaddleEnv) || "sandbox";

    let transactions: any[] = [];
    let subscription: any = null;
    if (org.paddle_customer_id) {
      try {
        const res = await gatewayFetch(env, `/transactions?customer_id=${encodeURIComponent(org.paddle_customer_id)}&per_page=50&order_by=billed_at[DESC]`);
        const json = await res.json();
        transactions = (json?.data ?? []).map((t: any) => ({
          id: t.id,
          status: t.status,
          currency: t.currency_code,
          total: t.details?.totals?.total ?? t.details?.totals?.grand_total ?? "0",
          billed_at: t.billed_at ?? t.created_at,
          invoice_number: t.invoice_number ?? null,
          invoice_url: null as string | null,
        }));
        // fetch invoice PDF url for billed/completed
        for (const t of transactions) {
          if (t.status === "billed" || t.status === "completed" || t.status === "paid") {
            try {
              const r = await gatewayFetch(env, `/transactions/${t.id}/invoice`);
              const j = await r.json();
              t.invoice_url = j?.data?.url ?? null;
            } catch {}
          }
        }
      } catch (e) {
        console.error("paddle tx fetch", e);
      }
    }
    if (org.paddle_subscription_id) {
      try {
        const res = await gatewayFetch(env, `/subscriptions/${org.paddle_subscription_id}`);
        const j = await res.json();
        subscription = j?.data ?? null;
      } catch (e) {
        console.error("paddle sub fetch", e);
      }
    }
    return { org, role, transactions, subscription, environment: env };
  });

export const openCustomerPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string }) => d)
  .handler(async ({ data, context }) => {
    const { org } = await getOrgForUser(context.supabase, data.orgId, context.userId);
    if (!org.paddle_customer_id) throw new Error("No billing account yet. Subscribe to a plan first.");
    const env = (org.billing_environment as PaddleEnv) || "sandbox";
    const paddle = getPaddleClient(env);
    const subs = org.paddle_subscription_id ? [org.paddle_subscription_id] : [];
    const portal = await paddle.customerPortalSessions.create(org.paddle_customer_id, subs);
    return { url: portal.urls.general.overview };
  });
