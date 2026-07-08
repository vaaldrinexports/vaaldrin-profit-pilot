import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Info, BarChart3, ExternalLink, Radio } from "lucide-react";
import { fetchLiveBenchmark, type LiveQuote } from "@/lib/market-scraper.functions";
import {
  findBenchmark, regionalAverage, lowestQuote, highestQuote, primaryRate,
  assessVariance, trendFromPct, statusFromTrend, recommendation,
  type ProductBenchmark,
} from "@/lib/market-intel";

const RED = "#A61D24";
const GOLD = "#C99A2E";

function fmtINR(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
function fmtPct(n: number) {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(1)}%`;
}

function TrendIcon({ pct }: { pct: number }) {
  if (pct > 0.5) return <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />;
  if (pct < -0.5) return <TrendingDown className="w-3.5 h-3.5 text-red-600" />;
  return <Minus className="w-3.5 h-3.5 text-amber-600" />;
}

function ConfidenceBadge({ level }: { level: ProductBenchmark["confidence"] }) {
  const map: Record<string, string> = {
    High: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Medium: "bg-amber-50 text-amber-700 border-amber-200",
    Low: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return <Badge variant="outline" className={`${map[level]} text-[10px] font-semibold`}>Confidence: {level}</Badge>;
}

export default function MarketIntelligence({
  productName,
  supplierPricePerKg,
  uom,
}: {
  productName: string;
  supplierPricePerKg: number;
  uom: string;
}) {
  const [tick, setTick] = useState(0);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const benchmark = useMemo(() => findBenchmark(productName), [productName, tick]);

  if (!productName?.trim()) {
    return (
      <Card className="p-5 border-l-4" style={{ borderLeftColor: GOLD }}>
        <div className="flex items-start gap-3">
          <BarChart3 className="w-5 h-5 mt-0.5" style={{ color: RED }} />
          <div>
            <h3 className="text-sm font-bold tracking-wide" style={{ color: RED }}>MARKET INTELLIGENCE</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Select a product to load South India procurement benchmarks.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 italic">
              Benchmarks are static reference prices compiled from APEDA, Spices Board India and state APMC
              sources. Each card shows the exact source and last-updated date — these are not live mandi feeds.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!benchmark) {
    return (
      <Card className="p-5 border-l-4" style={{ borderLeftColor: GOLD }}>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 mt-0.5" style={{ color: RED }} />
          <div>
            <h3 className="text-sm font-bold tracking-wide" style={{ color: RED }}>MARKET INTELLIGENCE</h3>
            <p className="text-xs text-muted-foreground mt-1">
              No benchmark available for <strong className="text-foreground">{productName}</strong>.
              Supported categories: spices, tea, coffee, cotton, herbals and dried products from South India.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const uomKg = (uom || "").toUpperCase() === "KG" || (uom || "").toUpperCase().startsWith("KG");
  const supplierKg = uomKg ? supplierPricePerKg : 0;
  const benchPrice = primaryRate(benchmark);
  const assessment = assessVariance(supplierKg || benchPrice, benchPrice);
  const trend30 = benchmark.trend30d;
  const trend = trendFromPct(trend30);
  const status = statusFromTrend(trend);
  const avg = regionalAverage(benchmark);
  const lo = lowestQuote(benchmark);
  const hi = highestQuote(benchmark);
  const reco = recommendation({ variancePct: assessment.variancePct, trend30d: trend30 });

  const toneClass =
    assessment.tone === "green" ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
    assessment.tone === "red"   ? "bg-red-50 text-red-700 border-red-300" :
                                  "bg-amber-50 text-amber-800 border-amber-300";

  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: GOLD }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: "#E5E7EB" }}>
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5" style={{ color: RED }} />
          <div>
            <h3 className="text-sm font-bold tracking-wider" style={{ color: RED }}>MARKET INTELLIGENCE</h3>
            <p className="text-[11px] text-muted-foreground">South India procurement benchmark</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-[#FFF7E6] border-[#C99A2E]/50 text-[10px] font-semibold" style={{ color: RED }}>
            Benchmark Price · Static Reference
          </Badge>
          <ConfidenceBadge level={benchmark.confidence} />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            onClick={() => {
              setTick((t) => t + 1);
              const now = new Date();
              setRefreshedAt(now.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
              toast.success("Benchmark refreshed", {
                description: benchmark ? `${benchmark.name} · ${benchmark.primaryMarket}` : "Re-checked benchmark data",
              });
            }}
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Benchmark summary */}
        <div className="space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Product</div>
            <div className="text-base font-semibold">{benchmark.name}</div>
            <div className="text-[11px] text-muted-foreground">{benchmark.group} · Primary market: {benchmark.primaryMarket}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border p-3" style={{ borderColor: "#E5E7EB" }}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Benchmark Price</div>
              <div className="text-xl font-bold" style={{ color: RED }}>{fmtINR(benchPrice)}<span className="text-xs font-normal text-muted-foreground">/kg</span></div>
            </div>
            <div className="rounded-md border p-3" style={{ borderColor: "#E5E7EB" }}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Supplier Price</div>
              <div className="text-xl font-bold">{supplierKg > 0 ? fmtINR(supplierKg) : "—"}<span className="text-xs font-normal text-muted-foreground">/{uomKg ? "kg" : (uom || "unit")}</span></div>
              {!uomKg && supplierPricePerKg > 0 && (
                <div className="text-[10px] text-amber-700 mt-0.5">UoM is {uom || "—"} — set to KG for variance check</div>
              )}
            </div>
          </div>

          {/* Supplier vs Benchmark */}
          <div className={`rounded-md border-2 p-3 ${toneClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider opacity-70">Variance</div>
                <div className="text-lg font-bold">{supplierKg > 0 ? fmtPct(assessment.variancePct) : "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider opacity-70">Assessment</div>
                <div className="text-sm font-semibold">{supplierKg > 0 ? assessment.label : "Set supplier price in ₹/kg"}</div>
              </div>
            </div>
          </div>

          {/* Trends */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Price Trend</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "7-Day", v: benchmark.trend7d },
                { label: "30-Day", v: benchmark.trend30d },
                { label: "90-Day", v: benchmark.trend90d },
              ].map((t) => (
                <div key={t.label} className="rounded-md border p-2" style={{ borderColor: "#E5E7EB" }}>
                  <div className="text-[10px] text-muted-foreground">{t.label}</div>
                  <div className="flex items-center justify-center gap-1 font-semibold text-sm">
                    <TrendIcon pct={t.v} />
                    {fmtPct(t.v)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-muted-foreground">Trend:</span>
              <span className="font-semibold">{trend}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Status:</span>
              <span className="font-semibold" style={{ color: status === "Bullish" ? "#059669" : status === "Bearish" ? "#DC2626" : "#B45309" }}>{status}</span>
            </div>
          </div>
        </div>

        {/* Right: Multi-market comparison */}
        <div className="space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Regional Markets</div>
            <div className="rounded-md border overflow-hidden" style={{ borderColor: "#E5E7EB" }}>
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-semibold">Market</th>
                    <th className="text-left px-3 py-1.5 font-semibold">State</th>
                    <th className="text-right px-3 py-1.5 font-semibold">Rate/kg</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmark.quotes.map((q) => {
                    const isPrimary = q.market === benchmark.primaryMarket;
                    return (
                      <tr key={q.market} className="border-t" style={{ borderColor: "#F1F5F9" }}>
                        <td className="px-3 py-1.5 font-medium">
                          {q.market}
                          {isPrimary && <span className="ml-1.5 text-[9px] uppercase font-bold" style={{ color: GOLD }}>Primary</span>}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{q.state}</td>
                        <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{fmtINR(q.ratePerKg)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center text-[11px]">
              <div className="rounded border p-1.5" style={{ borderColor: "#E5E7EB" }}>
                <div className="text-muted-foreground">Lowest</div>
                <div className="font-semibold text-emerald-700">{lo.market}</div>
                <div className="tabular-nums">{fmtINR(lo.ratePerKg)}</div>
              </div>
              <div className="rounded border p-1.5" style={{ borderColor: "#E5E7EB" }}>
                <div className="text-muted-foreground">Average</div>
                <div className="font-semibold">—</div>
                <div className="tabular-nums">{fmtINR(avg)}</div>
              </div>
              <div className="rounded border p-1.5" style={{ borderColor: "#E5E7EB" }}>
                <div className="text-muted-foreground">Highest</div>
                <div className="font-semibold text-red-700">{hi.market}</div>
                <div className="tabular-nums">{fmtINR(hi.ratePerKg)}</div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-md p-3" style={{ background: "#FFF7E6", border: `1px solid ${GOLD}` }}>
            <div className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: RED }}>Procurement Recommendation</div>
            <p className="text-xs text-foreground leading-relaxed">{reco}</p>
          </div>

          {/* Source */}
          <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            <span><strong className="text-foreground">Source:</strong> {benchmark.source}</span>
            <span><strong className="text-foreground">Updated:</strong> {refreshedAt ?? benchmark.lastUpdated}</span>
            <span className="italic">
              {benchmark.category === "live" ? "Live Market Reference" : "Benchmark Price"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
