import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Phase 2 pipeline — live/latest-available market intelligence collectors.
 * Each collector fetches from a public source, writes rows to mi_signals /
 * mi_news, and updates mi_source_health with status + duration + record count.
 *
 * No fabricated data. Every value carries source, source_url, captured_at.
 * All labels (live / latest_available / historical / ai) come from
 * mi_source_health.data_type — the UI never invents freshness.
 */

const FX_CURRENCIES = ["USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"];

// Static geographic capitals (not market data — required to hit weather API)
const COUNTRY_COORDS: Record<string, { name: string; lat: number; lon: number }> = {
  IN: { name: "New Delhi", lat: 28.61, lon: 77.21 },
  US: { name: "Washington", lat: 38.9, lon: -77.04 },
  GB: { name: "London", lat: 51.51, lon: -0.13 },
  AE: { name: "Dubai", lat: 25.2, lon: 55.27 },
  SG: { name: "Singapore", lat: 1.35, lon: 103.82 },
  AU: { name: "Sydney", lat: -33.87, lon: 151.21 },
  CA: { name: "Toronto", lat: 43.65, lon: -79.38 },
  DE: { name: "Berlin", lat: 52.52, lon: 13.4 },
  FR: { name: "Paris", lat: 48.85, lon: 2.35 },
  NL: { name: "Amsterdam", lat: 52.37, lon: 4.89 },
  JP: { name: "Tokyo", lat: 35.68, lon: 139.69 },
  SA: { name: "Riyadh", lat: 24.71, lon: 46.68 },
};

type CollectorResult = {
  source_key: string;
  ok: boolean;
  records: number;
  duration_ms: number;
  error?: string;
};

async function markHealth(
  admin: any,
  key: string,
  result: Omit<CollectorResult, "source_key">,
) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    last_attempt_at: now,
    status: result.ok ? "healthy" : "failed",
    records_last_run: result.records,
    duration_ms: result.duration_ms,
    last_error: result.error ?? null,
  };
  if (result.ok) patch.last_success_at = now;
  await admin.from("mi_source_health").update(patch).eq("source_key", key);
}

// ----- FX collector -----
async function collectFx(admin: any, orgId: string): Promise<CollectorResult> {
  const t0 = Date.now();
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: any = await res.json();
    if (json.result !== "success") throw new Error(json["error-type"] ?? "unknown");
    const rows = FX_CURRENCIES.filter((c) => c !== "USD").map((c) => ({
      org_id: orgId,
      signal_type: "fx_rate",
      value: Number(json.rates[c]),
      source: "open.er-api.com",
      source_url: "https://open.er-api.com/v6/latest/USD",
      meta: { base: "USD", quote: c, provider_time: json.time_last_update_utc },
    }));
    // INR/USD as its own row for convenience
    rows.push({
      org_id: orgId,
      signal_type: "fx_rate",
      value: Number(json.rates.INR),
      source: "open.er-api.com",
      source_url: "https://open.er-api.com/v6/latest/USD",
      meta: { base: "USD", quote: "INR", provider_time: json.time_last_update_utc },
    });
    const { error } = await admin.from("mi_signals").insert(rows);
    if (error) throw error;
    return { source_key: "fx.erapi", ok: true, records: rows.length, duration_ms: Date.now() - t0 };
  } catch (e: any) {
    return { source_key: "fx.erapi", ok: false, records: 0, duration_ms: Date.now() - t0, error: String(e?.message ?? e) };
  }
}


