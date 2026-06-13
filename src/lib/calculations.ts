export type Incoterm = "EXW" | "FOB" | "CFR" | "CIF";

export interface CalculatorState {
  // Shipment
  quotationNumber: string;
  quotationDate: string;
  buyerName: string;
  buyerCompany: string;
  buyerCountry: string;
  buyerEmail: string;
  productName: string;
  productGrade: string;
  hsCode: string;
  quantity: number;
  uom: string;
  incoterm: Incoterm;

  // Costing
  supplierPricePerUnit: number;

  // Packaging
  pouchCost: number;
  labelCost: number;
  cartonCost: number;
  palletCost: number;
  otherPackaging: number;

  // Inland
  factoryToWarehouse: number;
  warehouseToPort: number;
  loadingCharges: number;
  unloadingCharges: number;

  // Documentation
  certificateOfOrigin: number;
  phytosanitary: number;
  fumigation: number;
  labTesting: number;
  exportDocs: number;
  otherCertification: number;

  // Customs & Port
  chaCharges: number;
  portHandling: number;
  terminalHandling: number;
  customsClearance: number;
  containerHandling: number;

  // Freight
  oceanFreight: number;
  airFreight: number;
  freightForwarderFee: number;
  localDestination: number;

  // Insurance
  cargoInsurance: number;

  // Banking
  swiftCharges: number;
  bankCharges: number;
  exportRealization: number;
  currencyConversion: number;
  otherBanking: number;

  // Misc
  miscCost: number;
  contingencyPct: number;

  // Incentives
  rodtepPct: number;
  dutyDrawbackPct: number;
  otherIncentives: number;

  // Forex
  marketUsdRate: number;
  actualBankUsdRate: number;
  marketEurRate: number;
  actualBankEurRate: number;
  forexBufferPct: number;

  // Profit
  targetProfitPct: number;
  minProfitAmount: number;
  minProfitPct: number;
  marginLock: boolean;

  // Negotiation
  buyerCounterOffer: number;
  buyerCounterCurrency: "INR" | "USD" | "EUR";
  requestedDiscountPct: number;

  // Container size (kg) for per-container metric
  containerKg: number;
}

export const defaultState: CalculatorState = {
  quotationNumber: `VX-${new Date().getFullYear()}-0001`,
  // Filled on the client to keep the server-rendered markup deterministic.
  quotationDate: "",
  buyerName: "",
  buyerCompany: "",
  buyerCountry: "",
  buyerEmail: "",
  productName: "",
  productGrade: "",
  hsCode: "",
  quantity: 0,
  uom: "KG",
  incoterm: "FOB",
  supplierPricePerUnit: 0,
  pouchCost: 0, labelCost: 0, cartonCost: 0, palletCost: 0, otherPackaging: 0,
  factoryToWarehouse: 0, warehouseToPort: 0, loadingCharges: 0, unloadingCharges: 0,
  certificateOfOrigin: 0, phytosanitary: 0, fumigation: 0, labTesting: 0, exportDocs: 0, otherCertification: 0,
  chaCharges: 0, portHandling: 0, terminalHandling: 0, customsClearance: 0, containerHandling: 0,
  oceanFreight: 0, airFreight: 0, freightForwarderFee: 0, localDestination: 0,
  cargoInsurance: 0,
  swiftCharges: 0, bankCharges: 0, exportRealization: 0, currencyConversion: 0, otherBanking: 0,
  miscCost: 0, contingencyPct: 2,
  rodtepPct: 0, dutyDrawbackPct: 0, otherIncentives: 0,
  marketUsdRate: 83.5, actualBankUsdRate: 83, marketEurRate: 90.5, actualBankEurRate: 90,
  forexBufferPct: 2,
  targetProfitPct: 18, minProfitAmount: 0, minProfitPct: 8, marginLock: false,
  buyerCounterOffer: 0, buyerCounterCurrency: "USD", requestedDiscountPct: 0,
  containerKg: 20000,
};

const num = (n: number) => (isFinite(n) ? n : 0);

export interface AuditRow {
  section: "Input" | "Intermediate" | "Final";
  name: string;
  formula: string;
  result: number;
  unit: "INR" | "INR/unit" | "%" | "quantity";
}

