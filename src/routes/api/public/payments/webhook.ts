import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";
import type { Database } from "@/integrations/supabase/types";

let _supabase: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function planFromProductId(productExternalId: string): "free" | "pro" | "business" {
  if (productExternalId === "pro_plan") return "pro";
  if (productExternalId === "business_plan") return "business";
  return "free";
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;
  const orgId = customData?.orgId;
  if (!orgId) {
    console.error("[paddle webhook] subscription.created missing customData.orgId");
    return;
  }
  const item = items?.[0];
  const priceExternalId = item?.price?.importMeta?.externalId;
  const productExternalId = item?.product?.importMeta?.externalId;
  if (!priceExternalId || !productExternalId) {
    console.warn("[paddle webhook] missing importMeta.externalId", {
      rawPriceId: item?.price?.id,
      rawProductId: item?.product?.id,
    });
    return;
  }

  const plan = planFromProductId(productExternalId);
  const supabase = getSupabase();
  const { error } = await supabase
    .from("organizations")
    .update({
      plan,
      subscription_status: status,
      paddle_customer_id: customerId,
      paddle_subscription_id: id,
      paddle_price_id: priceExternalId,
      billing_environment: env,
      current_period_end: currentBillingPeriod?.endsAt ?? null,
      cancel_at_period_end: false,
      trial_ends_at: null,
    })
    .eq("id", orgId);
  if (error) console.error("[paddle webhook] update org failed", error);
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items } = data;
  const item = items?.[0];
  const priceExternalId = item?.price?.importMeta?.externalId;
  const productExternalId = item?.product?.importMeta?.externalId;

  const patch: Database["public"]["Tables"]["organizations"]["Update"] = {
    subscription_status: status,
    current_period_end: currentBillingPeriod?.endsAt ?? null,
    cancel_at_period_end: scheduledChange?.action === "cancel",
  };
  if (productExternalId) patch.plan = planFromProductId(productExternalId);
  if (priceExternalId) patch.paddle_price_id = priceExternalId;

  const supabase = getSupabase();
  const { error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("paddle_subscription_id", id)
    .eq("billing_environment", env);
  if (error) console.error("[paddle webhook] update org (updated) failed", error);
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  // Keep access until current_period_end; a nightly job or the next load-time
  // check demotes to Free once the period passes.
  const supabase = getSupabase();
  const { error } = await supabase
    .from("organizations")
    .update({
      subscription_status: "canceled",
      cancel_at_period_end: true,
      current_period_end: data.currentBillingPeriod?.endsAt ?? data.canceledAt ?? null,
    })
    .eq("paddle_subscription_id", data.id)
    .eq("billing_environment", env);
  if (error) console.error("[paddle webhook] cancel failed", error);
}

async function handleTransactionPaymentFailed(data: any, env: PaddleEnv) {
  const subId = data.subscriptionId;
  if (!subId) return;
  const supabase = getSupabase();
  await supabase
    .from("organizations")
    .update({ subscription_status: "past_due" })
    .eq("paddle_subscription_id", subId)
    .eq("billing_environment", env);
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case EventName.TransactionPaymentFailed:
      await handleTransactionPaymentFailed(event.data, env);
      break;
    default:
      // TransactionCompleted etc. — just ack.
      console.log("[paddle webhook] unhandled", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[paddle webhook] error", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
