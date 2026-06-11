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
  quotationDate: new Date().toISOString().slice(0, 10),
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
  targetSellingPrice: number; // per unit INR
  netProfit: number;
  profitPct: number;
  profitPerUnit: number;
  profitPerKg: number;
  profitPerContainer: number;

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
  walkFob: number;
  walkCfr: number;
  walkCif: number;

  // Per unit component costs used by waterfall
  perUnit: {
    supplier: number; packaging: number; inland: number; docs: number;
    customs: number; freight: number; insurance: number; banking: number;
    misc: number; buffers: number;
  };

  riskLevel: "Low" | "Medium" | "High";
  marginSafetyScore: number;
  dealQualityScore: number;

  forexExposure: number; // diff (market - bank) * value
}

export function compute(s: CalculatorState): Computed {
  const q = num(s.quantity) || 1;

  const supplierTotal = num(s.supplierPricePerUnit) * num(s.quantity);
  const packagingTotal = num(s.pouchCost) + num(s.labelCost) + num(s.cartonCost) + num(s.palletCost) + num(s.otherPackaging);
  const inlandTotal = num(s.factoryToWarehouse) + num(s.warehouseToPort) + num(s.loadingCharges) + num(s.unloadingCharges);
  const documentationTotal = num(s.certificateOfOrigin) + num(s.phytosanitary) + num(s.fumigation) + num(s.labTesting) + num(s.exportDocs) + num(s.otherCertification);
  const customsTotal = num(s.chaCharges) + num(s.portHandling) + num(s.terminalHandling) + num(s.customsClearance) + num(s.containerHandling);
  const freightTotal = num(s.oceanFreight) + num(s.airFreight) + num(s.freightForwarderFee) + num(s.localDestination);
  const insuranceTotal = num(s.cargoInsurance);
  const bankingTotal = num(s.swiftCharges) + num(s.bankCharges) + num(s.exportRealization) + num(s.currencyConversion) + num(s.otherBanking);
  const miscTotal = num(s.miscCost);

  const totalCost =
    supplierTotal + packagingTotal + inlandTotal + documentationTotal +
    customsTotal + freightTotal + insuranceTotal + bankingTotal + miscTotal;

  const incentiveValue =
    (supplierTotal * (num(s.rodtepPct) + num(s.dutyDrawbackPct)) / 100) + num(s.otherIncentives);

  const effectiveCost = totalCost - incentiveValue;

  const contingencyAmount = effectiveCost * num(s.contingencyPct) / 100;
  const forexBufferAmount = effectiveCost * num(s.forexBufferPct) / 100;
  const protectedCost = effectiveCost + contingencyAmount + forexBufferAmount;

  const breakEvenPrice = protectedCost / q;
  const targetSellingPrice = breakEvenPrice * (1 + num(s.targetProfitPct) / 100);

  // EXW = supplier + packaging (factory-gate)
  const exwCostTotal = supplierTotal + packagingTotal;
  // FOB = product + packaging + logistics + docs + cha + ports
  const fobCostTotal = exwCostTotal + inlandTotal + documentationTotal + customsTotal;
  const cfrCostTotal = fobCostTotal + freightTotal;
  const cifCostTotal = cfrCostTotal + insuranceTotal;

  // Apply profit margin and buffers proportionally for selling prices
  const marginMult = 1 + num(s.targetProfitPct) / 100;
  const bufferMult = 1 + (num(s.contingencyPct) + num(s.forexBufferPct)) / 100;
  const incentiveRatio = totalCost > 0 ? incentiveValue / totalCost : 0;

  const exwPrice = (exwCostTotal * (1 - incentiveRatio) * bufferMult * marginMult) / q;
  const fobPrice = (fobCostTotal * (1 - incentiveRatio) * bufferMult * marginMult) / q;
  const cfrPrice = (cfrCostTotal * (1 - incentiveRatio) * bufferMult * marginMult) / q;
  const cifPrice = (cifCostTotal * (1 - incentiveRatio) * bufferMult * marginMult) / q;

  // Minimum acceptable: meets minProfitPct AND minProfitAmount
  const minPctMult = 1 + num(s.minProfitPct) / 100;
  const minBase = (cost: number) => {
    const protectedC = cost * (1 - incentiveRatio) * bufferMult;
    const byPct = (protectedC / q) * minPctMult;
    const byAmt = (protectedC + num(s.minProfitAmount)) / q;
    return Math.max(byPct, byAmt);
  };
  const minExw = minBase(exwCostTotal);
  const minFob = minBase(fobCostTotal);
  const minCfr = minBase(cfrCostTotal);
  const minCif = minBase(cifCostTotal);

  // Walk away: break-even (cost only, no profit)
  const walkBase = (cost: number) => (cost * (1 - incentiveRatio) * bufferMult) / q;
  const walkFob = walkBase(fobCostTotal);
  const walkCfr = walkBase(cfrCostTotal);
  const walkCif = walkBase(cifCostTotal);

  // Net profit at target selling price (using FOB target as representative shipment)
  const revenue = targetSellingPrice * q;
  const netProfit = revenue - protectedCost;
  const profitPct = protectedCost > 0 ? (netProfit / protectedCost) * 100 : 0;
  const profitPerUnit = netProfit / q;
  const profitPerKg = s.uom.toUpperCase().includes("KG") ? profitPerUnit : profitPerUnit;
  const profitPerContainer = profitPerKg * num(s.containerKg);

  const perUnit = {
    supplier: supplierTotal / q,
    packaging: packagingTotal / q,
    inland: inlandTotal / q,
    docs: documentationTotal / q,
    customs: customsTotal / q,
    freight: freightTotal / q,
    insurance: insuranceTotal / q,
    banking: bankingTotal / q,
    misc: miscTotal / q,
    buffers: (contingencyAmount + forexBufferAmount) / q,
  };

  // Forex exposure: gap between market and bank rates applied to revenue
  const forexExposure = Math.abs(num(s.marketUsdRate) - num(s.actualBankUsdRate)) * (revenue / num(s.actualBankUsdRate || 1));

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

  return {
    supplierTotal, packagingTotal, inlandTotal, documentationTotal,
    customsTotal, freightTotal, insuranceTotal, bankingTotal, miscTotal,
    contingencyAmount, incentiveValue,
    totalCost, effectiveCost, forexBufferAmount, protectedCost,
    breakEvenPrice, targetSellingPrice, netProfit, profitPct,
    profitPerUnit, profitPerKg, profitPerContainer,
    exwPrice, fobPrice, cfrPrice, cifPrice,
    minExw, minFob, minCfr, minCif,
    walkFob, walkCfr, walkCif,
    perUnit,
    riskLevel, marginSafetyScore, dealQualityScore,
    forexExposure,
  };
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
