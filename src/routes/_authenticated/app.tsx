import { createFileRoute } from "@tanstack/react-router";
import Calculator from "@/components/Calculator";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Vaaldrin Exports — Export Pricing & Profit Control" },
      { name: "description", content: "CFO-grade export costing, quotation, profit protection, and negotiation control system for exporters." },
      { property: "og:title", content: "Vaaldrin Exports — Export Pricing & Profit Control" },
      { property: "og:description", content: "CFO-grade export costing, quotation, profit protection, and negotiation control system for exporters." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vaaldrin-profit-pilot.lovable.app/" },
      { name: "twitter:title", content: "Vaaldrin Exports — Export Pricing & Profit Control" },
      { name: "twitter:description", content: "CFO-grade export costing, quotation, profit protection, and negotiation control system for exporters." },
    ],
    links: [{ rel: "canonical", href: "https://vaaldrin-profit-pilot.lovable.app/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <Calculator />
      <Toaster richColors position="top-right" />
    </>
  );
}
