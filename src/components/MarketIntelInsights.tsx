import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Download, Flame, Info, Search, TrendingDown, TrendingUp } from "lucide-react";
import { SafeLink } from "@/components/SafeLink";

// ============ Types ============
type Product = { id: string; code: string; name: string; hs_code: string | null; category: string | null };
type Country = { iso2: string; name: string; region: string | null; currency: string | null };
type Signal = {
  id: string; signal_type: string; product_id: string | null; country_iso2: string | null;
  value: number | null; source: string | null; source_url: string | null; meta: any; captured_at: string;
};
type News = { id: string; product_id: string | null; country_iso2: string | null; headline: string; url: string | null; source: string | null; published_at: string | null };

// ============ Utilities ============
function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

function bandFromScore(v: number | null): { label: string; cls: string; emoji: string } {
  if (v == null) return { label: "n/a", cls: "bg-muted text-muted-foreground", emoji: "—" };
  if (v >= 85) return { label: "Very High", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", emoji: "🔥" };
  if (v >= 70) return { label: "High", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", emoji: "▲" };
  if (v >= 50) return { label: "Medium", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20", emoji: "◆" };
  if (v >= 30) return { label: "Low", cls: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20", emoji: "▽" };
  return { label: "Very Low", cls: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20", emoji: "▼" };
}

function toCSV(rows: any[], columns: { key: string; label: string }[]): string {
  const head = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows.map((r) => columns.map((c) => {
    const v = r[c.key];
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  }).join(","));
  return [head, ...body].join("\n");
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ============ Component ============
export default function MarketIntelInsights() {
  const products = useQuery({
    queryKey: ["mi_products"],
    queryFn: async () => (await supabase.from("mi_products").select("*").order("name")).data as Product[] ?? [],
  });
  const countries = useQuery({
    queryKey: ["mi_countries"],
    queryFn: async () => (await supabase.from("mi_countries").select("*").order("name")).data as Country[] ?? [],
  });
  const signals = useQuery({
    queryKey: ["mi_signals_all"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const { data } = await supabase.from("mi_signals").select("*").gte("captured_at", since).order("captured_at", { ascending: false }).limit(3000);
      return (data ?? []) as Signal[];
    },
    refetchInterval: 120_000,
  });
  const news = useQuery({
    queryKey: ["mi_news_all"],
    queryFn: async () => (await supabase.from("mi_news").select("*").order("published_at", { ascending: false }).limit(200)).data as News[] ?? [],
    refetchInterval: 120_000,
  });

  const [q, setQ] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [demandFilter, setDemandFilter] = useState<string>("all");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  // ============ DERIVED INTELLIGENCE ============
  // Per-product aggregates from signals
  const productIntel = useMemo(() => {
    const all = signals.data ?? [];
    const newsAll = news.data ?? [];
    return (products.data ?? []).map((p) => {
      const sigs = all.filter((s) => s.product_id === p.id);
      const newsSigs = sigs.filter((s) => s.signal_type === "news_volume");
      const priceSigs = sigs.filter((s) => s.signal_type === "commodity_price").sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());
      const productNews = newsAll.filter((n) => n.product_id === p.id);

      const evidenceCount = sigs.length + productNews.length;
      const newsVolume = newsSigs.reduce((acc, s) => acc + Number(s.value ?? 0), 0);
      const avgNews = newsSigs.length ? newsVolume / newsSigs.length : 0;

      // Demand score: normalized news volume (0-30 headlines/query -> 0-100)
      const demand = newsSigs.length ? Math.min(100, Math.round((avgNews / 30) * 100)) : null;

      // Price trend
      let priceTrend: "rising" | "falling" | "stable" | null = null;
      let priceChangePct: number | null = null;
      if (priceSigs.length >= 2) {
        const first = Number(priceSigs[0].value);
        const last = Number(priceSigs[priceSigs.length - 1].value);
        if (first > 0) {
          priceChangePct = ((last - first) / first) * 100;
          priceTrend = priceChangePct > 2 ? "rising" : priceChangePct < -2 ? "falling" : "stable";
        }
      }
      const latestPrice = priceSigs.length ? Number(priceSigs[priceSigs.length - 1].value) : null;

      // Opportunity: demand + evidence bonus - price shock penalty
      let opportunity: number | null = null;
      if (demand != null || priceSigs.length) {
        const base = demand ?? 40;
        const evBonus = Math.min(20, evidenceCount);
        const priceBonus = priceTrend === "rising" ? -5 : priceTrend === "falling" ? 8 : 0;
        opportunity = Math.max(0, Math.min(100, Math.round(base + evBonus + priceBonus)));
      }

      // Confidence: driven by evidence count and data source diversity
      const sourceCount = new Set(sigs.map((s) => s.source).filter(Boolean)).size + (productNews.length ? 1 : 0);
      const confidence = evidenceCount === 0 ? 0 : Math.min(99, Math.round(evidenceCount * 5 + sourceCount * 8));

      // Freshness: from most-recent signal
      const latest = sigs[0]?.captured_at ?? productNews[0]?.published_at ?? null;

      // Why-reasons
      const reasons: string[] = [];
      if (newsSigs.length) reasons.push(`${newsSigs.length} recent news signal${newsSigs.length > 1 ? "s" : ""} collected (Google News)`);
      if (productNews.length) reasons.push(`${productNews.length} headline${productNews.length > 1 ? "s" : ""} captured for this product`);
      if (priceSigs.length) reasons.push(`${priceSigs.length} price observation${priceSigs.length > 1 ? "s" : ""} from APEDA / Firecrawl · trend ${priceTrend ?? "n/a"}`);
      if (avgNews > 15) reasons.push(`High news volume (avg ${avgNews.toFixed(1)} headlines / query)`);
      if (priceTrend === "falling") reasons.push(`Prices softening (${priceChangePct?.toFixed(1)}% over window) — buyer-friendly window`);
      if (priceTrend === "rising") reasons.push(`Prices rising (${priceChangePct?.toFixed(1)}%) — margin pressure`);

      return {
        product: p,
        demand, opportunity, confidence,
        evidenceCount, sourceCount,
        priceTrend, priceChangePct, latestPrice, priceHistory: priceSigs.map((s) => Number(s.value)),
        newsSample: productNews.slice(0, 5),
        reasons,
        latest,
        sufficient: evidenceCount >= 2,
      };
    });
  }, [products.data, signals.data, news.data]);

  // Per-country intelligence
  const countryIntel = useMemo(() => {
    const all = signals.data ?? [];
    const newsAll = news.data ?? [];
    // FX advantage: INR weakening = exporter advantage
    const fxLatest = new Map<string, Signal>();
    for (const s of all.filter((s) => s.signal_type === "fx_rate")) {
      const k = s.meta?.quote as string; if (k && !fxLatest.has(k)) fxLatest.set(k, s);
    }

    return (countries.data ?? []).map((c) => {
      const weather = all.find((s) => s.signal_type === "weather" && s.country_iso2 === c.iso2);
      const countryNews = newsAll.filter((n) => n.country_iso2 === c.iso2);
      // products with signals connected to this country's currency or news
      const currency = c.currency ?? null;
      const fx = currency ? fxLatest.get(currency) : null;

      // Product mentions in that country's news
      const productsForCountry = productIntel
        .filter((pi) => pi.newsSample.some((n) => n.country_iso2 === c.iso2) || pi.opportunity != null)
        .sort((a, b) => (b.opportunity ?? 0) - (a.opportunity ?? 0))
        .slice(0, 4);

      const demandAvg = productsForCountry.length
        ? Math.round(productsForCountry.reduce((a, p) => a + (p.demand ?? 0), 0) / productsForCountry.length)
        : null;

      // Competition heuristic: high news volume + many source-diverse mentions → higher competition
      const totalNews = countryNews.length;
      const competition = totalNews > 20 ? "High" : totalNews > 8 ? "Medium" : totalNews > 0 ? "Low" : "Unknown";

      // Currency advantage: FX vs baseline
      const currencyAdvantage = fx?.value ? (Number(fx.value) > 1 ? "Favorable" : "Neutral") : "Unknown";

      // Weather status
      const w = weather?.meta ?? {};
      const weatherStatus = w.precipitation_mm != null
        ? (Number(w.precipitation_mm) > 5 ? "Wet" : "Clear")
        : "Unknown";

      const evidence = productsForCountry.reduce((a, p) => a + p.evidenceCount, 0) + countryNews.length + (weather ? 1 : 0) + (fx ? 1 : 0);
      const confidence = evidence === 0 ? 0 : Math.min(99, Math.round(evidence * 3 + 20));

      // Weighted opportunity (§12)
      const weights = { demand: 0.30, competition: 0.20, price: 0.15, currency: 0.10, freight: 0.10, weather: 0.05, gov: 0.05, news: 0.05 };
      const parts = {
        demand: demandAvg ?? 40,
        competition: competition === "Low" ? 90 : competition === "Medium" ? 60 : competition === "High" ? 30 : 50,
        price: productsForCountry.some((p) => p.priceTrend === "falling") ? 80 : productsForCountry.some((p) => p.priceTrend === "rising") ? 40 : 60,
        currency: currencyAdvantage === "Favorable" ? 75 : 50,
        freight: 60, // freight collector pending
        weather: weatherStatus === "Clear" ? 70 : weatherStatus === "Wet" ? 45 : 50,
        gov: 50,
        news: Math.min(100, totalNews * 5),
      };
      const opportunity = Math.round(
        parts.demand * weights.demand +
        parts.competition * weights.competition +
        parts.price * weights.price +
        parts.currency * weights.currency +
        parts.freight * weights.freight +
        parts.weather * weights.weather +
        parts.gov * weights.gov +
        parts.news * weights.news,
      );

      // Deterministic AI summary (no fabrication — restates observed evidence)
      const summaryLines: string[] = [];
      if (demandAvg != null) summaryLines.push(`Aggregated product demand score across top matches: ${demandAvg}/100.`);
      if (totalNews) summaryLines.push(`${totalNews} recent news item${totalNews > 1 ? "s" : ""} referencing this country in the last 30 days.`);
      if (fx?.value) summaryLines.push(`Currency ${currency}: 1 USD ≈ ${Number(fx.value).toFixed(4)} — ${currencyAdvantage} for INR exporters.`);
      if (weather) summaryLines.push(`Weather at ${w.region ?? c.name}: ${w.temperature_c ?? "?"}°C, ${w.precipitation_mm ?? 0}mm precip — ${weatherStatus.toLowerCase()} shipping conditions.`);
      if (!summaryLines.length) summaryLines.push("Insufficient signals collected for this country. Trigger a market refresh to gather live data.");

      return {
        country: c,
        products: productsForCountry,
        demand: demandAvg,
        competition,
        currencyAdvantage,
        weatherStatus,
        freightStatus: "Normal",
        risk: totalNews === 0 ? "Unknown" : "Standard",
        opportunity,
        confidence,
        evidence,
        parts,
        weights,
        recommendation: opportunity >= 80 ? "Target Immediately" : opportunity >= 65 ? "High Priority" : opportunity >= 50 ? "Consider" : "Watch",
        summary: summaryLines,
        news: countryNews.slice(0, 5),
        latest: countryNews[0]?.published_at ?? weather?.captured_at ?? fx?.captured_at ?? null,
        sufficient: evidence >= 2,
      };
    }).sort((a, b) => b.opportunity - a.opportunity);
  }, [countries.data, signals.data, news.data, productIntel]);

  // Top opportunity pairs
  const topOpportunities = useMemo(() => {
    const rows: any[] = [];
    for (const ci of countryIntel) {
      for (const pi of ci.products.slice(0, 3)) {
        if (!pi.sufficient) continue;
        const score = Math.round(((pi.opportunity ?? 0) * 0.6) + (ci.opportunity * 0.4));
        rows.push({
          product: pi.product.name, country: ci.country.name, iso2: ci.country.iso2, productId: pi.product.id,
          opportunity: score, confidence: Math.round((pi.confidence + ci.confidence) / 2),
          reason: pi.reasons[0] ?? "Signal-based recommendation",
          recommendation: score >= 80 ? "Target Immediately" : score >= 65 ? "Actively Pursue" : "Explore",
        });
      }
    }
    return rows.sort((a, b) => b.opportunity - a.opportunity).slice(0, 20);
  }, [countryIntel]);

  // KPIs
  const kpis = useMemo(() => {
    const withData = productIntel.filter((p) => p.sufficient);
    const rising = withData.filter((p) => p.priceTrend === "rising" || (p.demand ?? 0) >= 70).slice(0, 5);
    const falling = withData.filter((p) => p.priceTrend === "falling" && (p.demand ?? 0) < 50).slice(0, 5);
    const topProducts = [...withData].sort((a, b) => (b.opportunity ?? 0) - (a.opportunity ?? 0)).slice(0, 5);
    const topCountries = countryIntel.filter((c) => c.sufficient).slice(0, 5);
    return { rising, falling, topProducts, topCountries, totalSignals: signals.data?.length ?? 0, totalNews: news.data?.length ?? 0 };
  }, [productIntel, countryIntel, signals.data, news.data]);

  // Filters
  const filteredCountries = useMemo(() => {
    return countryIntel.filter((c) => {
      if (q && !c.country.name.toLowerCase().includes(q.toLowerCase()) && !c.country.iso2.toLowerCase().includes(q.toLowerCase())) return false;
      if (region !== "all" && c.country.region !== region) return false;
      if (demandFilter === "high" && (c.demand ?? 0) < 70) return false;
      if (demandFilter === "medium" && ((c.demand ?? 0) < 50 || (c.demand ?? 0) >= 70)) return false;
      if (demandFilter === "low" && (c.demand ?? 0) >= 50) return false;
      return true;
    });
  }, [countryIntel, q, region, demandFilter]);

  const filteredProducts = useMemo(() => {
    return productIntel.filter((p) => !q || p.product.name.toLowerCase().includes(q.toLowerCase()) || (p.product.hs_code ?? "").includes(q));
  }, [productIntel, q]);

  const regions = useMemo(() => Array.from(new Set((countries.data ?? []).map((c) => c.region).filter(Boolean))) as string[], [countries.data]);

  const exportCountriesCSV = () => {
    const rows = filteredCountries.map((c, i) => ({
      rank: i + 1, country: c.country.name, region: c.country.region,
      products: c.products.map((p) => p.product.name).join("; "),
      demand: c.demand ?? "Insufficient Data", competition: c.competition,
      currency: c.currencyAdvantage, weather: c.weatherStatus,
      opportunity: c.opportunity, confidence: c.confidence, evidence: c.evidence,
      recommendation: c.recommendation, updated: c.latest ?? "",
    }));
    downloadCSV(`country-opportunities-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows, [
      { key: "rank", label: "Rank" }, { key: "country", label: "Country" }, { key: "region", label: "Region" },
      { key: "products", label: "Top Products" }, { key: "demand", label: "Demand" }, { key: "competition", label: "Competition" },
      { key: "currency", label: "Currency" }, { key: "weather", label: "Weather" },
      { key: "opportunity", label: "Opportunity" }, { key: "confidence", label: "Confidence %" }, { key: "evidence", label: "Evidence" },
      { key: "recommendation", label: "Recommendation" }, { key: "updated", label: "Last Updated" },
    ]));
  };

  const exportOpportunitiesCSV = () => {
    downloadCSV(`top-opportunities-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(topOpportunities, [
      { key: "product", label: "Product" }, { key: "country", label: "Country" },
      { key: "opportunity", label: "Opportunity" }, { key: "confidence", label: "Confidence %" },
      { key: "recommendation", label: "Recommendation" }, { key: "reason", label: "Reason" },
    ]));
  };

  // ============ RENDER ============
  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Top Products" value={kpis.topProducts.length} sub="with sufficient data" icon={<Flame className="h-4 w-4" />} />
        <KpiCard title="Top Countries" value={kpis.topCountries.length} sub="market ready" icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard title="Rising Demand" value={kpis.rising.length} sub="products trending up" icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} />
        <KpiCard title="Falling Demand" value={kpis.falling.length} sub="products softening" icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product, country, HS code…" className="pl-8 h-9" />
          </div>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Region" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={demandFilter} onValueChange={setDemandFilter}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Demand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All demand</SelectItem>
              <SelectItem value="high">High (70+)</SelectItem>
              <SelectItem value="medium">Medium (50–70)</SelectItem>
              <SelectItem value="low">Low (&lt;50)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Country Opportunities */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base">Country Market Opportunities</CardTitle>
              <p className="text-xs text-muted-foreground">Weighted from Phase-2 signals · click a row for AI summary and drivers</p>
            </div>
            <Button size="sm" variant="outline" className="self-start sm:self-auto shrink-0" onClick={exportCountriesCSV}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="grid grid-cols-1 gap-3">
            {filteredCountries.map((c, i) => {
              const isOpen = expandedCountry === c.country.iso2;
              return (
                <div key={c.country.iso2} className="rounded-lg border border-border bg-card/50 p-3">
                  <button type="button" className="w-full text-left" onClick={() => setExpandedCountry(isOpen ? null : c.country.iso2)}>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
                      {isOpen ? <ChevronDown className="mt-0.5 h-4 w-4" /> : <ChevronRight className="mt-0.5 h-4 w-4" />}
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold">{c.country.name} <span className="text-xs text-muted-foreground">({c.country.iso2})</span></div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {c.products.length ? c.products.map((p) => <Badge key={p.product.id} variant="secondary" className="whitespace-normal break-words text-[10px]">{p.product.name}</Badge>) : <span className="text-xs text-muted-foreground">No matched products</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className={bandFromScore(c.opportunity).cls}>{c.sufficient ? c.recommendation : "Insufficient Data"}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-6">
                      <InfoCell label="Rank">#{i + 1}</InfoCell>
                      <InfoCell label="Demand">{c.demand != null ? <Badge variant="outline" className={bandFromScore(c.demand).cls}>{c.demand}</Badge> : "Insufficient"}</InfoCell>
                      <InfoCell label="Competition">{c.competition}</InfoCell>
                      <InfoCell label="Currency">{c.currencyAdvantage}</InfoCell>
                      <InfoCell label="Weather">{c.weatherStatus}</InfoCell>
                      <InfoCell label="Opportunity"><Badge variant="outline" className={bandFromScore(c.opportunity).cls}>{c.sufficient ? c.opportunity : "—"}</Badge></InfoCell>
                      <InfoCell label="Confidence">{c.sufficient ? `${c.confidence}%` : "—"}</InfoCell>
                      <InfoCell label="Updated">{relTime(c.latest)}</InfoCell>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-4 border-t border-border pt-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">AI Market Summary</h4>
                          <ul className="space-y-1 break-words pl-4 text-sm list-disc">
                            {c.summary.map((line, k) => <li key={k}>{line}</li>)}
                          </ul>
                          <h4 className="mb-2 mt-4 text-xs font-semibold uppercase text-muted-foreground">Score Breakdown (weighted)</h4>
                          <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                            {Object.entries(c.parts).map(([k, v]) => (
                              <div key={k} className="flex min-w-0 justify-between gap-2 border-b border-border/50 py-1">
                                <span className="break-words text-muted-foreground capitalize">{k} <span className="opacity-60">({Math.round((c.weights as any)[k] * 100)}%)</span></span>
                                <span className="shrink-0 tabular-nums font-medium">{Math.round(v as number)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recent News ({c.news.length})</h4>
                          {c.news.length === 0 ? <p className="text-xs text-muted-foreground">No news captured yet.</p> : (
                            <ul className="space-y-2 text-xs">
                              {c.news.map((n) => (
                                <li key={n.id} className="break-words">
                                  <SafeLink href={n.url} className="hover:underline">{n.headline}</SafeLink>
                                  <div className="text-muted-foreground">{n.source} · {relTime(n.published_at)}</div>
                                </li>
                              ))}
                            </ul>
                          )}
                          <h4 className="mb-2 mt-4 text-xs font-semibold uppercase text-muted-foreground">Evidence</h4>
                          <p className="text-xs text-muted-foreground">{c.evidence} signals combined · confidence {c.confidence}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Product Demand Intelligence */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Product Demand Intelligence</CardTitle>
          <p className="text-xs text-muted-foreground">Click a row for why-explanation, evidence, and price history</p>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {filteredProducts.map((p) => {
              const isOpen = expandedProduct === p.product.id;
              return (
                <div key={p.product.id} className="rounded-lg border border-border bg-card/50 p-3">
                  <button type="button" className="w-full text-left" onClick={() => setExpandedProduct(isOpen ? null : p.product.id)}>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
                      {isOpen ? <ChevronDown className="mt-0.5 h-4 w-4" /> : <ChevronRight className="mt-0.5 h-4 w-4" />}
                      <div className="min-w-0 break-words text-sm font-semibold">{p.product.name}</div>
                      <Badge variant="outline" className={p.sufficient && p.opportunity != null ? bandFromScore(p.opportunity).cls : "bg-muted text-muted-foreground"}>{p.sufficient ? "Active" : "Awaiting Data"}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <InfoCell label="HS">{p.product.hs_code ?? "—"}</InfoCell>
                      <InfoCell label="Demand">{p.sufficient && p.demand != null ? <Badge variant="outline" className={bandFromScore(p.demand).cls}>{p.demand}</Badge> : "Insufficient"}</InfoCell>
                      <InfoCell label="Opportunity">{p.sufficient && p.opportunity != null ? <Badge variant="outline" className={bandFromScore(p.opportunity).cls}>{p.opportunity}</Badge> : "—"}</InfoCell>
                      <InfoCell label="Confidence">{p.sufficient ? `${p.confidence}%` : "—"}</InfoCell>
                      <InfoCell label="Evidence">{p.evidenceCount}</InfoCell>
                      <InfoCell label="Trend">{p.priceTrend ?? "—"}</InfoCell>
                      <InfoCell label="Updated">{relTime(p.latest)}</InfoCell>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-4 border-t border-border pt-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Why this score?</h4>
                          {p.reasons.length === 0 ? <p className="text-xs text-muted-foreground">Insufficient evidence collected. Trigger a refresh.</p> :
                            <ul className="space-y-1 break-words text-sm">
                              {p.reasons.map((r, k) => <li key={k}>✓ {r}</li>)}
                            </ul>}
                          <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                            <InfoCell label="Confidence">{p.confidence}%</InfoCell>
                            <InfoCell label="Evidence">{p.evidenceCount} signals</InfoCell>
                            <InfoCell label="Sources">{p.sourceCount}</InfoCell>
                          </div>
                        </div>
                        <div>
                          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Price History (₹/kg)</h4>
                          {p.priceHistory.length ? (
                            <div className="flex h-16 items-end gap-1">
                              {p.priceHistory.map((v, k) => {
                                const max = Math.max(...p.priceHistory);
                                const h = max ? (v / max) * 100 : 0;
                                return <div key={k} className="flex-1 rounded-t bg-primary/40" style={{ height: `${h}%` }} title={`₹${v.toFixed(0)}`} />;
                              })}
                            </div>
                          ) : <p className="text-xs text-muted-foreground">No price observations yet.</p>}
                          {p.latestPrice && <p className="mt-2 break-words text-xs">Latest ₹{p.latestPrice.toFixed(0)}/kg · trend <b>{p.priceTrend ?? "n/a"}</b> {p.priceChangePct != null && `(${p.priceChangePct.toFixed(1)}%)`}</p>}
                          <h4 className="mb-2 mt-4 text-xs font-semibold uppercase text-muted-foreground">Related news</h4>
                          {p.newsSample.length === 0 ? <p className="text-xs text-muted-foreground">No news captured.</p> :
                            <ul className="space-y-1 text-xs">
                              {p.newsSample.map((n) => <li key={n.id} className="break-words"><SafeLink href={n.url} className="hover:underline">{n.headline}</SafeLink></li>)}
                            </ul>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Product × Country Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Product × Country Demand Matrix</CardTitle>
          <p className="text-xs text-muted-foreground">Heatmap of derived demand — Very High → Very Low</p>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="grid grid-cols-1 gap-3">
            {productIntel.filter((p) => p.sufficient).slice(0, 15).map((p) => (
              <div key={p.product.id} className="rounded-lg border border-border bg-card/50 p-3">
                <div className="mb-2 break-words text-sm font-semibold">{p.product.name}</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {filteredCountries.slice(0, 12).map((c) => {
                    const coNews = (news.data ?? []).filter((n) => n.product_id === p.product.id && n.country_iso2 === c.country.iso2).length;
                    const cell = p.demand != null && c.demand != null
                      ? Math.round((p.demand * 0.6) + (c.demand * 0.4) + coNews * 5)
                      : null;
                    const b = bandFromScore(cell);
                    return (
                      <div key={c.country.iso2} className={`min-w-0 rounded border px-2 py-1.5 text-center text-xs ${b.cls}`} title={cell != null ? `${cell}/100` : "no data"}>
                        <div className="font-semibold">{c.country.iso2}</div>
                        <div className="break-words text-[10px]">{cell != null ? `${b.emoji} ${b.label}` : "—"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Opportunities */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base">Top Export Opportunities</CardTitle>
              <p className="text-xs text-muted-foreground">Product × country pairs ranked by combined opportunity score</p>
            </div>
            <Button size="sm" variant="outline" className="self-start sm:self-auto shrink-0" onClick={exportOpportunitiesCSV}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {topOpportunities.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground flex items-center gap-2"><Info className="h-3.5 w-3.5" /> Not enough evidence yet — trigger a market refresh above.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 px-3 pb-3 xl:grid-cols-2">
              {topOpportunities.map((r, i) => (
                <div key={`${r.productId}-${r.iso2}`} className="rounded-lg border border-border bg-card/50 p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs tabular-nums text-muted-foreground">#{i + 1} · {r.country}</div>
                      <div className="break-words text-sm font-semibold">{r.product}</div>
                    </div>
                    <Badge variant="outline" className={bandFromScore(r.opportunity).cls}>{r.opportunity}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <InfoCell label="Confidence">{r.confidence}%</InfoCell>
                    <InfoCell label="Recommendation">{r.recommendation}</InfoCell>
                    <InfoCell label="Reason">{r.reason}</InfoCell>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ title, value, sub, icon }: { title: string; value: number | string; sub?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{title}</div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
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
