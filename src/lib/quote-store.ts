import type { CalculatorState } from "@/lib/calculations";
import { compute, getBuyerQuote } from "@/lib/calculations";

const KEY = "vx_quotes";
const CAP = 50;

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

function read(): SavedQuote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list: SavedQuote[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, CAP)));
  } catch {
    /* quota — best effort */
  }
}

export function listQuotes(): SavedQuote[] {
  return read().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export function saveQuoteSnapshot(state: CalculatorState): SavedQuote {
  const c = compute(state);
  const q = getBuyerQuote(c.recommendedPrice, state.quantity, state);
  const snap: SavedQuote = {
    id: `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
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
  const list = read();
  list.unshift(snap);
  write(list);
  return snap;
}

export function loadQuote(id: string): SavedQuote | null {
  return read().find((q) => q.id === id) ?? null;
}

export function deleteQuote(id: string) {
  write(read().filter((q) => q.id !== id));
}

export function clearAllQuotes() {
  write([]);
}
