import { describe, expect, it } from "vitest";
import { compute, getBuyerQuote, defaultState, evaluatePrice } from "./calculations";

const sample = {
  ...defaultState,
  quantity: 1_000,
  supplierPricePerUnit: 150,
  pouchCost: 4_000,
  factoryToWarehouse: 5_000,
  warehouseToPort: 6_000,
  exportDocs: 2_000,
  customsClearance: 3_000,
  oceanFreight: 20_000,
  cargoInsurance: 1_500,
  bankCharges: 1_000,
  miscCost: 500,
  targetProfitPct: 18,
  minProfitPct: 8,
  contingencyPct: 2,
  forexBufferPct: 2,
  containerKg: 20_000,
} as typeof defaultState;

describe("export pricing engine", () => {
  it("reconciles revenue, protected cost, and expected profit", () => {
    const result = compute(sample);
    expect(result.expectedRevenue).toBeCloseTo(result.recommendedPrice * sample.quantity, 8);
    expect(result.netProfit).toBeCloseTo(result.expectedRevenue - result.protectedCost, 8);
    expect(result.profitPct).toBeCloseTo(result.netProfit / result.protectedCost * 100, 8);
    expect(result.isConsistent).toBe(true);
  });

  it("enforces the selected pricing hierarchy", () => {
    const result = compute(sample);
    expect(result.breakEvenPrice).toBeLessThan(result.selectedWalkAwayPrice);
    expect(result.selectedWalkAwayPrice).toBeLessThan(result.selectedMinimumPrice);
    expect(result.selectedMinimumPrice).toBeLessThan(result.recommendedPrice);
    expect(result.recommendedPrice).toBeLessThanOrEqual(result.targetSellingPrice);
    expect(result.validationErrors).toEqual([]);
  });

  it("applies contingency once and keeps forex informational", () => {
    const result = compute(sample);
    expect(result.contingencyAmount).toBeCloseTo(result.effectiveCost * sample.contingencyPct / 100, 8);
    expect(result.forexBufferAmount).toBe(0);
    expect(result.protectedCost).toBeCloseTo(result.effectiveCost + result.contingencyAmount, 8);
  });

  it("labels full-container profit as a separate projection", () => {
    const result = compute(sample);
    expect(result.showFullContainerProjection).toBe(true);
    expect(result.projectedProfitAtFullContainer).toBeCloseTo(result.profitPerUnit * sample.containerKg, 8);
    expect(result.netProfit).toBeCloseTo(result.profitPerUnit * sample.quantity, 8);
  });

  it("uses central evaluation logic for negotiation prices", () => {
    const result = compute(sample);
    const evaluated = evaluatePrice(result, result.selectedMinimumPrice);
    expect(evaluated.revenue).toBeCloseTo(evaluated.price * sample.quantity, 8);
    expect(evaluated.profit).toBeCloseTo(evaluated.revenue - result.protectedCost, 8);
    expect(evaluated.acceptable).toBe(true);
  });
});
describe("currency display invariants", () => {
  it("never changes core INR outputs when contract currency changes", () => {
    const keys = ["netProfit", "breakEvenPrice", "selectedWalkAwayPrice", "recommendedPrice", "targetSellingPrice", "selectedMinimumPrice"] as const;
    const base = compute({ ...sample, contractCurrency: "USD" });
    for (const contractCurrency of ["EUR", "GBP", "AED"] as const) {
      const changed = compute({ ...sample, contractCurrency });
      for (const key of keys) expect(changed[key]).toBeCloseTo(base[key], 8);
    }
  });

  it("uses the selected actual bank rate for buyer values", () => {
    const state = { ...sample, contractCurrency: "GBP" as const, actualBankGbpRate: 105 };
    const result = compute(state);
    const quote = getBuyerQuote(result.recommendedPrice, state.quantity, state);
    expect(quote.unitPrice).toBe(Math.round(result.recommendedPrice / state.actualBankGbpRate * 100) / 100);
    expect(quote.totalContractValue).toBeCloseTo(quote.unitPrice * state.quantity, 8);
  });
});
