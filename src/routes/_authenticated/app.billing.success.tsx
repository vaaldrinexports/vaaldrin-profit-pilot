import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/app/billing/success")({
  head: () => ({
    meta: [
      { title: "Payment successful — Vaaldrin Profit Pilot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BillingSuccess,
});

function BillingSuccess() {
  const qc = useQueryClient();
  useEffect(() => {
    // Give the webhook a moment to persist, then refresh entitlements
    const t = setTimeout(() => qc.invalidateQueries({ queryKey: ["entitlements"] }), 1500);
    return () => clearTimeout(t);
  }, [qc]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center rounded-2xl border border-border bg-card p-10">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
        <h1 className="mt-4 text-2xl font-semibold">Payment received</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your workspace is being upgraded. Features unlock within a few seconds — you may need to refresh.
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          <Link to="/app">
            <Button>Back to workspace</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
