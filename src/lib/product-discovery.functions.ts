import { createServerFn } from "@tanstack/react-start";
import { requireCronSecret } from "./require-cron-secret";

/**
 * Phase 5 — Dynamic Product Discovery Engine.
 *
 * Continuously scans public trade signals (Firecrawl search across news,
 * APEDA, DGFT, Spices Board, engineering / chemical / textile trade sites)
 * and uses the Lovable AI Gateway to extract distinct export products,
 * their industry, and (if inferrable) their HS code. New products are
 * auto-upserted into mi_products so downstream dashboards grow themselves
 * without any code changes.
 *
 * Zero hardcoded product lists — the seed queries only describe the
 * *sources* to look at, never the products expected to appear.
 */

const DISCOVERY_QUERIES = [
  "top export products from India this week",
  "trending Indian exports rising demand",
  "APEDA weekly export bulletin India top commodities",
  "DGFT rising export categories India",
  "Spices Board India latest export shipment volumes",
  "engineering goods India export leaders this month",
  "chemical exports India rising demand this week",
  "textile garments India export trends this week",
  "pharma API exports India buyer demand",
  "electronics EMS exports India rising",
  "renewable energy solar exports India rising",
  "marine seafood exports India rising demand",
  "handicrafts leather exports India rising demand",
  "building materials granite tiles exports India rising",
];

const INDUSTRIES = [
  "Agriculture","Food Processing","Beverages","Chemicals","Pharmaceuticals",
  "Engineering","Electrical","Textiles","Leather","Furniture",
  "Building Materials","Plastics","Automotive","Electronics","Renewable Energy",
  "Packaging","Handicrafts","Gems & Jewellery","Rubber","Paper","Marine","Minerals","Uncategorized",
];

type CollectorResult = {
  source_key: string;
  ok: boolean;
  records: number;
  duration_ms: number;
  error?: string;
};

