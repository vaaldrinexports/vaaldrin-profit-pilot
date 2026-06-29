import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, AlertTriangle, XCircle, Info, Shield, RefreshCw,
  Globe, Mail, MapPin, Phone, Building2, History,
} from "lucide-react";
import {
  buildBuyerIntelligence, type BuyerHistory, type CheckStatus,
} from "@/lib/buyer-intel";

interface Props {
  company: string;
  country: string;
  email: string;
  website: string;
  phone: string;
  address: string;
  notes: string;
  onNotesChange: (v: string) => void;
  history?: BuyerHistory;
}

function StatusIcon({ status, className = "h-4 w-4" }: { status: CheckStatus; className?: string }) {
  if (status === "ok") return <CheckCircle2 className={`${className} text-success`} />;
  if (status === "warn") return <AlertTriangle className={`${className} text-warning`} />;
  if (status === "fail") return <XCircle className={`${className} text-deep-red`} />;
  return <Info className={`${className} text-muted-foreground`} />;
}

export default function BuyerIntelligence(p: Props) {
  const [refreshKey, setRefreshKey] = useState(0);

  const report = useMemo(() => buildBuyerIntelligence({
    company: p.company, country: p.country, email: p.email,
    website: p.website, phone: p.phone, address: p.address,
  }, p.history), [p.company, p.country, p.email, p.website, p.phone, p.address, p.history, refreshKey]);

  const hasAny = p.company || p.email || p.website || p.country;
  if (!hasAny) {
    return (
      <Card className="border-l-4 border-l-primary p-5">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Buyer Intelligence</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Run public-signal checks on a prospective buyer (domain, email, phone, country risk).
          <span className="ml-1 italic">Not a credit rating or legal verification.</span>
        </p>
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-semibold text-primary">What this checks</summary>
          <ul className="mt-2 list-inside list-disc space-y-0.5">
            <li>Website validity &amp; HTTPS</li>
            <li>Business vs. personal email domain</li>
            <li>Domain age estimation (heuristic)</li>
            <li>Contact information completeness</li>
            <li>Country consistency (TLD / phone / email vs. selected country)</li>
            <li>Sanctions-keyword screen on free-text fields</li>
            <li>Country risk band (in-app risk database)</li>
            <li>Business type &amp; maturity heuristic</li>
          </ul>
          <p className="mt-2">
            For formal corporate identity checks, use{" "}
            <a
              href="https://opencorporates.com/companies"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary"
            >
              OpenCorporates
            </a>{" "}or your local registry.
          </p>
        </details>
      </Card>
    );
  }

  const scoreBg =
    report.score >= 75 ? "bg-success/10" :
    report.score >= 60 ? "bg-warning/10" : "bg-deep-red/10";
  const scoreText =
    report.score >= 75 ? "text-success" :
    report.score >= 60 ? "text-warning" : "text-deep-red";

  return (
    <Card className="overflow-hidden border-l-4 border-l-primary">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gold/30 bg-gradient-to-r from-card to-accent/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Shield className="h-6 w-6 text-primary shrink-0" />
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground truncate">Buyer Intelligence Report</h3>
            <p className="text-xs text-muted-foreground">Public-signal due diligence · Not a credit rating</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {p.company && (
            <a
              href={`https://opencorporates.com/companies?q=${encodeURIComponent(p.company)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border border-primary/40 px-2.5 h-8 text-xs text-primary hover:bg-primary/5"
              title="Open formal company registry search"
            >
              <Globe className="mr-1.5 h-3.5 w-3.5" />OpenCorporates
            </a>
          )}
          <Button size="sm" variant="outline" onClick={() => {
            setRefreshKey((k) => k + 1);
            toast.success("Buyer verification refreshed", {
              description: p.company ? `Re-checked public signals for ${p.company}` : "Re-ran verification checks",
            });
          }}
            className="border-primary/40 text-primary hover:bg-primary/5">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />Verify Buyer
          </Button>
        </div>
      </div>

      {/* Score & summary */}
      <div className="grid gap-4 p-5 md:grid-cols-3">
        <div className={`rounded-md ${scoreBg} p-4 text-center`}>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Buyer Confidence</div>
          <div className={`mt-1 text-5xl font-bold tabular-nums ${scoreText}`}>{report.score}</div>
          <div className="text-xs text-muted-foreground">/ 100</div>
          <Badge className={`mt-2 ${scoreText} bg-card border`}>{report.band}</Badge>
        </div>

        <div className="md:col-span-2 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold">{p.company || "Unnamed Buyer"}</span>
            <Badge variant="outline" className="ml-auto">{report.relationshipStatus}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{p.country || "—"}</div>
            <div className="flex items-center gap-1.5"><Globe className="h-3 w-3" />{p.website || "—"}</div>
            <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{p.email || "—"}</div>
            <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{p.phone || "—"}</div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            <Badge variant="secondary">Type: {report.businessType}</Badge>
            <Badge variant="secondary">Maturity: {report.maturity}</Badge>
            {report.country && (
              <Badge variant="secondary">Country Risk: {report.country.riskLevel}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Verification checks */}
      <div className="border-t border-border px-5 py-4">
        <h4 className="mb-3 text-sm font-semibold text-primary">Verification Checks</h4>
        <div className="grid gap-2 md:grid-cols-2">
          {report.checks.map((c) => (
            <div key={c.id} className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs">
              <StatusIcon status={c.status} />
              <div className="flex-1">
                <div className="font-semibold text-foreground">{c.label}</div>
                <div className="text-muted-foreground">{c.detail}</div>
              </div>
              <div className="text-[10px] tabular-nums text-muted-foreground">
                {c.score}/{c.weight}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {report.alerts.length > 0 && (
        <div className="border-t border-border bg-deep-red/5 px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-deep-red">
            <AlertTriangle className="h-4 w-4" /> Alerts ({report.alerts.length})
          </div>
          <ul className="mt-1.5 list-inside list-disc text-xs text-deep-red/90">
            {report.alerts.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {/* Recommendation + payment terms */}
      <div className="grid gap-4 border-t border-border p-5 md:grid-cols-2">
        <div className="rounded-md border-l-4 border-l-gold bg-accent/40 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Recommendation</div>
          <p className="mt-1 text-sm text-foreground">{report.recommendation}</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Suggested Payment Terms</div>
          <ul className="mt-1.5 space-y-1 text-sm">
            {report.paymentTerms.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-gold" />{t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* History */}
      {p.history && (
        <div className="border-t border-border px-5 py-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <History className="h-4 w-4" /> Relationship History
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-5">
            <Stat label="Quotes Sent" value={String(p.history.quotesSent)} />
            <Stat label="Orders Won" value={String(p.history.ordersWon)} />
            <Stat label="Conversion" value={`${report.conversionRatePct}%`} />
            <Stat label="Revenue" value={`$${p.history.totalRevenueUsd.toLocaleString()}`} />
            <Stat label="Last Order"
              value={p.history.lastOrderDaysAgo == null ? "—" : `${p.history.lastOrderDaysAgo}d ago`} />
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="border-t border-border px-5 py-4">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          Internal Buyer Notes
          <span className="ml-2 font-normal normal-case text-muted-foreground">
            (Never shown on buyer-facing documents)
          </span>
        </div>
        <Textarea
          value={p.notes}
          onChange={(e) => p.onNotesChange(e.target.value)}
          placeholder="Met at trade fair · Referred by existing client · Sample sent · Good communication…"
          className="min-h-[70px] text-sm"
        />
      </div>

      <div className="border-t border-border bg-muted/30 px-5 py-2 text-[10px] text-muted-foreground">
        Disclaimer: Buyer Intelligence uses publicly available signals for screening only.
        This is not a credit rating, legal verification or guarantee of buyer legitimacy.
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}
