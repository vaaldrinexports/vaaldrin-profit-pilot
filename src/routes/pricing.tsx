import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import PublicShell from "@/components/marketing/PublicShell";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentOrgId } from "@/lib/org-store";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const CANON = "https://vaaldrin-profit-pilot.lovable.app/pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Vaaldrin Profit Pilot" },
      { name: "description", content: "Simple pricing for export teams. Free forever plan, Pro at $49/mo, Business at $199/mo. 14-day Pro trial, no card required." },
      { property: "og:title", content: "Pricing — Vaaldrin Profit Pilot" },
      { property: "og:description", content: "Free, Pro and Business plans for export teams. 14-day Pro trial." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANON },
    ],
    links: [{ rel: "canonical", href: CANON }],
  }),
  component: PricingPage,
});

type Cycle = "monthly" | "annual";

interface Tier {
  key: "free" | "pro" | "business";
  name: string;
  tagline: string;
  monthly: number; // display USD
  annual: number; // display USD
  priceIdMonthly?: string;
  priceIdAnnual?: string;
  cta: string;
  highlight?: boolean;
  features: string[];
}

const TIERS: Tier[] = [
  {
    key: "free",
    name: "Free",
    tagline: "For solo exporters getting started",
    monthly: 0,
    annual: 0,
    cta: "Start free",
    features: [
      "5 quotes / month",
      "1 user",
      "Live forex (USD, EUR, GBP, AED)",
      "Basic HS-code lookup",
      "Watermarked PDFs",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "For SME exporters shipping regularly",
    monthly: 49,
    annual: 470, // ≈ 20% off $588
    priceIdMonthly: "pro_monthly",
    priceIdAnnual: "pro_annual",
    cta: "Upgrade to Pro",
    highlight: true,
    features: [
      "100 quotes / month",
      "3 users",
      "Branded export PDFs (7 doc types)",
      "Market Intelligence (daily refresh)",
      "Buyer Intelligence & country risk",
      "Saved quote history",
    ],
  },
  {
    key: "business",
    name: "Business",
    tagline: "For export houses & trading companies",
    monthly: 199,
    annual: 1910, // ≈ 20% off $2388
    priceIdMonthly: "business_monthly",
    priceIdAnnual: "business_annual",
    cta: "Upgrade to Business",
    features: [
      "Unlimited quotes",
      "15 users, full roles",
      "Market Intelligence (15-min refresh)",
      "Audit-log export",
      "API access (coming soon)",
      "Priority support",
    ],
  },
];

function PricingPage() {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [session, setSession] = useState<{ userId: string; email: string; orgId: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const { openCheckout } = usePaddleCheckout();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const orgId = await resolveCurrentOrgId();
      if (!orgId) return;
      setSession({ userId: data.user.id, email: data.user.email ?? "", orgId });
    })();
  }, []);

  const handleUpgrade = async (tier: Tier) => {
    const priceId = cycle === "monthly" ? tier.priceIdMonthly : tier.priceIdAnnual;
    if (!priceId) return;
    if (!session) {
      navigate({ to: "/auth", search: { mode: "signup" } as never });
      return;
    }
    setBusyKey(tier.key + cycle);
    try {
      await openCheckout({
        priceId,
        orgId: session.orgId,
        userId: session.userId,
        customerEmail: session.email,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open checkout");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <PublicShell>
      <PaymentTestModeBanner />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-6 text-center">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Pricing that scales with your desk
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Start free. Upgrade when you need branded PDFs, live market data or your whole team on it.
          14-day Pro trial included with every workspace — no credit card required.
        </p>

        <div className="mt-8 inline-flex items-center rounded-full border border-border bg-card p-1">
          <button
            onClick={() => setCycle("monthly")}
            className={
              "px-4 py-1.5 text-sm rounded-full transition " +
              (cycle === "monthly" ? "bg-[var(--deep-red)] text-white" : "text-muted-foreground")
            }
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("annual")}
            className={
              "px-4 py-1.5 text-sm rounded-full transition " +
              (cycle === "annual" ? "bg-[var(--deep-red)] text-white" : "text-muted-foreground")
            }
          >
            Annual <span className="ml-1 text-xs text-[var(--gold)]">−20%</span>
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((t) => {
            const priceNum = cycle === "monthly" ? t.monthly : t.annual;
            const isFree = t.key === "free";
            const isBusy = busyKey === t.key + cycle;
            return (
              <div
                key={t.key}
                className={
                  "rounded-2xl border p-8 flex flex-col " +
                  (t.highlight
                    ? "border-[var(--gold)] bg-card shadow-[0_0_0_1px_var(--gold)]"
                    : "border-border bg-card")
                }
              >
                {t.highlight && (
                  <div className="text-xs font-semibold uppercase tracking-widest text-[var(--gold)] mb-3">
                    Most popular
                  </div>
                )}
                <div className="text-lg font-semibold">{t.name}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold">
                    {isFree ? "$0" : `$${priceNum.toLocaleString()}`}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {isFree ? "forever" : cycle === "monthly" ? "/ month" : "/ year"}
                  </span>
                </div>
                {!isFree && cycle === "annual" && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    ${(priceNum / 12).toFixed(0)}/mo effective
                  </div>
                )}
                <p className="mt-2 text-sm text-muted-foreground">{t.tagline}</p>

                {isFree ? (
                  <Link to="/auth" search={{ mode: "signup" } as never} className="mt-6 block">
                    <Button className="w-full" variant="outline">{t.cta}</Button>
                  </Link>
                ) : (
                  <Button
                    disabled={isBusy}
                    onClick={() => handleUpgrade(t)}
                    className={
                      "mt-6 w-full " +
                      (t.highlight
                        ? "bg-[var(--deep-red)] hover:bg-[var(--deep-red)]/90 text-white"
                        : "")
                    }
                    variant={t.highlight ? "default" : "outline"}
                  >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t.cta}
                  </Button>
                )}

                <ul className="mt-8 space-y-3 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-[var(--gold)] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card/50 p-8 text-center">
          <h3 className="text-xl font-semibold">Need more than 15 users, SSO or SLA?</h3>
          <p className="mt-2 text-muted-foreground">
            Talk to us about Enterprise — custom limits, dedicated support, and on-prem options.
          </p>
          <div className="mt-4">
            <Link to="/contact">
              <Button variant="outline">Contact sales</Button>
            </Link>
          </div>
        </div>
      </section>
      <Toaster richColors position="top-right" />
    </PublicShell>
  );
}
