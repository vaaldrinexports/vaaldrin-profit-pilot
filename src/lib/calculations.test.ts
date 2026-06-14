import { describe, expect, it } from "vitest";
import { compute, defaultState, evaluatePrice } from "./calculations";

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

  it("applies contingency and forex buffers once to effective cost", () => {
    const result = compute(sample);
    expect(result.contingencyAmount).toBeCloseTo(result.effectiveCost * sample.contingencyPct / 100, 8);
    expect(result.forexBufferAmount).toBeCloseTo(result.effectiveCost * sample.forexBufferPct / 100, 8);
    expect(result.protectedCost).toBeCloseTo(result.effectiveCost + result.contingencyAmount + result.forexBufferAmount, 8);
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
describe("currency conversion invariants", () => {
  it("maintains currency conversion invariants", () => {
    const sample = {
      quantity: 1000,
      actualBankUsdRate: 83.0,
      actualBankEurRate: 90.0,
      supplierPricePerUnit: 100,
      incoterm: "FOB" as const,
      targetProfitPct: 15,
      minProfitPct: 5,
      contingencyPct: 2,
      forexBufferPct: 2,
    };
    
    const usdSample = { ...sample, contractCurrency: "USD" as const };
    // @ts-ignore - types might be strict but we are testing the logic
    const result = compute(usdSample);
    const bankRate = usdSample.actualBankUsdRate;
    
    // Invariant 1: contractTotal * bankRate approx expectedRevenue (INR)
    expect(result.contractTotal * bankRate).toBeCloseTo(result.expectedRevenue, 5);
    
    // Invariant 2: contractPrice * quantity approx contractTotal
    expect(result.contractPrice * usdSample.quantity).toBeCloseTo(result.contractTotal, 5);
    
    const inrSample = { ...sample, contractCurrency: "INR" as const };
    // @ts-ignore
    const inrResult = compute(inrSample);
    // Invariant 3: if INR, must match recommendedPrice
    expect(inrResult.contractPrice).toBe(inrResult.recommendedPrice);
  });
});
