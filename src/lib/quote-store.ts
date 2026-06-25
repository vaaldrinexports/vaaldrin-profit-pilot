import type { CalculatorState } from "@/lib/calculations";
import { compute, getBuyerQuote } from "@/lib/calculations";
import { supabase } from "@/integrations/supabase/client";

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

type Row = {
  id: string;
  saved_at: string;
  quotation_number: string | null;
  buyer_company: string | null;
  product_name: string | null;
  quantity: number | null;
  uom: string | null;
  contract_currency: string | null;
  unit_price: number | null;
  total_contract_value: number | null;
  net_profit_inr: number | null;
  profit_pct: number | null;
  state: any;
};

const fromRow = (r: Row): SavedQuote => ({
  id: r.id,
  savedAt: r.saved_at,
  quotationNumber: r.quotation_number ?? "",
  buyerCompany: r.buyer_company ?? "",
  productName: r.product_name ?? "",
  quantity: Number(r.quantity ?? 0),
  uom: r.uom ?? "",
  contractCurrency: r.contract_currency ?? "INR",
  unitPrice: Number(r.unit_price ?? 0),
  totalContractValue: Number(r.total_contract_value ?? 0),
  netProfitINR: Number(r.net_profit_inr ?? 0),
  profitPct: Number(r.profit_pct ?? 0),
  state: r.state as CalculatorState,
});

export async function listQuotes(): Promise<SavedQuote[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .order("saved_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("listQuotes", error);
    return [];
  }
  return (data ?? []).map((r) => fromRow(r as Row));
}

export async function saveQuoteSnapshot(state: CalculatorState): Promise<SavedQuote | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) throw new Error("Not signed in");
  const c = compute(state);
  const q = getBuyerQuote(c.recommendedPrice, state.quantity, state);
  const row = {
    user_id: user.id,
    quotation_number: state.quotationNumber,
    buyer_company: state.buyerCompany,
    product_name: state.productName,
    quantity: state.quantity,
    uom: state.uom,
    contract_currency: state.contractCurrency,
    unit_price: q.unitPrice,
    total_contract_value: q.totalContractValue,
    net_profit_inr: c.netProfit,
    profit_pct: c.profitPct,
    state: state as any,
    saved_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("quotes").insert(row).select("*").single();
  if (error) {
    console.error("saveQuoteSnapshot", error);
    throw error;
  }
  return fromRow(data as Row);
}

export async function loadQuote(id: string): Promise<SavedQuote | null> {
  const { data, error } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return fromRow(data as Row);
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) console.error("deleteQuote", error);
}
