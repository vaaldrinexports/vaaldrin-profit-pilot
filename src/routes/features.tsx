import { createFileRoute } from "@tanstack/react-router";
import PublicShell from "@/components/marketing/PublicShell";
import { Calculator, LineChart, ShieldCheck, FileText, Users, Sparkles, Globe, Landmark, Truck } from "lucide-react";

const CANON = "https://vaaldrin-profit-pilot.lovable.app/features";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Vaaldrin Profit Pilot" },
      { name: "description", content: "Landed-cost calculator, live market intelligence, buyer verification, branded PDFs and multi-workspace teams — built for Indian exporters." },
      { property: "og:title", content: "Features — Vaaldrin Profit Pilot" },
      { property: "og:description", content: "Everything Indian exporters need to price, quote and protect margins." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANON },
    ],
    links: [{ rel: "canonical", href: CANON }],
  }),
  component: FeaturesPage,
});

const sections = [
  { icon: Calculator, title: "Landed-cost calculator", body: "FOB, CFR, CIF, DAP, DDP — computed with 4-decimal precision, banking reconciled, RoDTEP auto-applied. Circular banking-fee dependencies solved with fixed-point iteration." },
  { icon: LineChart, title: "Market intelligence", body: "Live mandi rates, freight indices, port congestion signals and destination duty tables. AI-ranked insights so you spot the shift before your competitor does." },
  { icon: ShieldCheck, title: "Buyer intelligence", body: "10-point due diligence: country risk score, corporate registry lookup, payment-terms sanity check and confidence rating before you commit." },
  { icon: FileText, title: "Export documentation", body: "Proforma, Commercial Invoice, Packing List, Certificate of Origin, and 3 more — all A4, all branded, all one click. Signature and stamp support included." },
  { icon: Globe, title: "Multi-currency, live forex", body: "USD, EUR, GBP and AED refreshed every load. Bank rate vs market rate spread modelled per your bank's terms." },
  { icon: Landmark, title: "HS-code + duty engine", body: "55+ HS codes covering spices, tea, coffee, textiles, herbals and industrial fasteners. Destination duty auto-populated per buyer country." },
  { icon: Truck, title: "Freight & shipping", body: "Sea distance matrix, freight index trends and land-leg distance via mapping. Container-level cost allocation built in." },
  { icon: Users, title: "Workspaces & roles", body: "Invite finance, ops and sales. Owner / admin / member / viewer roles with server-enforced Row-Level Security." },
  { icon: Sparkles, title: "Audit-log, always on", body: "Every save, every share, every login — timestamped and exportable. Your CA and auditor will thank you." },
];

function FeaturesPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-6">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-3xl">
          One workspace for the entire export desk.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Every calculation, every document, every buyer conversation — captured, versioned and searchable.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-6 vx-hover-lift">
              <s.icon className="h-6 w-6 text-[var(--gold)]" />
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
