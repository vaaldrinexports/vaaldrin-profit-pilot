import type { CalculatorState } from "@/lib/calculations";
import { compute, getBuyerQuote } from "@/lib/calculations";
import { safeJsonParse } from "@/lib/safe-json";

export interface SavedQuote {
  id: string;
  savedAt: string; // ISO
  quotationNumber: string;
  buyerCompany: string;
  productName: string;
  quantity: number;
  uom: string;
  contractCurrency: string;
  unitPrice: number;
  totalContractValue: number;
  netProfitINR: number;
  profitPct: number;
  state: CalculatorState;
}

const KEY = "vaaldrin.quotes.v1";

function readAll(): SavedQuote[] {
  if (typeof window === "undefined") return [];
  const arr = safeJsonParse<unknown>(localStorage.getItem(KEY));
  return Array.isArray(arr) ? (arr as SavedQuote[]) : [];
}

function writeAll(list: SavedQuote[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  } catch (e) {
    console.error("quote-store write", e);
  }
}

export async function listQuotes(): Promise<SavedQuote[]> {
  return readAll().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export async function saveQuoteSnapshot(state: CalculatorState): Promise<SavedQuote> {
  const c = compute(state);
  const q = getBuyerQuote(c.recommendedPrice, state.quantity, state);
  const saved: SavedQuote = {
    id: (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
    savedAt: new Date().toISOString(),
    quotationNumber: state.quotationNumber,
    buyerCompany: state.buyerCompany,
    productName: state.productName,
    quantity: state.quantity,
    uom: state.uom,
    contractCurrency: state.contractCurrency,
    unitPrice: q.unitPrice,
    totalContractValue: q.totalContractValue,
    netProfitINR: c.netProfit,
    profitPct: c.profitPct,
    state,
  };
  const list = readAll();
  list.unshift(saved);
  writeAll(list);
  return saved;
}

export async function loadQuote(id: string): Promise<SavedQuote | null> {
  return readAll().find((q) => q.id === id) ?? null;
}

export async function deleteQuote(id: string): Promise<void> {
  writeAll(readAll().filter((q) => q.id !== id));
}
