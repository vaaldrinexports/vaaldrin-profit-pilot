export type Incoterm = "EXW" | "FOB" | "CFR" | "CIF";
export type ContractCurrency = "INR" | "USD" | "EUR" | "GBP" | "AED";
export type PaymentMethod = "SWIFT" | "DP" | "DA" | "LC";

export interface BankingTariff {
  // Fixed (INR)
  inward_remittance_charge: number;
  export_bill_collection_charge: number;
  export_bill_advance_remittance_handling: number;
  export_bill_dishonour_charge: number;
  export_bill_writeoff_charge: number;
  reimbursement_claim_charge: number;
  export_due_date_extension: number;
  edf_gr_approval_charge: number;
  edf_gr_waiver_certificate: number;
  export_lc_advising_customer: number;
  export_lc_advising_non_customer: number;
  export_lc_amendment_customer: number;
  export_lc_amendment_non_customer: number;
  export_lc_transfer: number;
  courier_export_documents: number;
  swift_outward_remittance: number;
  outward_remittance_charge: number;
  duplicate_firc_brc_swift: number;
  certificate_attestation: number;
  swift_tracer: number;
  manual_brc: number;
  ebrc: number;
  // Variable
  gst_percent: number;
  forex_spread_percent: number;
  correspondent_bank_fee_usd: number;
  // Percentage-based
  export_bill_negotiation_rate_percent: number;
  export_bill_negotiation_minimum: number;
  advance_against_export_bill_rate_percent: number;
  advance_against_export_bill_minimum: number;
  export_bill_crystallization_rate_percent: number;
  export_bill_crystallization_minimum: number;
  setoff_fixed: number;
  setoff_rate_percent: number;
  commission_in_lieu_rate_percent: number;
  // Whether this exporter is an Axis customer (affects LC advising)
  is_axis_customer: boolean;
}

export const defaultBankingTariff: BankingTariff = {
  inward_remittance_charge: 300,
  export_bill_collection_charge: 1250,
  export_bill_advance_remittance_handling: 1250,
  export_bill_dishonour_charge: 1250,
  export_bill_writeoff_charge: 1250,
  reimbursement_claim_charge: 1000,
  export_due_date_extension: 500,
  edf_gr_approval_charge: 1000,
  edf_gr_waiver_certificate: 1000,
  export_lc_advising_customer: 1500,
  export_lc_advising_non_customer: 2000,
  export_lc_amendment_customer: 750,
  export_lc_amendment_non_customer: 1000,
  export_lc_transfer: 2000,
  courier_export_documents: 1000,
  swift_outward_remittance: 500,
  outward_remittance_charge: 1000,
  duplicate_firc_brc_swift: 100,
  certificate_attestation: 250,
  swift_tracer: 500,
  manual_brc: 0,
  ebrc: 0,
  gst_percent: 18,
  forex_spread_percent: 1.0,
  correspondent_bank_fee_usd: 20,
  export_bill_negotiation_rate_percent: 0.03,
  export_bill_negotiation_minimum: 2000,
  advance_against_export_bill_rate_percent: 0.0625,
  advance_against_export_bill_minimum: 1000,
  export_bill_crystallization_rate_percent: 0.125,
  export_bill_crystallization_minimum: 2000,
  setoff_fixed: 1250,
  setoff_rate_percent: 0.125,
  commission_in_lieu_rate_percent: 0.125,
  is_axis_customer: true,
};


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
  contractCurrency: ContractCurrency;

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
  marketGbpRate: number;
  actualBankGbpRate: number;
  marketAedRate: number;
  actualBankAedRate: number;
  forexBufferPct: number;

  // Profit
  targetProfitPct: number;
  minProfitAmount: number;
  minProfitPct: number;
  marginLock: boolean;

  // Negotiation
  buyerCounterOffer: number;
  requestedDiscountPct: number;

  // Container size (kg) for per-container metric
  containerKg: number;
}

