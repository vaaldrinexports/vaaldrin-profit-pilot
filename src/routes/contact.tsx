import { createFileRoute } from "@tanstack/react-router";
import PublicShell from "@/components/marketing/PublicShell";
import { Mail, MessageSquare } from "lucide-react";

const CANON = "https://vaaldrin-profit-pilot.lovable.app/contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Vaaldrin Profit Pilot" },
      { name: "description", content: "Reach the Vaaldrin Profit Pilot team for sales, support or partnership enquiries." },
      { property: "og:title", content: "Contact — Vaaldrin Profit Pilot" },
      { property: "og:description", content: "Reach the Vaaldrin Profit Pilot team." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANON },
    ],
    links: [{ rel: "canonical", href: CANON }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Talk to us.</h1>
        <p className="mt-4 text-muted-foreground">
          Whether you're evaluating for a 3-person desk or a 50-user export house, we'd love to hear from you.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:hello@vaaldrin.com"
            className="rounded-2xl border border-border bg-card p-6 vx-hover-lift block"
          >
            <Mail className="h-6 w-6 text-[var(--gold)]" />
            <div className="mt-4 font-semibold">Email us</div>
            <div className="mt-1 text-sm text-muted-foreground">hello@vaaldrin.com</div>
          </a>
          <a
            href="mailto:sales@vaaldrin.com"
            className="rounded-2xl border border-border bg-card p-6 vx-hover-lift block"
          >
            <MessageSquare className="h-6 w-6 text-[var(--gold)]" />
            <div className="mt-4 font-semibold">Enterprise sales</div>
            <div className="mt-1 text-sm text-muted-foreground">sales@vaaldrin.com</div>
          </a>
        </div>
      </section>
    </PublicShell>
  );
}
