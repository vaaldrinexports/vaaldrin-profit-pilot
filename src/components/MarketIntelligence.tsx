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
import { SafeLink } from "@/components/SafeLink";
  findBenchmark, regionalAverage, lowestQuote, highestQuote, primaryRate,
  assessVariance, trendFromPct, statusFromTrend, recommendation,
  type ProductBenchmark, type MarketQuote,
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
    High: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    Medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    Low: "bg-muted text-muted-foreground border-border",
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
  const benchmark = useMemo(() => findBenchmark(productName), [productName]);
  const fetchLive = useServerFn(fetchLiveBenchmark);

  const markets = useMemo(
    () => benchmark?.quotes.map((q) => ({ market: q.market, state: q.state })) ?? [],
    [benchmark],
  );

  const live = useQuery({
    enabled: !!benchmark && markets.length > 0,
    queryKey: ["live-benchmark", benchmark?.key, markets.map((m) => m.market).join("|")],
    queryFn: () =>
      fetchLive({
        data: { productName: benchmark!.name, markets, unit: "kg" },
      }),
    // one day — user can Refresh for on-demand fetch
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const liveByMarket = useMemo(() => {
    const m = new Map<string, LiveQuote>();
    live.data?.quotes.forEach((q) => m.set(q.market.toLowerCase(), q));
    return m;
  }, [live.data]);

  // Merge: live rate wins when present, else fall back to static benchmark
  const mergedQuotes = useMemo<MarketQuote[]>(() => {
    if (!benchmark) return [];
    return benchmark.quotes.map((q) => {
      const l = liveByMarket.get(q.market.toLowerCase());
      return l && l.ratePerKg ? { ...q, ratePerKg: l.ratePerKg } : q;
    });
  }, [benchmark, liveByMarket]);

  if (!productName?.trim()) {
    return (
      <Card className="p-5 border-l-4" style={{ borderLeftColor: GOLD }}>
        <div className="flex items-start gap-3">
          <BarChart3 className="w-5 h-5 mt-0.5" style={{ color: RED }} />
          <div>
            <h3 className="text-sm font-bold tracking-wide" style={{ color: RED }}>MARKET INTELLIGENCE</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Select a product to fetch today's live mandi/market prices.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 italic">
              Live rates are scraped from open web sources (mandi portals, trade publications, APEDA, Spices Board)
              via Firecrawl. Static benchmarks are used as a fallback when a market has no live quote today.
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
              Supported categories: spices, tea, coffee, cotton, herbals, dried products and stainless steel fasteners.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const liveBenchmark: ProductBenchmark = { ...benchmark, quotes: mergedQuotes };
  const uomKg = (uom || "").toUpperCase() === "KG" || (uom || "").toUpperCase().startsWith("KG");
  const supplierKg = uomKg ? supplierPricePerKg : 0;
  const benchPrice = primaryRate(liveBenchmark);
  const assessment = assessVariance(supplierKg || benchPrice, benchPrice);
  const trend30 = benchmark.trend30d;
  const trend = trendFromPct(trend30);
  const status = statusFromTrend(trend);
  const avg = regionalAverage(liveBenchmark);
  const lo = lowestQuote(liveBenchmark);
  const hi = highestQuote(liveBenchmark);
  const reco = recommendation({ variancePct: assessment.variancePct, trend30d: trend30 });

  const hits = live.data?.hits ?? 0;
  const total = markets.length;
  const isLive = hits > 0;
  const fetchedAt = live.data?.fetchedAt
    ? new Date(live.data.fetchedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : null;

  const toneClass =
    assessment.tone === "green" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40" :
    assessment.tone === "red"   ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/40" :
                                  "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/40";

  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: GOLD }}>
      {/* Header */}
      <div className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border">
        <div className="flex items-start gap-2.5 min-w-0">
          <BarChart3 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: RED }} />
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-wider" style={{ color: RED }}>MARKET INTELLIGENCE</h3>
            <p className="text-[11px] text-muted-foreground break-words">
              {isLive
                ? `Live web-scraped rates · ${hits}/${total} markets updated today`
                : live.isFetching
                ? "Fetching today's live rates…"
                : "Static benchmark (live fetch unavailable)"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={
              isLive
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold gap-1"
                : "bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-400 text-[10px] font-semibold gap-1"
            }
          >
            <Radio className="w-3 h-3" />
            {isLive ? "LIVE" : "Static Benchmark"}
          </Badge>
          <ConfidenceBadge level={benchmark.confidence} />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            disabled={live.isFetching}
            onClick={async () => {
              const res = await live.refetch();
              const d = res.data;
              if (d && d.hits > 0) {
                toast.success(`Live rates refreshed`, {
                  description: `${d.hits}/${d.quotes.length} markets updated for ${benchmark.name}`,
                });
              } else if (d?.error) {
                toast.error("Live fetch failed", { description: d.error });
              } else {
                toast.warning("No live prices found", {
                  description: "Sources returned no verifiable rate. Showing benchmark.",
                });
              }
            }}
          >
            <RefreshCw className={`w-3 h-3 ${live.isFetching ? "animate-spin" : ""}`} />
            {live.isFetching ? "Fetching…" : "Refresh Live"}
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Left: Benchmark summary */}
        <div className="space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Product</div>
            <div className="text-base font-semibold">{benchmark.name}</div>
            <div className="text-[11px] text-muted-foreground">{benchmark.group} · Primary market: {benchmark.primaryMarket}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border p-3" >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{isLive ? "Live Price" : "Benchmark Price"}</div>
              <div className="text-xl font-bold" style={{ color: RED }}>{fmtINR(benchPrice)}<span className="text-xs font-normal text-muted-foreground">/kg</span></div>
            </div>
            <div className="rounded-md border border-border p-3" >
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
                <div key={t.label} className="rounded-md border border-border p-2" >
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
            <p className="text-[10px] text-muted-foreground mt-1 italic">
              Trend % is derived from historical benchmark series; live prices update the current-day quote only.
            </p>
          </div>
        </div>

        {/* Right: Multi-market comparison */}
        <div className="space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Regional Markets · Today</div>
            <div className="grid grid-cols-1 gap-2">
              {liveBenchmark.quotes.map((q) => {
                const isPrimary = q.market === benchmark.primaryMarket;
                const l = liveByMarket.get(q.market.toLowerCase());
                const isLiveRow = !!(l && l.ratePerKg);
                return (
                  <div key={q.market} className="rounded-md border border-border p-2.5 text-xs">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="break-words font-semibold">
                          {q.market}
                          {isPrimary && <span className="ml-1.5 text-[9px] uppercase font-bold" style={{ color: GOLD }}>Primary</span>}
                          {isLiveRow && <span className="ml-1.5 text-[9px] uppercase font-bold text-emerald-700">Live</span>}
                        </div>
                        <div className="text-muted-foreground">{q.state}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-semibold tabular-nums">{fmtINR(q.ratePerKg)}/kg</div>
                        {isLiveRow && l?.sourceUrl ? (
                          <SafeLink
                            href={l.sourceUrl}
                            title={l.sourceTitle ?? l.sourceUrl}
                            className="inline-flex text-emerald-700 hover:text-emerald-900"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </SafeLink>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center text-[11px]">
              <div className="rounded border border-border p-1.5" >
                <div className="text-muted-foreground">Lowest</div>
                <div className="font-semibold text-emerald-700">{lo.market}</div>
                <div className="tabular-nums">{fmtINR(lo.ratePerKg)}</div>
              </div>
              <div className="rounded border border-border p-1.5" >
                <div className="text-muted-foreground">Average</div>
                <div className="font-semibold">—</div>
                <div className="tabular-nums">{fmtINR(avg)}</div>
              </div>
              <div className="rounded border border-border p-1.5" >
                <div className="text-muted-foreground">Highest</div>
                <div className="font-semibold text-red-700">{hi.market}</div>
                <div className="tabular-nums">{fmtINR(hi.ratePerKg)}</div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-md p-3 bg-amber-500/10 border border-amber-500/40">
            <div className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: RED }}>Procurement Recommendation</div>
            <p className="text-xs text-foreground leading-relaxed">{reco}</p>
          </div>

          {/* Source */}
          <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              <strong className="text-foreground">Source:</strong>{" "}
              {isLive ? "Firecrawl web search · mandi & trade portals" : benchmark.source}
            </span>
            <span>
              <strong className="text-foreground">Updated:</strong>{" "}
              {fetchedAt ?? benchmark.lastUpdated}
            </span>
            {live.data?.error && (
              <span className="italic text-amber-700">Live fetch: {live.data.error}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