// ----- Weather collector -----
async function collectWeather(admin: any, countries: { iso2: string }[], orgId: string): Promise<CollectorResult> {
  const t0 = Date.now();
  let records = 0;
  const errors: string[] = [];
  try {
    await Promise.all(
      countries.map(async (c) => {
        const coord = COUNTRY_COORDS[c.iso2];
        if (!coord) return;
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lon}&current=temperature_2m,precipitation,wind_speed_10m&timezone=UTC`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json: any = await res.json();
          await admin.from("mi_signals").insert({
            org_id: orgId,
            signal_type: "weather",
            country_iso2: c.iso2,
            value: json.current?.temperature_2m ?? null,
            source: "Open-Meteo",
            source_url: url,
            meta: {
              region: coord.name,
              temperature_c: json.current?.temperature_2m,
              precipitation_mm: json.current?.precipitation,
              wind_kmh: json.current?.wind_speed_10m,
              as_of: json.current?.time,
            },
          });
          records++;
        } catch (e: any) {
          errors.push(`${c.iso2}: ${e?.message ?? e}`);
        }
      }),
    );
    return {
      source_key: "weather.open-meteo",
      ok: records > 0,
      records,
      duration_ms: Date.now() - t0,
      error: errors.length && !records ? errors.join("; ") : undefined,
    };
  } catch (e: any) {
    return { source_key: "weather.open-meteo", ok: false, records, duration_ms: Date.now() - t0, error: String(e?.message ?? e) };
  }
}


// ----- News (Google RSS) collector -----
function decodeXml(s: string) {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRss(xml: string) {
  const items: { title: string; link: string; source: string; pubDate: string }[] = [];
  const matches = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
  for (const item of matches) {
    const title = item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? "";
    const link = item.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] ?? "";
    const pub = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
    const src = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "";
    if (title && link) {
      items.push({
        title: decodeXml(title).trim(),
        link: link.trim(),
        source: decodeXml(src).trim(),
        pubDate: pub.trim(),
      });
    }
  }
  return items;
}

async function collectNews(admin: any, products: { id: string; name: string }[], orgId: string): Promise<CollectorResult> {
  const t0 = Date.now();
  let records = 0;
  const errors: string[] = [];
  try {
    // limit to first 12 products per run to stay polite
    const targets = products.slice(0, 12);
    await Promise.all(
      targets.map(async (p) => {
        try {
          const q = encodeURIComponent(`${p.name} export India OR price OR demand`);
          const url = `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;
          const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (VaaldrinBot)" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const xml = await res.text();
          const items = parseRss(xml).slice(0, 6);
          for (const it of items) {
            const { error } = await admin
              .from("mi_news")
              .upsert(
                {
                  org_id: orgId,
                  product_id: p.id,
                  headline: it.title,
                  url: it.link,
                  source: it.source || "Google News",
                  published_at: it.pubDate ? new Date(it.pubDate).toISOString() : null,
                  summary: null,
                },
                { onConflict: "url", ignoreDuplicates: true },
              );
            if (!error) records++;
          }
          // also write a "news_volume" signal for demand scoring
          await admin.from("mi_signals").insert({
            org_id: orgId,
            signal_type: "news_volume",
            product_id: p.id,
            value: items.length,
            source: "Google News",
            source_url: url,
            meta: { window: "recent" },
          });
        } catch (e: any) {
          errors.push(`${p.name}: ${e?.message ?? e}`);
        }
      }),
    );
    return {
      source_key: "news.google",
      ok: records > 0 || errors.length === 0,
      records,
      duration_ms: Date.now() - t0,
      error: errors.length ? errors.slice(0, 3).join("; ") : undefined,
    };
  } catch (e: any) {
    return { source_key: "news.google", ok: false, records, duration_ms: Date.now() - t0, error: String(e?.message ?? e) };
  }
}

// ----- Commodity prices via Firecrawl (APEDA / Spices Board) -----
async function collectCommodityPrices(admin: any, products: { id: string; name: string }[], orgId: string): Promise<CollectorResult> {

  const t0 = Date.now();
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return { source_key: "commodity.apeda", ok: false, records: 0, duration_ms: 0, error: "FIRECRAWL_API_KEY missing" };
  }
  let records = 0;
  const errors: string[] = [];
  // bound cost: first 6 products
  const targets = products.slice(0, 6);
  await Promise.all(
    targets.map(async (p) => {
      try {
        const query = `${p.name} export price India today INR per kg APEDA OR Spices Board`;
        const res = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            limit: 3,
            tbs: "qdr:w",
            scrapeOptions: {
              onlyMainContent: true,
              formats: [
                {
                  type: "json",
                  prompt: `Extract the most recent wholesale/export price for "${p.name}" from India. Return ONLY JSON: {"rawPrice": number|null, "unit": "kg"|"quintal"|"tonne"|null, "currency": "INR"|"USD"|null, "asOf": string|null}. If nothing reliable, all null.`,
                },
              ],
            },
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: any = await res.json();
        const hits = data?.data?.web ?? data?.web ?? data?.data ?? [];
        for (const hit of Array.isArray(hits) ? hits : []) {
          const json = hit?.json ?? hit?.extract ?? null;
          if (!json?.rawPrice) continue;
          const unit = String(json.unit ?? "kg").toLowerCase();
          const currency = String(json.currency ?? "INR").toUpperCase();
          const divisor = unit === "quintal" ? 100 : unit === "tonne" ? 1000 : 1;
          const perKg = Number(json.rawPrice) / divisor;
          if (!Number.isFinite(perKg) || perKg <= 0 || perKg > 100000) continue;
          await admin.from("mi_signals").insert({
            signal_type: "commodity_price",
            product_id: p.id,
            value: perKg,
            source: hit?.metadata?.title || hit?.title || "APEDA/Firecrawl",
            source_url: hit?.url ?? hit?.metadata?.sourceURL ?? null,
            meta: { currency, unit, raw_price: json.rawPrice, as_of: json.asOf ?? null },
          });
          records++;
          break;
        }
      } catch (e: any) {
        errors.push(`${p.name}: ${e?.message ?? e}`);
      }
    }),
  );
  return {
    source_key: "commodity.apeda",
    ok: records > 0,
    records,
    duration_ms: Date.now() - t0,
    error: errors.length && records === 0 ? errors.slice(0, 3).join("; ") : undefined,
  };
}