export interface PriceEvaluation {
  price: number;
  revenue: number;
  profit: number;
  profitPct: number;
  profitPerUnit: number;
  acceptable: boolean;
}

export interface Computed {
  supplierTotal: number;
  packagingTotal: number;
  inlandTotal: number;
  documentationTotal: number;
  customsTotal: number;
  freightTotal: number;
  insuranceTotal: number;
  bankingTotal: number;
  miscTotal: number;
  contingencyAmount: number;
  incentiveValue: number;

  totalCost: number;
  effectiveCost: number;
  forexBufferAmount: number;
  protectedCost: number;

  breakEvenPrice: number; // per unit INR
  targetSellingPrice: number; // selected Incoterm, per unit INR
  recommendedPrice: number; // selected Incoterm, per unit INR
  expectedRevenue: number;
  netProfit: number;
  profitPct: number;
  profitPerUnit: number;
  profitPerKg: number;
  projectedProfitAtFullContainer: number;
  showFullContainerProjection: boolean;

  // Incoterm prices (per unit INR)
  exwPrice: number;
  fobPrice: number;
  cfrPrice: number;
  cifPrice: number;

  // Minimum acceptable prices per unit INR
  minExw: number;
  minFob: number;
  minCfr: number;
  minCif: number;

  // Walk away (break-even based, per unit INR)
  walkExw: number;
  walkFob: number;
  walkCfr: number;
  walkCif: number;

  // Per unit component costs used by waterfall
  perUnit: {
    supplier: number; packaging: number; inland: number; docs: number;
    customs: number; freight: number; insurance: number; banking: number;
    misc: number; incentives: number; buffers: number;
  };

  riskLevel: "Low" | "Medium" | "High";
  marginSafetyScore: number;
  dealQualityScore: number;

  forexExposure: number; // diff (market - bank) * value
  selectedMinimumPrice: number;
  selectedWalkAwayPrice: number;
  isConsistent: boolean;
  validationErrors: string[];
  auditRows: AuditRow[];
}

