import { createFileRoute, Link } from "@tanstack/react-router";
import PublicShell from "@/components/marketing/PublicShell";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

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

const tiers = [
  {
    name: "Free",
    price: "₹0",
    cadence: "forever",
    tagline: "For solo exporters getting started",
    cta: "Start free",
    highlight: false,
    features: [
      "5 quotes / month",
      "1 user",
      "Live forex (USD, EUR, GBP, AED)",
      "Basic HS-code lookup",
      "Watermarked PDFs",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    cadence: "/ month",
    tagline: "For SME exporters shipping regularly",
    cta: "Start 14-day trial",
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
    name: "Business",
    price: "$199",
    cadence: "/ month",
    tagline: "For export houses & trading companies",
    cta: "Start 14-day trial",
    highlight: false,
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
  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Pricing that scales with your desk
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Start free. Upgrade when you need branded PDFs, live market data or your whole team on it.
          14-day Pro trial included with every workspace — no credit card required.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
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
                <span className="text-4xl font-semibold">{t.price}</span>
                <span className="text-sm text-muted-foreground">{t.cadence}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.tagline}</p>
              <Link to="/auth" search={{ mode: "signup" } as never} className="mt-6 block">
                <Button
                  className={
                    "w-full " +
                    (t.highlight
                      ? "bg-[var(--deep-red)] hover:bg-[var(--deep-red)]/90 text-white"
                      : "")
                  }
                  variant={t.highlight ? "default" : "outline"}
                >
                  {t.cta}
                </Button>
              </Link>
              <ul className="mt-8 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-[var(--gold)] shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
    </PublicShell>
  );
}