export const defaultState: CalculatorState = {
  quotationNumber: "VX-0001",
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
  contractCurrency: "USD",
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
  marketGbpRate: 105.5, actualBankGbpRate: 105, marketAedRate: 22.8, actualBankAedRate: 22.6,
  forexBufferPct: 2,
  targetProfitPct: 18, minProfitAmount: 0, minProfitPct: 8, marginLock: false,
  buyerCounterOffer: 0, requestedDiscountPct: 0,
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

export interface BuyerQuote {
  currency: ContractCurrency;
  unitPrice: number;
  totalContractValue: number;
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
  exwRevenue: number;
  fobRevenue: number;
  cfrRevenue: number;
  cifRevenue: number;

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
  marginLockTriggered: boolean;
  isConsistent: boolean;
  validationErrors: string[];
  auditRows: AuditRow[];
}

export function computeCoreINR(s: CalculatorState): Computed {
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
  // Forex rates and the informational forex buffer never alter INR economics.
  // Exporters may explicitly include a realized spread in currencyConversion.
  const forexBufferAmount = 0;
  const protectedCost = effectiveCost + contingencyAmount;

  const bufferRate = num(s.contingencyPct) / 100;
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
    walkFor(term) * 1.01,
    breakEvenFor(term) * (1 + num(s.minProfitPct) / 100),
    (protectedByIncoterm[term] + num(s.minProfitAmount)) / divisor,
  );
  const targetFor = (term: Incoterm) => Math.max(
    minimumFor(term) * 1.01,
    breakEvenFor(term) * (1 + num(s.targetProfitPct) / 100),
  );

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
  const exwRevenue = exwPrice * q;
  const fobRevenue = fobPrice * q;
  const cfrRevenue = cfrPrice * q;
  const cifRevenue = cifPrice * q;
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

  // Currency conversion and forex exposure remain outside this INR-only core.
  const forexExposure = 0;

  // Margin safety: how far above min profit % we are
  const marginSafetyScore = Math.max(0, Math.min(100,
    ((profitPct - num(s.minProfitPct)) / Math.max(num(s.minProfitPct), 1)) * 50 + 50
  ));

  // Deal quality 0-100
  const bufferCoverage = Math.min(100, num(s.contingencyPct) * 10);
  const freightExposure = Math.max(0, 100 - (freightTotal / Math.max(totalCost, 1)) * 100);
  const dealQualityScore = Math.round(
    Math.max(0, Math.min(100,
      profitPct * 2 + bufferCoverage * 0.2 + freightExposure * 0.2 - num(s.requestedDiscountPct) * 2
    ))
  );

  const riskLevel: "Low" | "Medium" | "High" =
    profitPct >= 15 && num(s.contingencyPct) >= 3 ? "Low" :
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
  const marginLockTriggered = s.marginLock && (profitPct < num(s.minProfitPct) || netProfit < num(s.minProfitAmount));

  const auditRows: AuditRow[] = [
    { section: "Input", name: "Shipment Quantity", formula: "User input", result: q, unit: "quantity" },
    { section: "Input", name: "Supplier Cost", formula: "Supplier price/unit × Quantity", result: supplierTotal, unit: "INR" },
    { section: "Input", name: "Applicable Shipment Costs", formula: `${s.incoterm} direct costs + Banking + Miscellaneous`, result: totalCost, unit: "INR" },
    { section: "Intermediate", name: "Total Cost", formula: "Sum of costs applicable to selected Incoterm", result: totalCost, unit: "INR" },
    { section: "Intermediate", name: "Effective Cost", formula: "Total Cost − Export Incentives", result: effectiveCost, unit: "INR" },
    { section: "Intermediate", name: "Contingency", formula: "Effective Cost × Contingency %", result: contingencyAmount, unit: "INR" },
    { section: "Intermediate", name: "Forex Buffer", formula: "Informational only; add realized spread under Banking Costs", result: forexBufferAmount, unit: "INR" },
    { section: "Intermediate", name: "Protected Cost", formula: "Effective Cost + Contingency", result: protectedCost, unit: "INR" },
    { section: "Final", name: "Break-even Price", formula: "Protected Cost ÷ Quantity", result: breakEvenPrice, unit: "INR/unit" },
    { section: "Final", name: "Walk-away Price", formula: "Break-even Price × 1.02", result: selectedWalkAwayPrice, unit: "INR/unit" },
    { section: "Final", name: "Minimum Acceptable Price", formula: "max(Break-even × (1 + Minimum %), (Protected Cost + Minimum Amount) ÷ Quantity)", result: selectedMinimumPrice, unit: "INR/unit" },
    { section: "Final", name: "Target Price", formula: "max(Break-even × (1 + Target Profit %), Minimum Acceptable × 1.01)", result: targetSellingPrice, unit: "INR/unit" },
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
    exwRevenue, fobRevenue, cfrRevenue, cifRevenue,
    minExw, minFob, minCfr, minCif,
    walkExw, walkFob, walkCfr, walkCif,
    perUnit,
    riskLevel, marginSafetyScore, dealQualityScore,
    forexExposure, selectedMinimumPrice, selectedWalkAwayPrice,
    isConsistent, validationErrors, auditRows, marginLockTriggered,
  };
}

export const compute = computeCoreINR;

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

export function evaluateDiscount(c: Computed, discountPct: number) {
  return evaluatePrice(c, c.recommendedPrice * (1 - num(discountPct) / 100));
}

export function profitVariance(base: Computed, scenario: Computed) {
  return scenario.netProfit - base.netProfit;
}

export function getActualBankRate(currency: ContractCurrency, s: CalculatorState) {
  const rates: Record<ContractCurrency, number> = {
    INR: 1,
    USD: num(s.actualBankUsdRate), EUR: num(s.actualBankEurRate),
    GBP: num(s.actualBankGbpRate), AED: num(s.actualBankAedRate),
  };
  return rates[currency] || 1;
}

export function getMarketRate(currency: ContractCurrency, s: CalculatorState) {
  const rates: Record<ContractCurrency, number> = {
    INR: 1,
    USD: num(s.marketUsdRate), EUR: num(s.marketEurRate),
    GBP: num(s.marketGbpRate), AED: num(s.marketAedRate),
  };
  return rates[currency] || 1;
}

export function convertToINR(amount: number, currency: ContractCurrency, s: CalculatorState) {
  return amount * getActualBankRate(currency, s);
}

export function convertFromINR(amount: number, currency: ContractCurrency, s: CalculatorState) {
  return amount / getActualBankRate(currency, s);
}

export function getBuyerQuote(recommendedPriceINR: number, quantity: number, s: CalculatorState): BuyerQuote {
  const unitPrice = Math.round(convertFromINR(recommendedPriceINR, s.contractCurrency, s) * 100) / 100;
  return { currency: s.contractCurrency, unitPrice, totalContractValue: unitPrice * num(quantity) };
}

export function calculateForexExposure(contractValueINR: number, s: CalculatorState) {
  const bankRate = getActualBankRate(s.contractCurrency, s);
  return Math.abs(getMarketRate(s.contractCurrency, s) - bankRate) * (num(contractValueINR) / bankRate);
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
export function fmtCurrency(n: number, currency: ContractCurrency) {
  if (!isFinite(n)) n = 0;
  const locale = currency === "EUR" ? "de-DE" : currency === "GBP" ? "en-GB" : currency === "AED" ? "en-AE" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
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
