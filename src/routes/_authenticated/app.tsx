import { createFileRoute } from "@tanstack/react-router";
import Calculator from "@/components/Calculator";
import { Toaster } from "@/components/ui/sonner";

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
      <Calculator />
      <Toaster richColors position="top-right" />
    </>
  );
}
