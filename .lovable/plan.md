# Global Market Intelligence — Phased Build Plan

## Reality check first

- Spec asks for 12 tables, 15+ data sources, AI forecasts, cron refresh, PDF/Excel/CSV export, filters, comparison tool, and a new nav section.
- Realistic build: **4–6 phases across multiple sessions**, not one turn. Shipping it in one pass will break existing PDF/quote flows and blow through credits.
- **No live customs/import records exist for free.** UN Comtrade is historical (6–18 month lag). Google Trends has no official API (unofficial `google-trends-api` npm is fragile). USDA/FAO/APEDA/Spices Board publish reports, not row-level trade feeds. So "demand score" will be a **composite signal** (Trends + news volume + price momentum + Comtrade history), not real import volume. This must be labeled honestly in the UI — the spec explicitly demands that.
- Firecrawl credits: each product × each country × each source = one search. 18 products × 10 countries × 4 signals = 720 calls per full refresh. Must cache aggressively (24h) and refresh via cron, never on user click for the full matrix.

## Phased scope

### Phase 1 — Foundation (this turn if approved)
1. Remove `BuyerIntelligence` tab and component. Keep `buyer-intel.ts` file for now in case we want to reuse the scoring heuristics.
2. Add new **"Market Intelligence"** top-level tab (rename existing per-product panel to "Product Benchmark" to avoid name collision, or nest it).
3. New Supabase tables (migration):
   - `mi_products` (code, name, hs_code, category) — seeded with the 18 products
   - `mi_countries` (iso2, name, region, currency)
   - `mi_signals` (product_id, country_iso2, signal_type, value, source, source_url, captured_at) — raw normalized signals
   - `mi_scores` (product_id, country_iso2, demand_score, opportunity_score, price_trend, competition, ai_recommendation, computed_at) — derived
   - `mi_news` (product_id, country_iso2, headline, url, source, sentiment, published_at)
   - RLS: authenticated read-all, service_role write; GRANTs included.
4. Ship **Table 1 (Global Product Demand)** and **Table 2 (Country Opportunities)** wired to `mi_scores`, with proper source/last-updated columns and empty-state.

### Phase 2 — Data pipeline
5. `refreshMarketIntelligence` server function: pulls Google News RSS (free, no key), exchange rates (already in app), and Firecrawl for Spices Board / APEDA weekly reports. Writes to `mi_signals`.
6. `computeMarketScores` server function: derives `mi_scores` from signals using a documented formula (price momentum weight, news volume weight, trend weight).
7. Cron job (`pg_cron` daily at 06:00 IST) hits `/api/public/hooks/refresh-mi` which chains refresh + compute.
8. Manual "Refresh now" button gated to 1×/hour per user.

### Phase 3 — Analytical tables
9. Table 3 (Country×Product heatmap matrix, color-coded).
10. Table 11 (Top product-country opportunities — derived view).
11. Table 12 (Products in Demand — subset of Table 1 sorted by demand).
12. Table 8 (Market News feed from `mi_news`).

### Phase 4 — Deep-dive tables
13. Table 4 (Market Intel per country: trend/sentiment/weather).
14. Table 6 (Freight — reuses existing shipping-distance data + Firecrawl for congestion news).
15. Table 9 (Price History — needs 90-day retention of `mi_signals` price rows; chart with Recharts).
16. Table 10 (Country comparison — pick up to 5).

### Phase 5 — Regulatory & competitive
17. Table 5 (Regulations — hand-curated seed for top 10 destinations, Firecrawl-refreshed monthly).
18. Table 7 (Competitor countries — from Comtrade historical top-suppliers snapshot, seeded).

### Phase 6 — AI layer + polish
19. `generateMarketOutlook` server fn using Lovable AI (google/gemini-2.5-flash) — produces evidence-based per-product summary from the signals we already stored (no hallucination: it only sees `mi_signals` + `mi_news` rows). Cached in `mi_scores.ai_recommendation`.
20. 30/60/90-day forecast (labeled "AI Forecast — Indicative") using price/trend momentum + AI narrative.
21. KPI cards row at top of dashboard.
22. Filters bar, global search, PDF/Excel/CSV/Print export for each table.
23. Skeleton loaders, sticky headers, pagination, row-expansion for evidence trail.

## Technical notes

- **All server-side** via `createServerFn` (app-internal) and one server route for the cron (`/api/public/hooks/refresh-mi`).
- Firecrawl already connected; no new secrets.
- Lovable AI already available; no new secrets.
- Charts via existing Recharts (already in project).
- Table via TanStack Table (needs `bun add @tanstack/react-table` in Phase 3).
- Every row in every table carries a `source_url` and `captured_at` — non-negotiable per spec.
- "Live signal" vs "Historical" vs "AI forecast" badges shown on every derived value.

## What I need from you

1. **Approve the phasing.** I'll only build Phase 1 this turn (~600 lines, one migration, two tables rendered). Everything else waits for your go-ahead per phase.
2. **Confirm remove-and-replace of Buyer Intelligence.** The old tab disappears; the buyer due-diligence scoring stays available as a file but no UI until/unless you want it back.
3. **Confirm the "composite demand score" framing** — I cannot give you actual import volumes without a paid Panjiva/ImportGenius/Comtrade+ subscription. Everything shown will be a public-signal composite, clearly labeled.
