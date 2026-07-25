import { createFileRoute } from "@tanstack/react-router";
import Calculator from "@/components/Calculator";
import { Toaster } from "@/components/ui/sonner";

const CANON = "https://vaaldrin-profit-pilot.lovable.app/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vaaldrin Profit Pilot — Export costing & quotations" },
      { name: "description", content: "Export pricing, quotation and profit-control workspace with live forex, HS-code duties, RoDTEP, freight and branded PDFs." },
      { property: "og:title", content: "Vaaldrin Profit Pilot" },
      { property: "og:description", content: "Export pricing, quotation and profit-control workspace with live forex, HS-code duties and branded PDFs." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANON },
    ],
    links: [{ rel: "canonical", href: CANON }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Calculator />
      <Toaster richColors position="top-right" />
    </>
  );
}