export function compute(s: CalculatorState): Computed {
  const q = Math.max(0, num(s.quantity));
  const divisor = q || 1;

  const supplierTotal = num(s.supplierPricePerUnit) * num(s.quantity);
  const packagingTotal = num(s.pouchCost) + num(s.labelCost) + num(s.cartonCost) + num(s.palletCost) + num(s.otherPackaging);
  const inlandTotal = num(s.factoryToWarehouse) + num(s.warehouseToPort) + num(s.loadingCharges) + num(s.unloadingCharges);
  const documentationTotal = num(s.certificateOfOrigin) + num(s.phytosanitary) + num(s.fumigation) + num(s.labTesting) + num(s.exportDocs) + num(s.otherCertification);
  const customsTotal = num(s.chaCharges) + num(s.portHandling) + num(s.terminalHandling) + num(s.customsClearance) + num(s.containerHandling);
  const freightTotal = num(s.oceanFreight) + num(s.airFreight) + num(s.freightForwarderFee) + num(s.localDestination);
  const insuranceTotal = num(s.cargoInsurance);
  const bankingTotal = num(s.swiftCharges) + num(s.bankCharges) + num(s.exportRealization) + num(s.currencyConversion) + num(s.otherBanking);
  const miscTotal = num(s.miscCost);

  const exwDirectCost = supplierTotal + packagingTotal;
  const fobDirectCost = exwDirectCost + inlandTotal + documentationTotal + customsTotal;
  const cfrDirectCost = fobDirectCost + freightTotal;
  const cifDirectCost = cfrDirectCost + insuranceTotal;
  const sharedCost = bankingTotal + miscTotal;
  const directCostByIncoterm: Record<Incoterm, number> = {
    EXW: exwDirectCost,
    FOB: fobDirectCost,
    CFR: cfrDirectCost,
    CIF: cifDirectCost,
  };
  // Only costs applicable to the selected Incoterm enter the quoted deal.
  const totalCost = directCostByIncoterm[s.incoterm] + sharedCost;

  const incentiveValue = Math.min(totalCost,
    (supplierTotal * (num(s.rodtepPct) + num(s.dutyDrawbackPct)) / 100) + num(s.otherIncentives));

  const effectiveCost = totalCost - incentiveValue;

  const contingencyAmount = effectiveCost * num(s.contingencyPct) / 100;
  const forexBufferAmount = effectiveCost * num(s.forexBufferPct) / 100;
  const protectedCost = effectiveCost + contingencyAmount + forexBufferAmount;

  const bufferRate = (num(s.contingencyPct) + num(s.forexBufferPct)) / 100;
  const incentiveRatio = totalCost > 0 ? incentiveValue / totalCost : 0;
  const protectedFor = (directCost: number) => {
    const applicableTotal = directCost + sharedCost;
    const applicableEffective = applicableTotal * (1 - incentiveRatio);
    return applicableEffective * (1 + bufferRate);
  };
  const protectedByIncoterm: Record<Incoterm, number> = {
    EXW: protectedFor(exwDirectCost),
    FOB: protectedFor(fobDirectCost),
    CFR: protectedFor(cfrDirectCost),
    CIF: protectedFor(cifDirectCost),
  };
  // Override the selected value with the exact audited path to avoid drift.
  protectedByIncoterm[s.incoterm] = protectedCost;

  const breakEvenFor = (term: Incoterm) => protectedByIncoterm[term] / divisor;
  const walkFor = (term: Incoterm) => breakEvenFor(term) * 1.02;
  const minimumFor = (term: Incoterm) => Math.max(
    breakEvenFor(term) * (1 + num(s.minProfitPct) / 100),
    (protectedByIncoterm[term] + num(s.minProfitAmount)) / divisor,
  );
  const targetFor = (term: Incoterm) => breakEvenFor(term) * (1 + num(s.targetProfitPct) / 100);

  const breakEvenPrice = breakEvenFor(s.incoterm);
  const walkExw = walkFor("EXW");
  const walkFob = walkFor("FOB");
  const walkCfr = walkFor("CFR");
  const walkCif = walkFor("CIF");
  const minExw = minimumFor("EXW");
  const minFob = minimumFor("FOB");
  const minCfr = minimumFor("CFR");
  const minCif = minimumFor("CIF");
  const exwPrice = targetFor("EXW");
  const fobPrice = targetFor("FOB");
  const cfrPrice = targetFor("CFR");
  const cifPrice = targetFor("CIF");
  const targetSellingPrice = targetFor(s.incoterm);
  // Recommendation equals the approved target: no undocumented discount is applied.
  const recommendedPrice = targetSellingPrice;
  const expectedRevenue = recommendedPrice * q;
  const netProfit = expectedRevenue - protectedCost;
  const profitPct = protectedCost > 0 ? (netProfit / protectedCost) * 100 : 0;
  const profitPerUnit = netProfit / divisor;
  const profitPerKg = profitPerUnit;
  const projectedProfitAtFullContainer = profitPerUnit * num(s.containerKg);
  const showFullContainerProjection = q > 0 && num(s.containerKg) > 0 && q !== num(s.containerKg);

  const perUnit = {
    supplier: supplierTotal / divisor,
    packaging: packagingTotal / divisor,
    inland: s.incoterm === "EXW" ? 0 : inlandTotal / divisor,
    docs: s.incoterm === "EXW" ? 0 : documentationTotal / divisor,
    customs: s.incoterm === "EXW" ? 0 : customsTotal / divisor,
    freight: s.incoterm === "CFR" || s.incoterm === "CIF" ? freightTotal / divisor : 0,
    insurance: s.incoterm === "CIF" ? insuranceTotal / divisor : 0,
    banking: bankingTotal / divisor,
    misc: miscTotal / divisor,
    incentives: incentiveValue / divisor,
    buffers: (contingencyAmount + forexBufferAmount) / divisor,
  };

  // Forex exposure: gap between market and bank rates applied to revenue
  const forexExposure = Math.abs(num(s.marketUsdRate) - num(s.actualBankUsdRate)) * (expectedRevenue / num(s.actualBankUsdRate || 1));

  // Margin safety: how far above min profit % we are
  const marginSafetyScore = Math.max(0, Math.min(100,
    ((profitPct - num(s.minProfitPct)) / Math.max(num(s.minProfitPct), 1)) * 50 + 50
  ));

  // Deal quality 0-100
  const bufferCoverage = Math.min(100, (num(s.contingencyPct) + num(s.forexBufferPct)) * 10);
  const freightExposure = Math.max(0, 100 - (freightTotal / Math.max(totalCost, 1)) * 100);
  const dealQualityScore = Math.round(
    Math.max(0, Math.min(100,
      profitPct * 2 + bufferCoverage * 0.2 + freightExposure * 0.2 - num(s.requestedDiscountPct) * 2
    ))
  );

  const riskLevel: "Low" | "Medium" | "High" =
    profitPct >= 15 && (num(s.forexBufferPct) + num(s.contingencyPct)) >= 3 ? "Low" :
    profitPct >= 8 ? "Medium" : "High";

  const selectedMinimumPrice = minimumFor(s.incoterm);
  const selectedWalkAwayPrice = walkFor(s.incoterm);
  const tolerance = Math.max(Math.abs(expectedRevenue), Math.abs(protectedCost), 1) * 0.001;
  const reconciliationProfit = expectedRevenue - protectedCost;
  const reconciliationPct = protectedCost > 0 ? reconciliationProfit / protectedCost * 100 : 0;
  const validationErrors: string[] = [];
  if (q <= 0) validationErrors.push("Shipment quantity must be greater than zero.");
  if (Math.abs(netProfit - reconciliationProfit) > tolerance || Math.abs(profitPct - reconciliationPct) > 0.1) {
    validationErrors.push("Calculation Inconsistency Detected");
  }
  if (q > 0 && protectedCost > 0 && !(
    breakEvenPrice < selectedWalkAwayPrice &&
    selectedWalkAwayPrice < selectedMinimumPrice &&
    selectedMinimumPrice < recommendedPrice &&
    recommendedPrice <= targetSellingPrice
  )) validationErrors.push("Pricing hierarchy violation: Break-even < Walk-away < Minimum Acceptable < Recommended ≤ Target.");
  const isConsistent = !validationErrors.includes("Calculation Inconsistency Detected");

  const auditRows: AuditRow[] = [
    { section: "Input", name: "Shipment Quantity", formula: "User input", result: q, unit: "quantity" },
    { section: "Input", name: "Supplier Cost", formula: "Supplier price/unit × Quantity", result: supplierTotal, unit: "INR" },
    { section: "Input", name: "Applicable Shipment Costs", formula: `${s.incoterm} direct costs + Banking + Miscellaneous`, result: totalCost, unit: "INR" },
    { section: "Intermediate", name: "Total Cost", formula: "Sum of costs applicable to selected Incoterm", result: totalCost, unit: "INR" },
    { section: "Intermediate", name: "Effective Cost", formula: "Total Cost − Export Incentives", result: effectiveCost, unit: "INR" },
    { section: "Intermediate", name: "Contingency", formula: "Effective Cost × Contingency %", result: contingencyAmount, unit: "INR" },
    { section: "Intermediate", name: "Forex Buffer", formula: "Effective Cost × Forex Buffer %", result: forexBufferAmount, unit: "INR" },
    { section: "Intermediate", name: "Protected Cost", formula: "Effective Cost + Contingency + Forex Buffer", result: protectedCost, unit: "INR" },
    { section: "Final", name: "Break-even Price", formula: "Protected Cost ÷ Quantity", result: breakEvenPrice, unit: "INR/unit" },
    { section: "Final", name: "Walk-away Price", formula: "Break-even Price × 1.02", result: selectedWalkAwayPrice, unit: "INR/unit" },
    { section: "Final", name: "Minimum Acceptable Price", formula: "max(Break-even × (1 + Minimum %), (Protected Cost + Minimum Amount) ÷ Quantity)", result: selectedMinimumPrice, unit: "INR/unit" },
    { section: "Final", name: "Target Price", formula: "Break-even Price × (1 + Target Profit %)", result: targetSellingPrice, unit: "INR/unit" },
    { section: "Final", name: "Recommended Price", formula: "Target Price (no hidden discount)", result: recommendedPrice, unit: "INR/unit" },
    { section: "Final", name: "Expected Revenue", formula: "Recommended Price × Quantity", result: expectedRevenue, unit: "INR" },
    { section: "Final", name: "Net Profit", formula: "Expected Revenue − Protected Cost", result: netProfit, unit: "INR" },
    { section: "Final", name: "Profit %", formula: "Net Profit ÷ Protected Cost × 100", result: profitPct, unit: "%" },
    { section: "Final", name: "Profit per Unit", formula: "Net Profit ÷ Shipment Quantity", result: profitPerUnit, unit: "INR/unit" },
    { section: "Final", name: "Projected Profit at Full Container Load", formula: "Profit per Unit × Container Size", result: projectedProfitAtFullContainer, unit: "INR" },
  ];

  return {
    supplierTotal, packagingTotal, inlandTotal, documentationTotal,
    customsTotal, freightTotal, insuranceTotal, bankingTotal, miscTotal,
    contingencyAmount, incentiveValue,
    totalCost, effectiveCost, forexBufferAmount, protectedCost,
    breakEvenPrice, targetSellingPrice, recommendedPrice, expectedRevenue, netProfit, profitPct,
    profitPerUnit, profitPerKg, projectedProfitAtFullContainer, showFullContainerProjection,
    exwPrice, fobPrice, cfrPrice, cifPrice,
    minExw, minFob, minCfr, minCif,
    walkExw, walkFob, walkCfr, walkCif,
    perUnit,
    riskLevel, marginSafetyScore, dealQualityScore,
    forexExposure, selectedMinimumPrice, selectedWalkAwayPrice,
    isConsistent, validationErrors, auditRows,
  };
}

