import { describe, expect, it } from "vitest";
import { compute, defaultState, evaluatePrice } from "./calculations";

const sample = {
  ...defaultState,
  quantity: 1_000,
  supplierPricePerUnit: 150,
  pouchCost: 4_000,
  inlandTotal: undefined,
  factoryToWarehouse: 5_000,
  warehouseToPort: 6_000,
  documentationTotal: undefined,
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