type DiscoveredProduct = {
  name: string;
  industry: string;
  hs_code: string | null;
  confidence: number; // 0..1
  search_terms?: string[];
  source_url?: string | null;
  source_title?: string | null;
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function normName(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

async function firecrawlSearchBatch(apiKey: string, query: string) {
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit: 5,
      tbs: "qdr:w",
      scrapeOptions: { onlyMainContent: true, formats: ["markdown"] },
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl HTTP ${res.status}`);
  const data: any = await res.json();
  const hits = data?.data?.web ?? data?.web ?? data?.data ?? [];
  return (Array.isArray(hits) ? hits : []).map((h: any) => ({
    title: h?.metadata?.title ?? h?.title ?? "",
    url: h?.url ?? h?.metadata?.sourceURL ?? null,
    markdown: (h?.markdown ?? "").slice(0, 3500),
  })).filter((h: any) => h.markdown);
}

async function classifyWithLLM(
  apiKey: string,
  snippets: { title: string; url: string | null; markdown: string }[],
): Promise<DiscoveredProduct[]> {
  const industriesList = INDUSTRIES.join(", ");
  const context = snippets
    .map((s, i) => `--- SOURCE ${i + 1} (${s.title || s.url || "web"}) ---\n${s.markdown}`)
    .join("\n\n")
    .slice(0, 60_000);

  const system = `You are an export trade intelligence analyst. Read snippets from Indian export news / trade sources and extract DISTINCT export PRODUCTS (not company names, not country names, not generic categories).

Return a JSON object: {"products": [ { "name": string, "industry": string, "hs_code": string|null, "confidence": number, "search_terms": string[] } ] }

Rules:
- name: specific, singular product a customs broker would recognise (e.g. "Hex Bolts SS304", "Basmati Rice", "Solar Inverter", "Turmeric Powder", "Frozen Shrimp"). Not "spices" or "food".
- industry: MUST be one of: ${industriesList}. If unsure, use "Uncategorized".
- hs_code: 4-8 digit HS code as a string if you are confident, otherwise null.
- confidence: 0..1 how sure the source shows meaningful export/trade activity for this product.
- search_terms: 2-4 alternative names / synonyms useful for further scraping.
- Return up to 30 products across ALL industries visible in the snippets. No duplicates.
- If snippets contain no real product signal, return {"products":[]}.
Return ONLY the JSON object, no prose.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: context || "No snippets." },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI Gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const json: any = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "{}";
  let parsed: any = {};
  try { parsed = JSON.parse(content); } catch { parsed = {}; }
  const list = Array.isArray(parsed.products) ? parsed.products : [];
  const cleaned: DiscoveredProduct[] = [];
  for (const p of list) {
    const name = normName(String(p?.name ?? ""));
    if (!name || name.length < 3 || name.length > 80) continue;
    const industry = INDUSTRIES.includes(String(p?.industry)) ? String(p.industry) : "Uncategorized";
    const hs = p?.hs_code ? String(p.hs_code).replace(/[^0-9]/g, "").slice(0, 10) : null;
    const conf = Math.max(0, Math.min(1, Number(p?.confidence ?? 0.5)));
    const terms = Array.isArray(p?.search_terms)
      ? p.search_terms.map((x: any) => String(x)).filter(Boolean).slice(0, 4)
      : [];
    cleaned.push({ name, industry, hs_code: hs || null, confidence: conf, search_terms: terms });
  }
  return cleaned;
}

export async function runProductDiscovery(admin: any, orgId: string): Promise<CollectorResult> {
  const t0 = Date.now();
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  const aiKey = process.env.LOVABLE_API_KEY;
  if (!firecrawlKey) return { source_key: "discovery.trends", ok: false, records: 0, duration_ms: 0, error: "FIRECRAWL_API_KEY missing" };
  if (!aiKey) return { source_key: "discovery.trends", ok: false, records: 0, duration_ms: 0, error: "LOVABLE_API_KEY missing" };

  // Sample 4 queries per run so we stay under Firecrawl cost and rotate coverage.
  const shuffled = [...DISCOVERY_QUERIES].sort(() => Math.random() - 0.5).slice(0, 4);
  const errors: string[] = [];
  const snippets: { title: string; url: string | null; markdown: string }[] = [];

  await Promise.all(
    shuffled.map(async (q) => {
      try {
        const batch = await firecrawlSearchBatch(firecrawlKey, q);
        snippets.push(...batch);
      } catch (e: any) {
        errors.push(`${q}: ${e?.message ?? e}`);
      }
    }),
  );

  if (!snippets.length) {
    return { source_key: "discovery.trends", ok: false, records: 0, duration_ms: Date.now() - t0, error: errors.slice(0, 2).join("; ") || "no snippets" };
  }

  let discovered: DiscoveredProduct[] = [];
  try {
    discovered = await classifyWithLLM(aiKey, snippets);
  } catch (e: any) {
    return { source_key: "discovery.trends", ok: false, records: 0, duration_ms: Date.now() - t0, error: String(e?.message ?? e) };
  }

  if (!discovered.length) {
    return { source_key: "discovery.trends", ok: true, records: 0, duration_ms: Date.now() - t0, error: "LLM returned no products" };
  }

  const { data: existing } = await admin.from("mi_products").select("id,name,evidence_count,source_count,industry,hs_code");
  const byName = new Map<string, any>();
  for (const row of existing ?? []) byName.set(String(row.name).toLowerCase(), row);

  const now = new Date().toISOString();
  let inserted = 0;
  let updated = 0;

  for (const d of discovered) {
    const key = d.name.toLowerCase();
    const found = byName.get(key);
    if (found) {
      await admin.from("mi_products").update({
        evidence_count: (found.evidence_count ?? 0) + 1,
        source_count: (found.source_count ?? 0) + Math.min(snippets.length, 4),
        industry: found.industry ?? d.industry,
        hs_code: found.hs_code ?? d.hs_code,
        last_seen_at: now,
      }).eq("id", found.id);
      updated++;
    } else {
      const code = slugify(d.name) || `p-${Math.random().toString(36).slice(2, 8)}`;
      const { error } = await admin.from("mi_products").insert({
        org_id: orgId,
        code,
        name: d.name,
        hs_code: d.hs_code,
        category: d.industry,
        industry: d.industry,
        discovered_from: "discovery.trends",
        discovery_confidence: d.confidence,
        evidence_count: 1,
        source_count: Math.min(snippets.length, 4),
        status: d.industry === "Uncategorized" || d.confidence < 0.4 ? "review" : "active",
        last_seen_at: now,
        search_terms: d.search_terms ?? null,
      });
      if (!error) inserted++;
    }
  }

  await admin.from("mi_signals").insert({
    org_id: orgId,
    signal_type: "product_discovery",
    value: discovered.length,
    source: "Discovery Engine",
    source_url: null,
    meta: {
      inserted, updated,
      queries: shuffled,
      sample_products: discovered.slice(0, 10).map((d) => d.name),
    },
  });


  return {
    source_key: "discovery.trends",
    ok: true,
    records: inserted + updated,
    duration_ms: Date.now() - t0,
    error: errors.length ? errors.slice(0, 2).join("; ") : undefined,
  };
}

// Standalone endpoint for the UI "Discover Products" button.
export const discoverProducts = createServerFn({ method: "POST" })
  .handler(async () => {
  requireCronSecret();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin;
  const { data: globalOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", "vaaldrin-global")
    .maybeSingle();
  if (!globalOrg?.id) throw new Error("Global MI org (vaaldrin-global) missing.");
  const result = await runProductDiscovery(admin, globalOrg.id as string);
  const now = new Date().toISOString();
  await admin.from("mi_source_health").update({
    last_attempt_at: now,
    status: result.ok ? "healthy" : "failed",
    records_last_run: result.records,
    duration_ms: result.duration_ms,
    last_error: result.error ?? null,
    ...(result.ok ? { last_success_at: now } : {}),
  }).eq("source_key", "discovery.trends");
  return result;
});