// ----- Score computation from signals -----
async function computeScores(admin: any, products: { id: string }[], countries: { iso2: string }[]) {
  const { data: signals } = await admin
    .from("mi_signals")
    .select("*")
    .in("signal_type", ["news_volume", "commodity_price", "fx_rate"])
    .gte("captured_at", new Date(Date.now() - 7 * 864e5).toISOString());
  const sigs = signals ?? [];
  const now = new Date().toISOString();
  const rows: any[] = [];
  for (const p of products) {
    const news = sigs.filter((s: any) => s.product_id === p.id && s.signal_type === "news_volume");
    const prices = sigs.filter((s: any) => s.product_id === p.id && s.signal_type === "commodity_price");
    if (!news.length && !prices.length) continue;
    const avgNews = news.length ? news.reduce((a: number, s: any) => a + (s.value ?? 0), 0) / news.length : 0;
    const avgPrice = prices.length ? prices.reduce((a: number, s: any) => a + Number(s.value ?? 0), 0) / prices.length : null;
    // demand score: normalize news volume (0-30 headlines) → 0-100
    const demand = Math.min(100, Math.round((avgNews / 30) * 100));
    // trend from first vs last price
    const trend = prices.length >= 2
      ? (Number(prices[0].value) > Number(prices[prices.length - 1].value) ? "rising" : "falling")
      : "stable";
    const opportunity = Math.min(100, Math.round(demand * 0.7 + (prices.length ? 30 : 0)));
    rows.push({
      product_id: p.id,
      country_iso2: null,
      demand_score: demand,
      opportunity_score: opportunity,
      price_trend: trend,
      avg_price_usd: avgPrice ? Number((avgPrice / 83).toFixed(2)) : null,
      competition: null,
      supply_situation: null,
      ai_recommendation: null,
      evidence: { news_signals: news.length, price_signals: prices.length },
      computed_at: now,
    });
  }
  if (rows.length) await admin.from("mi_scores").insert(rows);
  return rows.length;
}

// ============ ORCHESTRATOR ============
// Internal runner — no middleware. Callable from the authenticated server fn
// below AND from the CRON_SECRET-protected /api/public/hooks/refresh-mi route.
export async function runRefreshMarketIntelligence(data: { sources?: string[] } = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin;
  const [{ data: products }, { data: countries }, { data: health }] = await Promise.all([
    admin.from("mi_products").select("id,name"),
    admin.from("mi_countries").select("iso2"),
    admin.from("mi_source_health").select("*"),
  ]);
  const now = Date.now();
  const filter = data?.sources && data.sources.length ? new Set(data.sources) : null;
  const isDue = (key: string) => {
    if (filter) return filter.has(key);
    const h = (health ?? []).find((x: any) => x.source_key === key);
    if (!h || !h.last_success_at) return true;
    return now - new Date(h.last_success_at).getTime() > h.refresh_interval_minutes * 60000;
  };

  const jobs: Promise<CollectorResult>[] = [];
  if (isDue("fx.erapi")) jobs.push(collectFx(admin));
  if (isDue("weather.open-meteo") && countries?.length) jobs.push(collectWeather(admin, countries));
  if (isDue("news.google") && products?.length) jobs.push(collectNews(admin, products));
  if (isDue("commodity.apeda") && products?.length) jobs.push(collectCommodityPrices(admin, products));
  if (isDue("discovery.trends")) {
    const { runProductDiscovery } = await import("./product-discovery.functions");
    jobs.push(runProductDiscovery(admin));
  }

  const results = await Promise.all(jobs);
  for (const r of results) await markHealth(admin, r.source_key, r);

  let scoresWritten = 0;
  if (products?.length && countries?.length) {
    try { scoresWritten = await computeScores(admin, products, countries); } catch (e) { console.error(e); }
  }

  return {
    ran: results.length,
    results,
    scoresWritten,
    skipped: (health ?? []).filter((h: any) => !results.find((r) => r.source_key === h.source_key)).map((h: any) => h.source_key),
    at: new Date().toISOString(),
  };
}

export const refreshMarketIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sources?: string[] } | undefined) => data ?? {})
  .handler(async ({ data }) => runRefreshMarketIntelligence(data));

export const getMarketHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("mi_source_health").select("*").order("category");
  if (error) throw error;
  return data ?? [];
});
