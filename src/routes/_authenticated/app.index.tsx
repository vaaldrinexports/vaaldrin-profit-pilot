import { createFileRoute } from "@tanstack/react-router";
import Calculator from "@/components/Calculator";
import { Toaster } from "@/components/ui/sonner";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Workspace — Vaaldrin Profit Pilot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AppHome,
});

function AppHome() {
  return (
    <>
      <PaymentTestModeBanner />
      <Calculator />
      <Toaster richColors position="top-right" />
    </>
  );
}

