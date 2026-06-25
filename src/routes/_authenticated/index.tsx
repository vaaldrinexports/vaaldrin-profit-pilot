import { createFileRoute } from "@tanstack/react-router";
import Calculator from "@/components/Calculator";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Vaaldrin Exports — Export Pricing & Profit Control" },
      { name: "description", content: "CFO-grade export costing, quotation, profit protection, and negotiation control system for exporters." },
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