export function evaluatePrice(c: Computed, price: number): PriceEvaluation {
  const quantityRow = c.auditRows.find((row) => row.name === "Shipment Quantity");
  const quantity = quantityRow?.result ?? 0;
  const revenue = price * quantity;
  const profit = revenue - c.protectedCost;
  const profitPct = c.protectedCost > 0 ? profit / c.protectedCost * 100 : 0;
  return {
    price, revenue, profit, profitPct,
    profitPerUnit: quantity > 0 ? profit / quantity : 0,
    acceptable: price >= c.selectedMinimumPrice,
  };
}

export function convertToINR(amount: number, currency: "INR" | "USD" | "EUR", s: CalculatorState) {
  if (currency === "USD") return amount * num(s.actualBankUsdRate);
  if (currency === "EUR") return amount * num(s.actualBankEurRate);
  return amount;
}

export function convertFromINR(amount: number, currency: "USD" | "EUR", s: CalculatorState) {
  const rate = currency === "USD" ? num(s.actualBankUsdRate) : num(s.actualBankEurRate);
  return amount / (rate || 1);
}

export function fmtINR(n: number) {
  if (!isFinite(n)) n = 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}
export function fmtUSD(n: number) {
  if (!isFinite(n)) n = 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}
export function fmtEUR(n: number) {
  if (!isFinite(n)) n = 0;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
}
export function fmtNum(n: number, d = 2) {
  if (!isFinite(n)) n = 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
}

export function profitColor(pct: number) {
  if (pct > 15) return "text-success";
  if (pct >= 8) return "text-warning";
  return "text-deep-red";
}

export function applyScenario(s: CalculatorState, scenario: string): CalculatorState {
  const next = { ...s };
  switch (scenario) {
    case "freight+10":
      next.oceanFreight *= 1.1; next.airFreight *= 1.1; next.freightForwarderFee *= 1.1; next.localDestination *= 1.1; break;
    case "freight+20":
      next.oceanFreight *= 1.2; next.airFreight *= 1.2; next.freightForwarderFee *= 1.2; next.localDestination *= 1.2; break;
    case "usd-2":
      next.actualBankUsdRate *= 0.98; break;
    case "usd-5":
      next.actualBankUsdRate *= 0.95; break;
    case "packaging+5":
      next.pouchCost *= 1.05; next.labelCost *= 1.05; next.cartonCost *= 1.05; next.palletCost *= 1.05; next.otherPackaging *= 1.05; break;
    case "bank-2":
      next.actualBankUsdRate *= 0.98; next.actualBankEurRate *= 0.98; break;
  }
  return next;
}
