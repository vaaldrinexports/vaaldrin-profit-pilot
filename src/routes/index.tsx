import { createFileRoute } from "@tanstack/react-router";
import Calculator from "@/components/Calculator";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vaaldrin Exports — Export Pricing & Profit Control" },
      { name: "description", content: "CFO-grade export costing, quotation, profit protection, and negotiation control system for exporters." },
      { property: "og:title", content: "Vaaldrin Exports — Pricing & Profit Control" },
      { property: "og:description", content: "Calculate safe selling prices, protect margins, and generate professional export quotations." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" },
    ],
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
