import { createFileRoute } from "@tanstack/react-router";
import PublicShell from "@/components/marketing/PublicShell";

const CANON = "https://vaaldrin-profit-pilot.lovable.app/about";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Vaaldrin Profit Pilot" },
      { name: "description", content: "Vaaldrin Profit Pilot is built by exporters, for exporters. Learn about the mission behind the platform." },
      { property: "og:title", content: "About — Vaaldrin Profit Pilot" },
      { property: "og:description", content: "Built by exporters, for exporters." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANON },
    ],
    links: [{ rel: "canonical", href: CANON }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-20 prose prose-neutral dark:prose-invert">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Built by exporters, for exporters.</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Vaaldrin Profit Pilot began as an internal tool at Vaaldrin Exports. We were tired of
          Excel sheets that couldn't handle banking-fee circularity, of stale forex rates costing
          us ₹40k on a single container, and of proforma invoices that looked different every
          time depending on who typed them.
        </p>
        <p className="mt-4 text-muted-foreground">
          So we built the tool we wanted: a single workspace that knows what an HS code is, keeps
          RoDTEP current, understands that CIF is different from CFR, and produces documents you
          can hand to a customs broker without embarrassment.
        </p>
        <h2 className="mt-10 text-2xl font-semibold">Our promise</h2>
        <ul className="mt-4 space-y-2 text-muted-foreground">
          <li>Your data is yours. Full export, anytime.</li>
          <li>Every number is auditable. Every calculation is documented.</li>
          <li>We charge for real value — not for turning on features that should be default.</li>
        </ul>
      </article>
    </PublicShell>
  );
}
