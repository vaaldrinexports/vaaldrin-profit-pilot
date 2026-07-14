import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, ExternalLink, Globe2, Loader2, RefreshCw, Search, TrendingUp, XCircle } from "lucide-react";
import { refreshMarketIntelligence, getMarketHealth } from "@/lib/market-pipeline.functions";
import { discoverProducts } from "@/lib/product-discovery.functions";
import MarketIntelInsights from "./MarketIntelInsights";

type Product = {
  id: string; code: string; name: string; hs_code: string | null; category: string | null;
  industry?: string | null; discovered_from?: string | null; discovery_confidence?: number | null;
  evidence_count?: number | null; source_count?: number | null; status?: string | null;
  last_seen_at?: string | null; search_terms?: string[] | null;
};
type Country = { iso2: string; name: string; region: string | null; currency: string | null };
type Score = {
  id: string; product_id: string; country_iso2: string | null;
  demand_score: number | null; opportunity_score: number | null;
  competition: string | null; price_trend: string | null;
  avg_price_usd: number | null; supply_situation: string | null;
  ai_recommendation: string | null; computed_at: string;
};
type Signal = { id: string; signal_type: string; product_id: string | null; country_iso2: string | null; value: number | null; source: string | null; source_url: string | null; meta: any; captured_at: string };
type News = { id: string; product_id: string | null; country_iso2: string | null; headline: string; url: string | null; source: string | null; published_at: string | null; captured_at: string };
type Health = { source_key: string; source_name: string; category: string; data_type: string; refresh_interval_minutes: number; status: string; last_success_at: string | null; last_attempt_at: string | null; last_error: string | null; records_last_run: number | null; duration_ms: number | null };

