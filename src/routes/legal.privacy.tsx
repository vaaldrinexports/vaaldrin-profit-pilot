import { createFileRoute } from "@tanstack/react-router";
import PublicShell from "@/components/marketing/PublicShell";

const CANON = "https://vaaldrin-profit-pilot.lovable.app/legal/privacy";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Vaaldrin Profit Pilot" },
      { name: "description", content: "Privacy Policy for Vaaldrin Profit Pilot." },
      { property: "og:title", content: "Privacy Policy — Vaaldrin Profit Pilot" },
      { property: "og:description", content: "Privacy Policy for Vaaldrin Profit Pilot." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANON },
    ],
    links: [{ rel: "canonical", href: CANON }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-16 prose prose-neutral dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Account data</strong>: name, email and workspace details.</li>
          <li><strong>Content</strong>: quotes, buyer profiles, settings you save.</li>
          <li><strong>Usage</strong>: server logs and anonymised analytics to improve the Service.</li>
        </ul>

        <h2>How we use it</h2>
        <p>To operate the Service, provide support, and — with your consent — send product updates.</p>

        <h2>Sharing</h2>
        <p>We do not sell your data. We share with sub-processors (hosting, email, payments) strictly to run the Service.</p>

        <h2>Retention</h2>
        <p>We retain workspace data while your account is active. On deletion, data is removed within 30 days from primary storage.</p>

        <h2>Your rights</h2>
        <p>Access, export or delete your data by writing to hello@vaaldrin.com.</p>

        <h2>Contact</h2>
        <p>Questions? Email hello@vaaldrin.com.</p>
      </article>
    </PublicShell>
  );
}
