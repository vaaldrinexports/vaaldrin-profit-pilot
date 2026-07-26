import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireCronSecret } from "./require-cron-secret";

/**
 * Live market price scraper — uses Firecrawl web search + LLM-powered
 * JSON extraction to pull today's ₹/kg quotes for a given product across
 * a list of Indian markets. Returns whatever it can find; caller falls
 * back to the static benchmark for markets that miss.
 */

const MarketInput = z.object({
  productName: z.string().min(1),
  markets: z
    .array(z.object({ market: z.string(), state: z.string() }))
    .min(1)
    .max(8),
  unit: z.enum(["kg", "quintal"]).default("kg"),
});

export type LiveQuote = {
  market: string;
  state: string;
  ratePerKg: number | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
};

export type LiveBenchmarkResult = {
  quotes: LiveQuote[];
  fetchedAt: string;
  hits: number;
  misses: number;
  error?: string;
};

async function searchOneMarket(
  apiKey: string,
  productName: string,
  market: string,
  state: string,
): Promise<LiveQuote> {
  const query = `${productName} price today ${market} ${state} India mandi rate INR per kg`;

  const body = {
    query,
    limit: 4,
    tbs: "qdr:w", // past week
    scrapeOptions: {
      onlyMainContent: true,
      formats: [
        {
          type: "json",
          prompt:
            `Extract the most recent wholesale/mandi market price for "${productName}" in ${market}, ${state}, India. ` +
            `Return ONLY JSON: { "rawPrice": number | null, "unit": "kg" | "quintal" | "tonne" | "gram" | "50kg" | null, "currency": "INR" | "USD" | null, "asOf": string | null }. ` +
            `rawPrice is the price exactly as printed on the source (do NOT convert). unit is the unit it is quoted in. ` +
            `Common Indian mandi convention is per quintal (100 kg). Only choose "kg" if the source explicitly says per kg / ₹/kg. ` +
            `Ignore prices for a different product, different grade, or a different region. ` +
            `If no reliable current price is present, return all fields null.`,
        },
      ],
    },
  };

  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const empty: LiveQuote = {
    market,
    state,
    ratePerKg: null,
    sourceUrl: null,
    sourceTitle: null,
  };

  if (!res.ok) {
    console.error(
      `Firecrawl search failed [${res.status}] for ${productName} @ ${market}: ${await res.text()}`,
    );
    return empty;
  }

  const json = (await res.json()) as {
    data?: {
      web?: Array<{
        url?: string;
        title?: string;
        json?: {
          rawPrice?: number | null;
          unit?: string | null;
          currency?: string | null;
        };
      }>;
    };
  };

  const unitDivisor: Record<string, number> = {
    kg: 1, kgs: 1, kilogram: 1, kilo: 1,
    gram: 0.001, g: 0.001, gm: 0.001,
    quintal: 100, qtl: 100, q: 100,
    "50kg": 50, bag: 50,
    tonne: 1000, ton: 1000, mt: 1000, metricton: 1000,
  };

  const items = json?.data?.web ?? [];
  for (const item of items) {
    const j = item?.json;
    const raw = j?.rawPrice;
    const unitKey = (j?.unit ?? "").toLowerCase().replace(/[\s._-]/g, "");
    const currency = (j?.currency ?? "INR").toUpperCase();
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) continue;
    if (currency !== "INR") continue; // skip non-INR to avoid FX guesswork
    const divisor = unitDivisor[unitKey];
    if (!divisor) continue; // unknown unit → skip rather than mis-scale
    const perKg = raw / divisor;
    if (perKg < 5 || perKg > 50000) continue; // sanity band ₹/kg
    return {
      market,
      state,
      ratePerKg: Math.round(perKg),
      sourceUrl: item.url ?? null,
      sourceTitle: item.title ?? null,
    };
  }
  return empty;
}

export const fetchLiveBenchmark = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => MarketInput.parse(data))
  .handler(async ({ data }): Promise<LiveBenchmarkResult> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return {
        quotes: data.markets.map((m) => ({
          ...m,
          ratePerKg: null,
          sourceUrl: null,
          sourceTitle: null,
        })),
        fetchedAt: new Date().toISOString(),
        hits: 0,
        misses: data.markets.length,
        error: "FIRECRAWL_API_KEY not configured",
      };
    }

    try {
      const quotes = await Promise.all(
        data.markets.map((m) =>
          searchOneMarket(apiKey, data.productName, m.market, m.state).catch(
            (e): LiveQuote => {
              console.error(`Live quote failed for ${m.market}:`, e);
              return {
                market: m.market,
                state: m.state,
                ratePerKg: null,
                sourceUrl: null,
                sourceTitle: null,
              };
            },
          ),
        ),
      );

      const hits = quotes.filter((q) => q.ratePerKg !== null).length;
      return {
        quotes,
        fetchedAt: new Date().toISOString(),
        hits,
        misses: quotes.length - hits,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        quotes: data.markets.map((m) => ({
          ...m,
          ratePerKg: null,
          sourceUrl: null,
          sourceTitle: null,
        })),
        fetchedAt: new Date().toISOString(),
        hits: 0,
        misses: data.markets.length,
        error: msg,
      };
    }
  });