const DATA_TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  live: { label: "🟢 Live", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  latest_available: { label: "🔵 Latest Available", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  historical_official: { label: "🟡 Historical Official", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  ai: { label: "🟣 AI Generated", cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" },
};

function relTime(iso: string | null | undefined): string {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function useLatestSignals(type: string) {
  return useQuery({
    queryKey: ["mi_signals", type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mi_signals").select("*").eq("signal_type", type)
        .order("captured_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as Signal[];
    },
    refetchInterval: 60_000,
  });
}

function TrendChip({ trend }: { trend: string | null }) {
  const t = (trend || "").toLowerCase();
  if (t.includes("ris") || t.includes("up")) return <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><ArrowUp className="h-3 w-3" /> Rising</span>;
  if (t.includes("fall") || t.includes("down")) return <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><ArrowDown className="h-3 w-3" /> Falling</span>;
  return <span className="inline-flex items-center gap-1 text-muted-foreground"><ArrowRight className="h-3 w-3" /> Stable</span>;
}

function ScoreCell({ v }: { v: number | null }) {
  if (v == null) return <span className="text-muted-foreground">—</span>;
  const tone = v >= 85 ? "text-emerald-600 dark:text-emerald-400" : v >= 70 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
  return <span className={`font-semibold tabular-nums ${tone}`}>{Math.round(v)}</span>;
}

function DataTypeBadge({ type }: { type: string }) {
  const t = DATA_TYPE_LABEL[type] ?? { label: type, cls: "" };
  return <Badge variant="outline" className={`text-[10px] ${t.cls}`}>{t.label}</Badge>;
}

export default function MarketIntelDashboard() {
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ["mi_products"], queryFn: async () => (await supabase.from("mi_products").select("*").order("name")).data as Product[] ?? [] });
  const countries = useQuery({ queryKey: ["mi_countries"], queryFn: async () => (await supabase.from("mi_countries").select("*").order("name")).data as Country[] ?? [] });
  const scores = useQuery({ queryKey: ["mi_scores"], queryFn: async () => (await supabase.from("mi_scores").select("*").order("computed_at", { ascending: false }).limit(500)).data as Score[] ?? [], refetchInterval: 120_000 });
  const news = useQuery({ queryKey: ["mi_news"], queryFn: async () => (await supabase.from("mi_news").select("*").order("published_at", { ascending: false }).limit(50)).data as News[] ?? [], refetchInterval: 60_000 });

  const fx = useLatestSignals("fx_rate");
  const weather = useLatestSignals("weather");
  const commodityPrices = useLatestSignals("commodity_price");

  const refresh = useServerFn(refreshMarketIntelligence);
  const health = useServerFn(getMarketHealth);
  const discover = useServerFn(discoverProducts);
  const healthQ = useQuery({ queryKey: ["mi_health"], queryFn: () => health(), refetchInterval: 30_000 });

  const refreshMut = useMutation({
    mutationFn: () => refresh({ data: {} }),
    onSuccess: (res: any) => {
      toast.success(`Refreshed ${res.ran} sources · ${res.results?.filter((r: any) => r.ok).length ?? 0} ok`);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(`Refresh failed: ${e?.message ?? e}`),
  });

  const discoverMut = useMutation({
    mutationFn: () => discover(),
    onSuccess: (res: any) => {
      if (res.ok) toast.success(`Discovery run: ${res.records} products updated`);
      else toast.error(`Discovery: ${res.error ?? "failed"}`);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(`Discovery failed: ${e?.message ?? e}`),
  });

  const [q, setQ] = useState("");

  // dedupe latest FX by quote currency
  const latestFx = useMemo(() => {
    const seen = new Map<string, Signal>();
    for (const s of fx.data ?? []) {
      const k = s.meta?.quote as string;
      if (k && !seen.has(k)) seen.set(k, s);
    }
    return Array.from(seen.values());
  }, [fx.data]);

  // dedupe weather by country
  const latestWeather = useMemo(() => {
    const seen = new Map<string, Signal>();
    for (const s of weather.data ?? []) {
      const k = s.country_iso2 ?? "";
      if (k && !seen.has(k)) seen.set(k, s);
    }
    return Array.from(seen.values());
  }, [weather.data]);

  const latestPricePerProduct = useMemo(() => {
    const seen = new Map<string, Signal>();
    for (const s of commodityPrices.data ?? []) {
      const k = s.product_id ?? "";
      if (k && !seen.has(k)) seen.set(k, s);
    }
    return seen;
  }, [commodityPrices.data]);

  // latest score per product
  const productRows = useMemo(() => {
    const latest = new Map<string, Score>();
    for (const s of scores.data ?? []) if (!latest.has(s.product_id)) latest.set(s.product_id, s);
    const list = (products.data ?? []).map((p) => {
      const sc = latest.get(p.id);
      const price = latestPricePerProduct.get(p.id);
      const productNews = (news.data ?? []).filter((n) => n.product_id === p.id).slice(0, 3);
      return { product: p, score: sc, price, news: productNews };
    });
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? list.filter((r) => {
          const p = r.product;
          return (
            p.name.toLowerCase().includes(needle) ||
            (p.industry ?? p.category ?? "").toLowerCase().includes(needle) ||
            (p.hs_code ?? "").toLowerCase().includes(needle) ||
            (p.search_terms ?? []).some((t) => t.toLowerCase().includes(needle))
          );
        })
      : list;
    return filtered.sort((a, b) => (b.score?.opportunity_score ?? -1) - (a.score?.opportunity_score ?? -1));
  }, [products.data, scores.data, news.data, latestPricePerProduct, q]);

  const totalSources = healthQ.data?.length ?? 0;
  const onlineSources = healthQ.data?.filter((h: Health) => h.status === "healthy").length ?? 0;
  const freshness = totalSources ? Math.round((onlineSources / totalSources) * 100) : 0;
  const lastRefresh = healthQ.data?.reduce((a: string | null, h: Health) => {
    if (!h.last_success_at) return a;
    if (!a || new Date(h.last_success_at) > new Date(a)) return h.last_success_at;
    return a;
  }, null as string | null);

  return (
    <div className="space-y-5">
      {/* Header + refresh */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-xl p-2 bg-primary/10 text-primary shrink-0"><Globe2 className="h-5 w-5" /></div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg truncate">Global Market Intelligence</CardTitle>
                <p className="text-xs text-muted-foreground">Live pipeline · every value carries source + timestamp</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => discoverMut.mutate()} disabled={discoverMut.isPending}>
                {discoverMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                Discover Products
              </Button>
              <Button size="sm" className="flex-1 sm:flex-none" onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending}>
                {refreshMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh Market Data
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Data Health */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Market Data Status</CardTitle>
            <div className="flex flex-wrap gap-3 text-xs">
              <span><span className="text-muted-foreground">Sources online:</span> <b>{onlineSources}/{totalSources}</b></span>
              <span><span className="text-muted-foreground">Freshness:</span> <b>{freshness}%</b></span>
              <span><span className="text-muted-foreground">Last refresh:</span> <b>{relTime(lastRefresh)}</b></span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(healthQ.data ?? []).map((h: Health) => (
              <div key={h.source_key} className="rounded-lg border border-border bg-card/50 p-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{h.source_name}</div>
                    <div className="text-xs text-muted-foreground">{h.category}</div>
                  </div>
                  <DataTypeBadge type={h.data_type} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <InfoCell label="Status">
                    {h.status === "healthy" ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Healthy</span>
                      : h.status === "failed" ? <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><XCircle className="h-3 w-3" /> Failed</span>
                      : <span className="text-muted-foreground">Unknown</span>}
                  </InfoCell>
                  <InfoCell label="Last success">{relTime(h.last_success_at)}</InfoCell>
                  <InfoCell label="Records">{h.records_last_run ?? 0}</InfoCell>
                  <InfoCell label="Interval">{h.refresh_interval_minutes}m</InfoCell>
                </div>
                {h.last_error && <div className="mt-2 break-words rounded-md bg-red-500/10 p-2 text-xs text-red-600 dark:text-red-400">{h.last_error}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exchange Rates */}
      <Card>
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-base">Exchange Rates (USD base)</CardTitle>
            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">Source: open.er-api.com · <DataTypeBadge type="live" /></p>
          </div>
        </CardHeader>
        <CardContent>
          {latestFx.length === 0 ? (
            <p className="text-xs text-muted-foreground">Awaiting first refresh — click "Refresh Market Data".</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {latestFx.map((s) => (
                <div key={s.id} className="rounded-lg border p-2">
                  <div className="text-xs text-muted-foreground">{s.meta?.quote}</div>
                  <div className="font-semibold tabular-nums">{Number(s.value).toFixed(4)}</div>
                  <div className="text-[10px] text-muted-foreground">{relTime(s.captured_at)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global Export Opportunities */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">Global Export Opportunities</CardTitle>
              <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                Auto-discovered from live trade signals · demand & opportunity are <DataTypeBadge type="ai" /> · price is <DataTypeBadge type="latest_available" />
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product, industry, HS, country…" className="pl-8 h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {productRows.map((r, i) => {
              const industry = r.product.industry ?? r.product.category ?? "Uncategorized";
              const conf = r.product.discovery_confidence != null
                ? Math.round(Number(r.product.discovery_confidence) * 100)
                : null;
              return (
                <div key={r.product.id} className="rounded-lg border border-border bg-card/50 p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs tabular-nums text-muted-foreground">#{i + 1}</div>
                      <div className="break-words text-sm font-semibold">
                        {r.product.name}
                        {r.product.status === "review" && <Badge variant="outline" className="ml-2 text-[9px]">review</Badge>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="max-w-[45%] whitespace-normal break-words text-[10px]">{industry}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <InfoCell label="HS">{r.product.hs_code ?? "—"}</InfoCell>
                    <InfoCell label="Demand"><ScoreCell v={r.score?.demand_score ?? null} /></InfoCell>
                    <InfoCell label="Opportunity"><ScoreCell v={r.score?.opportunity_score ?? null} /></InfoCell>
                    <InfoCell label="Price">{r.price ? `₹${Number(r.price.value).toFixed(0)}/kg` : "—"}</InfoCell>
                    <InfoCell label="Trend"><TrendChip trend={r.score?.price_trend ?? null} /></InfoCell>
                    <InfoCell label="Confidence">{conf != null ? `${conf}%` : "—"}</InfoCell>
                    <InfoCell label="Updated">{relTime(r.score?.computed_at ?? r.product.last_seen_at ?? r.price?.captured_at ?? null)}</InfoCell>
                    <InfoCell label="Source">
                      {r.price?.source_url ? (
                        <a href={r.price.source_url} target="_blank" rel="noreferrer" className="block min-w-0 break-words text-primary hover:underline">
                          {r.price.source ?? "source"} <ExternalLink className="inline h-3 w-3 align-[-2px]" />
                        </a>
                      ) : r.product.discovered_from ? (
                        <span className="break-words text-muted-foreground">{r.product.discovered_from}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </InfoCell>
                  </div>
                </div>
              );
            })}
            {!productRows.length && <p className="rounded-lg border border-border p-6 text-center text-xs text-muted-foreground">No products yet — click <b>Discover Products</b> to scan live trade signals.</p>}
          </div>
        </CardContent>
      </Card>


      {/* Weather */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Destination Weather</CardTitle>
          <p className="text-xs text-muted-foreground">Source: Open-Meteo · <DataTypeBadge type="live" /></p>
        </CardHeader>
        <CardContent>
          {latestWeather.length === 0 ? (
            <p className="text-xs text-muted-foreground">Awaiting refresh.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {latestWeather.map((s) => (
                <div key={s.id} className="rounded-lg border p-2 text-xs">
                  <div className="font-medium">{s.country_iso2} · {s.meta?.region}</div>
                  <div className="tabular-nums">🌡 {s.meta?.temperature_c}°C</div>
                  <div className="text-muted-foreground">☔ {s.meta?.precipitation_mm}mm · 💨 {s.meta?.wind_kmh}km/h</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{relTime(s.captured_at)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* News */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Market News</CardTitle>
          <p className="text-xs text-muted-foreground">Source: Google News RSS · <DataTypeBadge type="live" /></p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(news.data ?? []).slice(0, 20).map((n) => {
              const p = (products.data ?? []).find((x) => x.id === n.product_id);
              return (
                <a key={n.id} href={n.url ?? "#"} target="_blank" rel="noreferrer" className="block px-4 py-3 hover:bg-muted/30">
                  <div className="text-sm font-medium leading-snug">{n.headline}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    {p && <Badge variant="outline" className="text-[10px]">{p.name}</Badge>}
                    <span>{n.source}</span>
                    <span>·</span>
                    <span>{relTime(n.published_at ?? n.captured_at)}</span>
                  </div>
                </a>
              );
            })}
            {!news.data?.length && <p className="p-6 text-center text-xs text-muted-foreground">No news yet. Refresh to fetch.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Phase 3 — AI Decision Intelligence layered on top of Phase 2 data */}
      <MarketIntelInsights />

      <p className="text-[11px] text-muted-foreground px-1">
        Refresh cadence is per-source: FX every 15m, News every 30m, Weather every 6h, Commodity prices daily. A background job runs every 15 minutes and only refreshes sources whose window has elapsed. Cached data stays visible during outages — nothing is fabricated.
      </p>
    </div>
  );
}

function InfoCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-border/70 bg-background/40 p-2">
      <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="min-w-0 break-words text-xs font-medium [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}
