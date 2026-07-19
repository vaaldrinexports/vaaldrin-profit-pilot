import { createFileRoute } from "@tanstack/react-router";
import PublicShell from "@/components/marketing/PublicShell";

const CANON = "https://vaaldrin-profit-pilot.lovable.app/legal/terms";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Vaaldrin Profit Pilot" },
      { name: "description", content: "Terms of Service for Vaaldrin Profit Pilot." },
      { property: "og:title", content: "Terms of Service — Vaaldrin Profit Pilot" },
      { property: "og:description", content: "Terms of Service for Vaaldrin Profit Pilot." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANON },
    ],
    links: [{ rel: "canonical", href: CANON }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-16 prose prose-neutral dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>

        <p>
          These Terms govern your use of Vaaldrin Profit Pilot (the "Service"), operated by
          Vaaldrin Exports. By creating an account you agree to these Terms.
        </p>

        <h2>1. Your account</h2>
        <p>You are responsible for safeguarding your credentials and all activity on your workspace.</p>

        <h2>2. Acceptable use</h2>
        <p>Do not use the Service for anything illegal, to infringe rights, or to disrupt the platform.</p>

        <h2>3. Data</h2>
        <p>Data you upload remains yours. You can export or delete it at any time. See our Privacy Policy for details.</p>

        <h2>4. Payments</h2>
        <p>Paid plans renew automatically until cancelled. Refunds are handled case-by-case.</p>

        <h2>5. Liability</h2>
        <p>
          The Service is provided "as is". Calculations, duty tables and market data are informational; you are
          responsible for verifying figures before commercial use.
        </p>

        <h2>6. Changes</h2>
        <p>We may update these Terms. Material changes will be communicated by email.</p>

        <h2>7. Contact</h2>
        <p>Questions? Email hello@vaaldrin.com.</p>
      </article>
    </PublicShell>
  );
}
