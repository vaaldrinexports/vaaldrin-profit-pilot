import { createFileRoute, Link } from "@tanstack/react-router";
import PublicShell from "@/components/marketing/PublicShell";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calculator, LineChart, ShieldCheck, Users, Sparkles, FileText } from "lucide-react";

const CANON = "https://vaaldrin-profit-pilot.lovable.app/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vaaldrin Profit Pilot — Export costing, quotes & profit control" },
      { name: "description", content: "Price every export shipment with CFO-grade accuracy. Live forex, HS-code duties, buyer intelligence and quotation PDFs in one workspace." },
      { property: "og:title", content: "Vaaldrin Profit Pilot" },
      { property: "og:description", content: "Price every export shipment with CFO-grade accuracy. Live forex, HS-code duties, buyer intelligence and branded quotation PDFs." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANON },
    ],
    links: [{ rel: "canonical", href: CANON }],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            background:
              "radial-gradient(1200px 500px at 20% -10%, color-mix(in oklab, var(--deep-red) 25%, transparent), transparent), radial-gradient(800px 400px at 100% 0%, color-mix(in oklab, var(--gold) 20%, transparent), transparent)",
          }}
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" />
              Now with Buyer Intelligence &amp; Live Market Data
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Price every export shipment
              <br />
              with <span className="text-[var(--gold)]">CFO-grade accuracy</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              Vaaldrin Profit Pilot is the pricing, quotation and profit-control workspace
              built for Indian exporters. Live forex, HS-code duties, freight, RoDTEP, buyer
              risk scoring and branded PDFs — in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="lg" className="bg-[var(--deep-red)] hover:bg-[var(--deep-red)]/90 text-white">
                  Start 14-day Pro trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline">See pricing</Button>
              </Link>
              <span className="text-xs text-muted-foreground">No credit card required</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Everything an export desk needs, on one screen.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Stop stitching together spreadsheets, WhatsApp forwards and duty PDFs.
              Profit Pilot gives you a single, auditable source of truth per shipment.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 vx-hover-lift">
                <f.icon className="h-6 w-6 text-[var(--gold)]" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof / metrics */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 grid gap-8 md:grid-cols-3 text-center">
          {[
            ["4 currencies", "USD · EUR · GBP · AED, live"],
            ["55+ HS codes", "Auto RoDTEP &amp; destination duty"],
            ["7 doc types", "PI, Invoice, Packing, COO &amp; more"],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-3xl md:text-4xl font-semibold text-[var(--gold)]">{k}</div>
              <div className="mt-2 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: v }} />
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Ready to protect your margins?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free, invite your team, upgrade when you're ready. Cancel anytime.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" } as never}>
              <Button size="lg" className="bg-[var(--deep-red)] hover:bg-[var(--deep-red)]/90 text-white">
                Create your workspace
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline">View plans</Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

const FEATURES = [
  { icon: Calculator, title: "Landed-cost calculator", body: "Every FOB / CFR / CIF component including freight, insurance, banking, RoDTEP and duty — reconciled to the paisa." },
  { icon: LineChart, title: "Live market intelligence", body: "Mandi rates, FX, freight indices and destination duties refreshed daily. Never quote on stale data again." },
  { icon: ShieldCheck, title: "Buyer intelligence", body: "10-point buyer verification with country risk, corporate lookup and confidence score before you commit." },
  { icon: FileText, title: "Branded export PDFs", body: "Proforma, Commercial Invoice, Packing List, COO, and 3 more — all consistent, all one click." },
  { icon: Users, title: "Team workspaces", body: "Invite finance, ops and sales. Role-based access with owner / admin / member / viewer." },
  { icon: Sparkles, title: "Audit-ready by default", body: "Every quote, every version, every change tracked. Export a full audit log whenever your CA asks." },
];
