import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { requireCurrentOrgId } from "@/lib/org-store";
import { getBillingOverview, openCustomerPortal } from "@/lib/billing.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ExternalLink, CreditCard, ArrowUpRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/settings/billing")({
  head: () => ({ meta: [{ title: "Billing & Plan — Vaaldrin" }] }),
  component: BillingPage,
});

function fmtMoney(minor: string | number, ccy: string) {
  const n = Number(minor) / 100;
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD" }).format(n); }
  catch { return `${ccy} ${n.toFixed(2)}`; }
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return s; }
}

function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof getBillingOverview>> | null>(null);

  async function load() {
    setLoading(true);
    try {
      const orgId = await requireCurrentOrgId();
      const res = await getBillingOverview({ data: { orgId } });
      setData(res);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load billing");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function openPortal() {
    setBusy(true);
    try {
      const orgId = await requireCurrentOrgId();
      const { url } = await openCustomerPortal({ data: { orgId } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to open portal");
    } finally { setBusy(false); }
  }

  const org = data?.org;
  const plan = (org?.plan as string) ?? "free";
  const status = (org?.subscription_status as string) ?? "trialing";

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Billing & Plan</h1>
            <p className="text-sm text-muted-foreground">Manage your subscription, payment method, and invoices.</p>
          </div>
          <Link to="/app" className="text-sm text-muted-foreground hover:underline">← Back to app</Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : !data ? null : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Current Plan</CardTitle>
                <Badge variant={plan === "free" ? "secondary" : "default"} className="uppercase">{plan}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="font-medium capitalize">{status.replace("_", " ")}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Renews / Ends</div>
                    <div className="font-medium">{fmtDate(org?.current_period_end)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Cancels at period end</div>
                    <div className="font-medium">{org?.cancel_at_period_end ? "Yes" : "No"}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link to="/pricing">
                    <Button className="bg-[#A61D24] hover:bg-[#8a181e] text-white">
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      {plan === "free" ? "Upgrade plan" : "Change plan"}
                    </Button>
                  </Link>
                  {org?.paddle_customer_id && (
                    <Button variant="outline" onClick={openPortal} disabled={busy}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {busy ? "Opening…" : "Manage payment method"}
                    </Button>
                  )}
                </div>
                {!org?.paddle_customer_id && (
                  <p className="text-xs text-muted-foreground">
                    You don't have any payments on file yet. Upgrade to a paid plan to unlock invoices and payment history.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {data.transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-3 font-medium text-muted-foreground">Date</th>
                          <th className="py-2 pr-3 font-medium text-muted-foreground">Invoice</th>
                          <th className="py-2 pr-3 font-medium text-muted-foreground">Amount</th>
                          <th className="py-2 pr-3 font-medium text-muted-foreground">Status</th>
                          <th className="py-2 pr-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {data.transactions.map((t) => (
                          <tr key={t.id} className="border-b last:border-b-0">
                            <td className="py-2 pr-3">{fmtDate(t.billed_at)}</td>
                            <td className="py-2 pr-3 font-mono text-xs">{t.invoice_number ?? t.id.slice(0, 12)}</td>
                            <td className="py-2 pr-3">{fmtMoney(t.total, t.currency)}</td>
                            <td className="py-2 pr-3 capitalize">{t.status}</td>
                            <td className="py-2 pr-3 text-right">
                              {t.invoice_url && (
                                <a href={t.invoice_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                  Invoice <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              Environment: <span className="uppercase font-medium">{data.environment === "sandbox" ? "test" : "live"}</span>. Payments are processed by our secure billing partner.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
