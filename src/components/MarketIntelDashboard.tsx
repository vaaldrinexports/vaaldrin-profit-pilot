import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowRight, ArrowUp, Globe2, Search, TrendingUp } from "lucide-react";

type Product = { id: string; code: string; name: string; hs_code: string | null; category: string | null };
type Country = { iso2: string; name: string; region: string | null; currency: string | null };
type Score = {
  id: string;
  product_id: string;
  country_iso2: string | null;
  demand_score: number | null;
  opportunity_score: number | null;
  competition: string | null;
  price_trend: string | null;
  avg_price_usd: number | null;
  supply_situation: string | null;
  ai_recommendation: string | null;
  computed_at: string;
};

function useMarketData() {
  const products = useQuery({
    queryKey: ["mi_products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mi_products").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
  const countries = useQuery({
    queryKey: ["mi_countries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mi_countries").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Country[];
    },
  });
  const scores = useQuery({
    queryKey: ["mi_scores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mi_scores").select("*");
      if (error) throw error;
      return (data ?? []) as Score[];
    },
  });
  return { products, countries, scores };
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

export default function MarketIntelDashboard() {
  const { products, countries, scores } = useMarketData();
  const [q, setQ] = useState("");

  const productScores = useMemo(() => {
    const list = (products.data ?? []).map((p) => {
      const rows = (scores.data ?? []).filter((s) => s.product_id === p.id);
      const agg = rows.reduce(
        (a, r) => {
          if (r.demand_score != null) { a.demand += Number(r.demand_score); a.dn++; }
          if (r.opportunity_score != null) { a.opp += Number(r.opportunity_score); a.on++; }
          if (r.avg_price_usd != null) { a.price += Number(r.avg_price_usd); a.pn++; }
          if (r.country_iso2) a.countries.add(r.country_iso2);
          if (r.price_trend) a.trends.push(r.price_trend);
          return a;
        },
        { demand: 0, dn: 0, opp: 0, on: 0, price: 0, pn: 0, countries: new Set<string>(), trends: [] as string[] },
      );
      const trend = agg.trends[0] ?? null;
      return {
        product: p,
        demand: agg.dn ? agg.demand / agg.dn : null,
        opportunity: agg.on ? agg.opp / agg.on : null,
        avgPrice: agg.pn ? agg.price / agg.pn : null,
        countries: Array.from(agg.countries),
        trend,
        lastUpdated: rows[0]?.computed_at ?? null,
      };
    });
    const filtered = q ? list.filter((r) => r.product.name.toLowerCase().includes(q.toLowerCase())) : list;
    return filtered.sort((a, b) => (b.opportunity ?? -1) - (a.opportunity ?? -1));
  }, [products.data, scores.data, q]);

  const countryScores = useMemo(() => {
    const map = new Map<string, { country: Country; demand: number; dn: number; opp: number; on: number; products: Set<string> }>();
    for (const c of countries.data ?? []) map.set(c.iso2, { country: c, demand: 0, dn: 0, opp: 0, on: 0, products: new Set() });
    for (const s of scores.data ?? []) {
      if (!s.country_iso2) continue;
      const row = map.get(s.country_iso2);
      if (!row) continue;
      if (s.demand_score != null) { row.demand += Number(s.demand_score); row.dn++; }
      if (s.opportunity_score != null) { row.opp += Number(s.opportunity_score); row.on++; }
      const p = (products.data ?? []).find((x) => x.id === s.product_id);
      if (p) row.products.add(p.name);
    }
    return Array.from(map.values())
      .map((r) => ({
        country: r.country,
        demand: r.dn ? r.demand / r.dn : null,
        opportunity: r.on ? r.opp / r.on : null,
        products: Array.from(r.products).slice(0, 4),
      }))
      .sort((a, b) => (b.opportunity ?? -1) - (a.opportunity ?? -1));
  }, [countries.data, scores.data, products.data]);

  const loading = products.isLoading || countries.isLoading || scores.isLoading;
  const hasScores = (scores.data?.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2 bg-primary/10 text-primary"><Globe2 className="h-5 w-5" /></div>
              <div>
                <CardTitle className="text-lg">Global Market Intelligence</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Composite public-signal scores · not customs import records ·{" "}
                  {hasScores ? `${scores.data!.length} data points` : "awaiting data pipeline (Phase 2)"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1"><TrendingUp className="h-3 w-3" /> Phase 1</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!hasScores && !loading && (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <div className="mx-auto rounded-full h-12 w-12 bg-muted flex items-center justify-center">
              <Globe2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium">No market data yet</div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Products ({products.data?.length ?? 0}) and destination markets ({countries.data?.length ?? 0}) are seeded.
              The daily scraping pipeline (Google News · Spices Board · APEDA · FX · Firecrawl) will populate demand
              scores, price trends and opportunities in Phase 2.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Table 1 — Global Product Demand */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">Global Product Demand</CardTitle>
            <p className="text-xs text-muted-foreground">Which products are being bought right now — composite signal across {countries.data?.length ?? 0} destinations</p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product…" className="pl-8 h-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground sticky top-0">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                  <th className="w-10">#</th>
                  <th>Product</th>
                  <th>HS</th>
                  <th className="text-right">Demand</th>
                  <th className="text-right">Opportunity</th>
                  <th>Trend</th>
                  <th className="text-right">Avg Price (USD/kg)</th>
                  <th>Countries buying</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border">
                {productScores.map((r, i) => (
                  <tr key={r.product.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{r.product.name}</td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{r.product.hs_code ?? "—"}</td>
                    <td className="px-3 py-2 text-right"><ScoreCell v={r.demand} /></td>
                    <td className="px-3 py-2 text-right"><ScoreCell v={r.opportunity} /></td>
                    <td className="px-3 py-2"><TrendChip trend={r.trend} /></td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.avgPrice != null ? `$${r.avgPrice.toFixed(2)}` : "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {r.countries.length ? r.countries.slice(0, 5).join(", ") : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {r.lastUpdated ? new Date(r.lastUpdated).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {!productScores.length && !loading && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-xs text-muted-foreground">No matching products.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Table 2 — Country Opportunities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Country Market Opportunities</CardTitle>
          <p className="text-xs text-muted-foreground">Which destinations to target · aggregated across all products</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground sticky top-0">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                  <th className="w-10">#</th>
                  <th>Country</th>
                  <th>Region</th>
                  <th>Currency</th>
                  <th className="text-right">Demand</th>
                  <th className="text-right">Opportunity</th>
                  <th>Products in demand</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border">
                {countryScores.map((r, i) => (
                  <tr key={r.country.iso2} className="hover:bg-muted/30">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{r.country.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.country.region ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.country.currency ?? "—"}</td>
                    <td className="px-3 py-2 text-right"><ScoreCell v={r.demand} /></td>
                    <td className="px-3 py-2 text-right"><ScoreCell v={r.opportunity} /></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {r.products.length ? r.products.join(", ") : "—"}
                    </td>
                  </tr>
                ))}
                {!countryScores.length && !loading && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-muted-foreground">No countries seeded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground px-1">
        Data policy · Scores are composite indicators from public signals (news volume, price momentum, FX, historical trade). They are not real-time customs records. Every row will carry source attribution and "last updated" once the Phase 2 pipeline lands.
      </p>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => { products.refetch(); countries.refetch(); scores.refetch(); }}>
          Reload
        </Button>
      </div>
    </div>
  );
}
