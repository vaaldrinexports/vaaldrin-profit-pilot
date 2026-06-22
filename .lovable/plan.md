# Fix the 10 critique items

Grouping the work by file so each pass touches one area cleanly.

## 1. Default state + validation gate (issues 1, 2, 7)
**`src/components/Calculator.tsx`**
- On first load (no saved state in localStorage), seed `defaultState` with a realistic demo: 1,000 kg cardamom, supplier ₹2,200/kg, FOB Chennai → Dubai, buyer "Demo Buyer LLC / UAE".
- Add an `inputsReady` flag: `quantity > 0 && supplierPricePerKg > 0 && sellingPricePerUnit > 0`.
- When false: hide Profit/Deal Quality/Walk-away cards and the Quotation/Documents tabs' previews, and render a single full-width "Enter quantity, supplier cost and selling price to generate a quote" empty-state card with a "Load demo shipment" button.
- Move the "Pricing Validation Error" block to the top of the dashboard as a red banner, not mid-page.

## 2. Live forex with refresh + timestamp (issue 3)
**`src/components/Calculator.tsx`** already fetches `open.er-api.com` on mount (added previously). Add:
- Manual "Refresh rates" button next to the FX rate display.
- Show "Live rate · fetched {time ago}" badge; warn in amber if `fxLastUpdated` is older than 12 h.
- Fallback to last cached rate (persisted in localStorage) if the API fails, with a "Cached rate" badge.

## 3. Buyer Intelligence honesty (issue 4)
**`src/components/BuyerIntelligence.tsx`**
- Keep the heuristic checks (they are real: TLD/email/phone/country consistency, sanctions keyword scan, country risk). 
- Rename the empty-state copy from "run automated verification" to "Run public-signal checks (domain, email, phone, country risk). Not a credit rating." 
- Add an explicit "What this checks" expandable list so the user can see the 10 signals being evaluated.
- Add an optional outbound link button: "Search on OpenCorporates" → `https://opencorporates.com/companies?q={company}` (no API key needed).

## 4. Market Intelligence sourcing (issue 5)
**`src/components/MarketIntelligence.tsx`**
- The empty-state already says "Select a product…". Append: "Benchmarks are static reference prices compiled from APEDA, Spices Board & state APMC sources — see source + date on each card."
- The data card already shows Source + Updated; add a small "Benchmark Price · static reference" badge so users never mistake it for live mandi data.

## 5. PDF completeness (issue 6)
**`src/lib/pdf.ts`**
- Header block: company name, address, IEC, GSTIN, FSSAI, email, phone (all from `s.company*`).
- Add AD Code field to Admin → Company profile, render on Proforma Invoice.
- Bank details block on Proforma Invoice (already present — verify SWIFT, account, branch, IFSC).
- Add "Port of Loading", "Port of Discharge", "Incoterms 2020" line to every shipping-document footer.
- Add "E&OE — Errors & Omissions Excepted" footer on quotation.
- Signature block: "For {companyName} / Authorised Signatory" with line.

## 6. Walk-away tooltip (issue 8)
**`src/components/Calculator.tsx`**
- Wrap the Walk-away and Minimum-price labels in `Tooltip`/`HoverCard`:
  - Walk-away: "Selling price at which net profit = 0 after all costs, duties, banking & forex spread."
  - Minimum: "Walk-away + your minimum acceptable margin ({minMarginPct}%)."

## 7. Quote save/load (issue 9)
**`src/components/Calculator.tsx`** + new **`src/lib/quote-store.ts`**
- `saveQuoteSnapshot(state)` → push `{ id, quotationNumber, buyerCompany, totals, createdAt, state }` to `localStorage['vx_quotes']` (cap 50).
- `listQuotes()`, `loadQuote(id)`, `deleteQuote(id)`.
- In the existing **Audit trail** tab, render a table of saved quotes with Load / Duplicate / Delete actions.
- The header "Save" button now both persists the working draft AND appends a snapshot to history.

## 8. Mobile polish (issue 10)
**`src/components/Calculator.tsx`**
- TabsList: enable horizontal scroll on `<sm` (`overflow-x-auto`, `whitespace-nowrap`), reduce label to numbers only on mobile ("1", "2", …) with full label as `sr-only`.
- Convert dense KV tables to stacked cards under `sm` via `grid-cols-1 sm:grid-cols-2`.
- Make sticky header collapse to a single line with quotation # + total on mobile.

## Build/verify
- Run typecheck via the build (auto).
- Sanity check: load preview, hard-reload (no localStorage), confirm demo data renders and intelligence panels show source labels.

## Out of scope (will mention)
- Real OpenCorporates / Companies House API (requires keys + edge function) — only the search-link shortcut is included; happy to wire the full API in a follow-up.
- Supabase persistence for quotes — localStorage first; can migrate to Cloud later.
