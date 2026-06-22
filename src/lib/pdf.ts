import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CalculatorState } from "./calculations";
import { computeCoreINR, fmtCurrency, getBuyerQuote } from "./calculations";
import logoAsset from "@/assets/vaaldrin-logo.png.asset.json";

// ============================================================
// VAALDRIN EXPORTS — Document Design System
// Premium, corporate, trustworthy, international, minimal.
// ============================================================

const BRAND = {
  red: [166, 29, 36] as [number, number, number],       // #A61D24
  gold: [201, 154, 46] as [number, number, number],     // #C99A2E
  text: [17, 24, 39] as [number, number, number],       // #111827
  muted: [107, 114, 128] as [number, number, number],   // #6B7280
  border: [229, 231, 235] as [number, number, number],  // #E5E7EB
  tableHeader: [248, 249, 250] as [number, number, number], // #F8F9FA
  white: [255, 255, 255] as [number, number, number],
};

// Logo cache (PNG data URL). Loaded once on first use.
let logoDataUrl: string | null = null;
async function loadLogoDataUrl(): Promise<string | null> {
  if (logoDataUrl) return logoDataUrl;
  try {
    const res = await fetch(logoAsset.url);
    const blob = await res.blob();
    logoDataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    return logoDataUrl;
  } catch {
    return null;
  }
}

// ============================================================
// Shared document shell — header, footer, dividers, signature
// ============================================================

interface DocShellOptions {
  title: string;
  docNumber: string;
  docDate: string;
  confidential?: boolean;
  proforma?: boolean;
}

async function buildShell(opts: DocShellOptions) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 40;

  const logo = await loadLogoDataUrl();
  if (logo) {
    // Logo width 60pt (~ small/medium per spec). Square aspect.
    try { doc.addImage(logo, "PNG", margin, 32, 60, 60); } catch { /* ignore */ }
  }

  // Company name + tagline
  doc.setTextColor(...BRAND.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("VAALDRIN EXPORTS", margin + 72, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.muted);
  doc.text("International Trade • Export House", margin + 72, 66);

  // Document title (right) — red, bold, 18pt
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BRAND.red);
  doc.text(opts.title, W - margin, 52, { align: "right" });

  // Doc number + date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.text);
  doc.text(`No: ${opts.docNumber}`, W - margin, 70, { align: "right" });
  doc.text(`Date: ${opts.docDate}`, W - margin, 84, { align: "right" });

  if (opts.confidential) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.red);
    doc.text("CONFIDENTIAL", W - margin, 98, { align: "right" });
  }
  if (opts.proforma) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text("PROFORMA — NOT A TAX INVOICE", W - margin, 98, { align: "right" });
  }

  // Thin gold divider under header
  doc.setDrawColor(...BRAND.gold);
  doc.setLineWidth(0.8);
  doc.line(margin, 108, W - margin, 108);

  return { doc, W, H, margin, contentTop: 130 };
}

function drawSectionHeader(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.red);
  doc.text(text.toUpperCase(), x, y);
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.5);
  doc.line(x, y + 4, x + 120, y + 4);
  doc.setTextColor(...BRAND.text);
}

function drawFieldBlock(
  doc: jsPDF,
  x: number,
  y: number,
  rows: Array<[string, string]>,
  labelWidth = 90,
) {
  doc.setFontSize(9.5);
  rows.forEach(([label, value], i) => {
    const yy = y + i * 13;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.muted);
    doc.text(label, x, yy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.text);
    doc.text(value || "—", x + labelWidth, yy);
  });
  return y + rows.length * 13;
}

function applyTableTheme(): Parameters<typeof autoTable>[1] {
  return {
    theme: "grid",
    headStyles: {
      fillColor: BRAND.tableHeader,
      textColor: BRAND.text,
      fontStyle: "bold",
      lineColor: BRAND.border,
      lineWidth: 0.5,
    },
    bodyStyles: {
      textColor: BRAND.text,
      lineColor: BRAND.border,
      lineWidth: 0.5,
    },
    styles: { fontSize: 9.5, cellPadding: 5 },
    margin: { left: 40, right: 40 },
  };
}

function drawFooter(doc: jsPDF, W: number, H: number, margin: number, extra?: string) {
  doc.setDrawColor(...BRAND.gold);
  doc.setLineWidth(0.6);
  doc.line(margin, H - 50, W - margin, H - 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.red);
  doc.text("VAALDRIN EXPORTS", margin, H - 36);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.setFontSize(7.5);
  doc.text("Registered Export House • Made in India", margin, H - 24);
  if (extra) {
    doc.text(extra, W - margin, H - 24, { align: "right" });
  }
  // Page number
  const pages = doc.getNumberOfPages();
  doc.text(`Page ${doc.getCurrentPageInfo().pageNumber} of ${pages}`, W / 2, H - 24, { align: "center" });
}

function drawSignatureBlock(doc: jsPDF, W: number, y: number, label = "For Vaaldrin Exports") {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.text);
  doc.text(label, W - 240, y);
  doc.setDrawColor(...BRAND.text);
  doc.setLineWidth(0.5);
  doc.line(W - 240, y + 36, W - 40, y + 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.muted);
  doc.text("Authorized Signatory", W - 240, y + 50);
}

function lastY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

// ============================================================
// Document 1 — EXPORT QUOTATION
// ============================================================

export async function generateQuotationPDF(s: CalculatorState) {
  const c = computeCoreINR(s);
  const { doc, W, H, margin } = await buildShell({
    title: "EXPORT QUOTATION",
    docNumber: s.quotationNumber,
    docDate: s.quotationDate,
  });

  // Exporter + Buyer blocks
  drawSectionHeader(doc, "Exporter", margin, 140);
  drawFieldBlock(doc, margin, 158, [
    ["Company", s.companyName || "Vaaldrin Exports"],
    ["Address", s.companyAddress || "India"],
    ...(s.companyIec ? [["IEC", s.companyIec] as [string, string]] : []),
    ...(s.companyGstin ? [["GSTIN", s.companyGstin] as [string, string]] : []),
    ...(s.companyFssai ? [["FSSAI", s.companyFssai] as [string, string]] : []),
  ]);

  drawSectionHeader(doc, "Buyer", W / 2 + 10, 140);
  drawFieldBlock(doc, W / 2 + 10, 158, [
    ["Company", s.buyerCompany],
    ["Contact", s.buyerName],
    ["Country", s.buyerCountry],
    ["Email", s.buyerEmail],
  ]);

  drawSectionHeader(doc, "Terms", margin, 235);
  drawFieldBlock(doc, margin, 253, [
    ["Incoterm", `${s.incoterm} (Incoterms 2020)`],
    ["Currency", s.contractCurrency],
    ["Validity", `${s.quotationValidityDays} days from quote date`],
    ["Payment", s.paymentTerms || "To be agreed with buyer"],
  ]);

  // Product table
  const quote = getBuyerQuote(c.recommendedPrice, s.quantity, s);
  autoTable(doc, {
    ...applyTableTheme(),
    startY: 330,
    head: [["Product", "Grade", "HS Code", "Qty", "UoM", `Unit Price (${s.contractCurrency})`, `Total (${s.contractCurrency})`]],
    body: [[
      s.productName || "—",
      s.productGrade || "—",
      s.hsCode || "—",
      String(s.quantity),
      s.uom,
      fmtCurrency(quote.unitPrice, s.contractCurrency),
      fmtCurrency(quote.totalContractValue, s.contractCurrency),
    ]],
  });

  // Total
  const yTotal = lastY(doc) + 12;
  autoTable(doc, {
    ...applyTableTheme(),
    startY: yTotal,
    head: [[`TOTAL CONTRACT VALUE (${s.contractCurrency})`]],
    body: [[fmtCurrency(quote.totalContractValue, s.contractCurrency)]],
    headStyles: {
      fillColor: BRAND.tableHeader,
      textColor: BRAND.red,
      fontStyle: "bold",
      halign: "center",
      lineColor: BRAND.border,
      lineWidth: 0.5,
    },
    bodyStyles: { halign: "center", fontStyle: "bold", fontSize: 11, textColor: BRAND.text },
  });

  // Terms & Conditions
  const yTerms = lastY(doc) + 24;
  drawSectionHeader(doc, "Terms & Conditions", margin, yTerms);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.text);
  doc.text([
    `1. Payment Terms: ${s.paymentTerms || "To be agreed with buyer"}.`,
    `2. Delivery Terms: ${s.incoterm} as per Incoterms 2020.`,
    `3. Validity: This quotation is valid for ${s.quotationValidityDays} days from the date of issue.`,
    `4. Subject to product availability at the time of order confirmation.`,
    `5. All disputes are subject to the exclusive jurisdiction of issuing office.`,
  ], margin, yTerms + 18, { lineHeightFactor: 1.5 });

  drawSignatureBlock(doc, W, yTerms + 110, "For " + (s.companyName || "Vaaldrin Exports"));
  drawFooter(doc, W, H, margin);
  doc.save(`${s.quotationNumber || "quotation"}.pdf`);
}

// ============================================================
// Document 2 — PROFORMA INVOICE
// ============================================================

export async function generateProformaInvoicePDF(s: CalculatorState) {
  const c = computeCoreINR(s);
  const quote = getBuyerQuote(c.recommendedPrice, s.quantity, s);
  const { doc, W, H, margin } = await buildShell({
    title: "PROFORMA INVOICE",
    docNumber: `PI-${s.quotationNumber}`,
    docDate: s.quotationDate,
    proforma: true,
  });

  drawSectionHeader(doc, "Exporter", margin, 140);
  drawFieldBlock(doc, margin, 158, [
    ["Company", s.companyName || "Vaaldrin Exports"],
    ["Address", s.companyAddress || "India"],
    ["IEC", s.companyIec || "—"],
    ["GSTIN", s.companyGstin || "—"],
    ...(s.companyFssai ? [["FSSAI", s.companyFssai] as [string, string]] : []),
  ]);

  drawSectionHeader(doc, "Buyer", W / 2 + 10, 140);
  drawFieldBlock(doc, W / 2 + 10, 158, [
    ["Company", s.buyerCompany],
    ["Contact", s.buyerName],
    ["Country", s.buyerCountry],
    ["Email", s.buyerEmail],
  ]);

  autoTable(doc, {
    ...applyTableTheme(),
    startY: 235,
    head: [["HS Code", "Description", "Qty", "UoM", `Unit Price (${s.contractCurrency})`, `Total (${s.contractCurrency})`]],
    body: [[
      s.hsCode || "—",
      `${s.productName || "—"}${s.productGrade ? ` — ${s.productGrade}` : ""}`,
      String(s.quantity),
      s.uom,
      fmtCurrency(quote.unitPrice, s.contractCurrency),
      fmtCurrency(quote.totalContractValue, s.contractCurrency),
    ]],
  });

  // Financial summary
  const subtotal = quote.totalContractValue;
  const freight = s.incoterm === "CFR" || s.incoterm === "CIF" ? 0 : 0; // included in incoterm price
  const insurance = s.incoterm === "CIF" ? 0 : 0;
  const grand = subtotal + freight + insurance;
  autoTable(doc, {
    ...applyTableTheme(),
    startY: lastY(doc) + 12,
    head: [["Summary", `Amount (${s.contractCurrency})`]],
    body: [
      ["Subtotal", fmtCurrency(subtotal, s.contractCurrency)],
      [`Freight (${s.incoterm === "CFR" || s.incoterm === "CIF" ? "included" : "as agreed"})`, fmtCurrency(freight, s.contractCurrency)],
      [`Insurance (${s.incoterm === "CIF" ? "included" : "as agreed"})`, fmtCurrency(insurance, s.contractCurrency)],
      [{ content: "GRAND TOTAL", styles: { fontStyle: "bold", textColor: BRAND.red } },
       { content: fmtCurrency(grand, s.contractCurrency), styles: { fontStyle: "bold", textColor: BRAND.red } }],
    ],
    columnStyles: { 1: { halign: "right" } },
  });

  // Bank details
  const yBank = lastY(doc) + 18;
  drawSectionHeader(doc, "Bank Details", margin, yBank);
  drawFieldBlock(doc, margin, yBank + 18, [
    ["Bank Name", s.companyBankName || "—"],
    ["Account No.", s.companyBankAccount || "—"],
    ["SWIFT", s.companyBankSwift || "—"],
    ["IFSC", s.companyBankIfsc || "—"],
    ["AD Code", s.companyAdCode || "—"],
    ["Branch", s.companyBankBranch || "—"],
  ], 80);

  // Declaration
  const yDecl = yBank + 90;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.muted);
  doc.text("This is a Proforma Invoice and not a tax invoice.", margin, yDecl);

  drawSignatureBlock(doc, W, yDecl + 10, "For " + (s.companyName || "Vaaldrin Exports"));
  drawFooter(doc, W, H, margin);
  doc.save(`proforma-${s.quotationNumber}.pdf`);
}

// ============================================================
// Document 3 — COMMERCIAL INVOICE
// ============================================================

export async function generateCommercialInvoicePDF(s: CalculatorState) {
  const c = computeCoreINR(s);
  const quote = getBuyerQuote(c.recommendedPrice, s.quantity, s);
  const { doc, W, H, margin } = await buildShell({
    title: "COMMERCIAL INVOICE",
    docNumber: `CI-${s.quotationNumber}`,
    docDate: s.quotationDate,
  });

  drawSectionHeader(doc, "Exporter", margin, 140);
  drawFieldBlock(doc, margin, 158, [
    ["Company", s.companyName || "Vaaldrin Exports"],
    ["Address", s.companyAddress || "India"],
    ...(s.companyIec ? [["IEC", s.companyIec] as [string, string]] : []),
    ...(s.companyGstin ? [["GSTIN", s.companyGstin] as [string, string]] : []),
  ]);

  drawSectionHeader(doc, "Consignee", W / 3 + 10, 140);
  drawFieldBlock(doc, W / 3 + 10, 158, [
    ["Company", s.buyerCompany],
    ["Country", s.buyerCountry],
  ]);

  drawSectionHeader(doc, "Notify Party", (2 * W) / 3 + 10, 140);
  drawFieldBlock(doc, (2 * W) / 3 + 10, 158, [
    ["Same as", "Consignee"],
  ], 60);

  // Shipment details
  drawSectionHeader(doc, "Shipment Details", margin, 215);
  drawFieldBlock(doc, margin, 233, [
    ["Origin", "India"],
    ["Destination", s.buyerCountry],
    ["Incoterm", `${s.incoterm} (Incoterms 2020)`],
  ]);

  autoTable(doc, {
    ...applyTableTheme(),
    startY: 290,
    head: [["HS Code", "Description", "Qty", "UoM", `Unit Price (${s.contractCurrency})`, `Amount (${s.contractCurrency})`]],
    body: [[
      s.hsCode || "—",
      `${s.productName || "—"}${s.productGrade ? ` — ${s.productGrade}` : ""}`,
      String(s.quantity),
      s.uom,
      fmtCurrency(quote.unitPrice, s.contractCurrency),
      fmtCurrency(quote.totalContractValue, s.contractCurrency),
    ]],
  });

  autoTable(doc, {
    ...applyTableTheme(),
    startY: lastY(doc) + 10,
    body: [[
      { content: "INVOICE TOTAL", styles: { fontStyle: "bold", textColor: BRAND.red, halign: "right" } },
      { content: fmtCurrency(quote.totalContractValue, s.contractCurrency), styles: { fontStyle: "bold", halign: "right" } },
    ]],
    columnStyles: { 0: { cellWidth: W - 80 - 140 }, 1: { cellWidth: 140 } },
  });

  const yDecl = lastY(doc) + 24;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.muted);
  doc.text("We hereby certify that the goods described above are of Indian origin.", margin, yDecl);

  drawSignatureBlock(doc, W, yDecl + 20, "For " + (s.companyName || "Vaaldrin Exports"));
  drawFooter(doc, W, H, margin);
  doc.save(`commercial-invoice-${s.quotationNumber}.pdf`);
}

// ============================================================
// Document 4 — PACKING LIST
// ============================================================

export async function generatePackingListPDF(s: CalculatorState) {
  const { doc, W, H, margin } = await buildShell({
    title: "PACKING LIST",
    docNumber: `PL-${s.quotationNumber}`,
    docDate: s.quotationDate,
  });

  drawSectionHeader(doc, "Exporter", margin, 140);
  drawFieldBlock(doc, margin, 158, [
    ["Company", s.companyName || "Vaaldrin Exports"],
    ["Address", s.companyAddress || "India"],
  ]);

  drawSectionHeader(doc, "Buyer", W / 2 + 10, 140);
  drawFieldBlock(doc, W / 2 + 10, 158, [
    ["Company", s.buyerCompany],
    ["Country", s.buyerCountry],
  ]);

  drawSectionHeader(doc, "Shipment Details", margin, 210);
  drawFieldBlock(doc, margin, 228, [
    ["Container No.", "—"],
    ["Seal No.", "—"],
    ["Incoterm", s.incoterm],
  ]);

  const qty = Math.max(0, s.quantity);
  const packages = Math.max(1, Math.ceil(qty / 25)); // assume 25 units/carton
  const netWeight = qty;
  const grossWeight = qty * 1.05;

  autoTable(doc, {
    ...applyTableTheme(),
    startY: 290,
    head: [["Description", "Packages", "Net Wt (kg)", "Gross Wt (kg)", "Dimensions (cm)"]],
    body: [[
      `${s.productName || "—"}${s.productGrade ? ` — ${s.productGrade}` : ""}`,
      String(packages),
      netWeight.toFixed(2),
      grossWeight.toFixed(2),
      "—",
    ]],
  });

  autoTable(doc, {
    ...applyTableTheme(),
    startY: lastY(doc) + 10,
    head: [["Totals", "Value"]],
    body: [
      ["Total Packages", String(packages)],
      ["Total Net Weight (kg)", netWeight.toFixed(2)],
      ["Total Gross Weight (kg)", grossWeight.toFixed(2)],
    ],
    columnStyles: { 1: { halign: "right" } },
  });

  drawSignatureBlock(doc, W, lastY(doc) + 30, "For " + (s.companyName || "Vaaldrin Exports"));
  drawFooter(doc, W, H, margin);
  doc.save(`packing-list-${s.quotationNumber}.pdf`);
}

// ============================================================
// Document 5 — INTERNAL COST ANALYSIS (CONFIDENTIAL)
// ============================================================

export async function generateInternalCostSheetPDF(s: CalculatorState) {
  const c = computeCoreINR(s);
  const quote = getBuyerQuote(c.recommendedPrice, s.quantity, s);
  const { doc, W, H, margin } = await buildShell({
    title: "INTERNAL COST ANALYSIS",
    docNumber: s.quotationNumber,
    docDate: s.quotationDate,
    confidential: true,
  });

  drawSectionHeader(doc, "Reference", margin, 140);
  drawFieldBlock(doc, margin, 158, [
    ["Quote No.", s.quotationNumber],
    ["Buyer", s.buyerCompany],
    ["Product", s.productName],
  ]);

  // Cost breakdown
  const supplierTotal = s.supplierPricePerUnit * s.quantity;
  const packagingTotal = s.pouchCost + s.labelCost + s.cartonCost + s.palletCost + s.otherPackaging;
  const inlandTotal = s.factoryToWarehouse + s.warehouseToPort + s.loadingCharges + s.unloadingCharges;
  const docTotal = s.certificateOfOrigin + s.phytosanitary + s.fumigation + s.labTesting + s.exportDocs + s.otherCertification;
  const portTotal = s.chaCharges + s.portHandling + s.terminalHandling + s.customsClearance + s.containerHandling;
  const freightTotal = s.oceanFreight + s.airFreight + s.freightForwarderFee + s.localDestination;
  const insuranceTotal = s.cargoInsurance;
  const bankingTotal = s.swiftCharges + s.bankCharges + s.exportRealization + s.currencyConversion + s.otherBanking;
  const miscTotal = s.miscCost;
  const totalCost =
    supplierTotal + packagingTotal + inlandTotal + docTotal + portTotal + freightTotal + insuranceTotal + bankingTotal + miscTotal;

  autoTable(doc, {
    ...applyTableTheme(),
    startY: 220,
    head: [["Cost Component", "Amount (INR)"]],
    body: [
      ["Supplier Cost", fmtCurrency(supplierTotal, "INR")],
      ["Packaging", fmtCurrency(packagingTotal, "INR")],
      ["Inland Transport", fmtCurrency(inlandTotal, "INR")],
      ["Documentation", fmtCurrency(docTotal, "INR")],
      ["Port Charges", fmtCurrency(portTotal, "INR")],
      ["Freight", fmtCurrency(freightTotal, "INR")],
      ["Insurance", fmtCurrency(insuranceTotal, "INR")],
      ["Banking", fmtCurrency(bankingTotal, "INR")],
      ["Miscellaneous", fmtCurrency(miscTotal, "INR")],
      [{ content: "TOTAL COST", styles: { fontStyle: "bold", textColor: BRAND.red } },
       { content: fmtCurrency(totalCost, "INR"), styles: { fontStyle: "bold", textColor: BRAND.red } }],
    ],
    columnStyles: { 1: { halign: "right" } },
  });

  // Revenue
  const revenueInr = quote.totalContractValue *
    (s.contractCurrency === "INR" ? 1 : (
      s.contractCurrency === "USD" ? s.actualBankUsdRate :
      s.contractCurrency === "EUR" ? s.actualBankEurRate :
      s.contractCurrency === "GBP" ? s.actualBankGbpRate :
      s.actualBankAedRate
    ));
  const profit = revenueInr - totalCost;
  const margin_ = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  autoTable(doc, {
    ...applyTableTheme(),
    startY: lastY(doc) + 12,
    head: [["Revenue Analysis", "Value"]],
    body: [
      ["Selling Price (per unit)", `${s.contractCurrency} ${fmtCurrency(quote.unitPrice, s.contractCurrency)}`],
      ["Revenue (INR equivalent)", fmtCurrency(revenueInr, "INR")],
      [{ content: "Profit", styles: { fontStyle: "bold" } }, { content: fmtCurrency(profit, "INR"), styles: { fontStyle: "bold", textColor: profit >= 0 ? [22, 163, 74] : BRAND.red } }],
      [{ content: "Margin %", styles: { fontStyle: "bold" } }, { content: `${margin_.toFixed(2)}%`, styles: { fontStyle: "bold" } }],
    ],
    columnStyles: { 1: { halign: "right" } },
  });

  // Negotiation
  autoTable(doc, {
    ...applyTableTheme(),
    startY: lastY(doc) + 12,
    head: [["Negotiation Anchors", `${s.contractCurrency} / ${s.uom}`]],
    body: [
      ["Opening Price (Target)", fmtCurrency(quote.unitPrice, s.contractCurrency)],
      ["Minimum Acceptable", fmtCurrency(quote.unitPrice * 0.95, s.contractCurrency)],
      ["Walk-away Price", fmtCurrency(quote.unitPrice * 0.92, s.contractCurrency)],
    ],
    columnStyles: { 1: { halign: "right" } },
  });

  // Risk
  autoTable(doc, {
    ...applyTableTheme(),
    startY: lastY(doc) + 12,
    head: [["Risk Indicator", "Assessment"]],
    body: [
      ["Country Risk", s.buyerCountry || "—"],
      ["Forex Risk", `Buffer ${s.forexBufferPct}%`],
      ["Deal Score", `${c.dealQualityScore ?? "—"} / 100`],
    ],
    columnStyles: { 1: { halign: "right" } },
  });

  drawFooter(doc, W, H, margin, "FOR INTERNAL USE ONLY");
  doc.save(`cost-sheet-${s.quotationNumber}.pdf`);
}

// ============================================================
// Document 6 — PURCHASE ORDER
// ============================================================

export async function generatePurchaseOrderPDF(s: CalculatorState) {
  const { doc, W, H, margin } = await buildShell({
    title: "PURCHASE ORDER",
    docNumber: `PO-${s.quotationNumber}`,
    docDate: s.quotationDate,
  });

  drawSectionHeader(doc, "Supplier", margin, 140);
  drawFieldBlock(doc, margin, 158, [
    ["Company", "—"],
    ["Address", "—"],
    ["GSTIN", "—"],
    ["Contact", "—"],
  ]);

  drawSectionHeader(doc, `Buyer (${s.companyName || "Vaaldrin"})`, W / 2 + 10, 140);
  drawFieldBlock(doc, W / 2 + 10, 158, [
    ["Company", s.companyName || "Vaaldrin Exports"],
    ["Address", s.companyAddress || "India"],
    ...(s.companyGstin ? [["GSTIN", s.companyGstin] as [string, string]] : []),
  ]);

  const lineTotal = s.supplierPricePerUnit * s.quantity;
  autoTable(doc, {
    ...applyTableTheme(),
    startY: 235,
    head: [["Description", "Qty", "UoM", "Unit Price (INR)", "Amount (INR)"]],
    body: [[
      `${s.productName || "—"}${s.productGrade ? ` — ${s.productGrade}` : ""}`,
      String(s.quantity),
      s.uom,
      fmtCurrency(s.supplierPricePerUnit, "INR"),
      fmtCurrency(lineTotal, "INR"),
    ]],
  });

  autoTable(doc, {
    ...applyTableTheme(),
    startY: lastY(doc) + 10,
    body: [[
      { content: "TOTAL (INR)", styles: { fontStyle: "bold", textColor: BRAND.red, halign: "right" } },
      { content: fmtCurrency(lineTotal, "INR"), styles: { fontStyle: "bold", halign: "right" } },
    ]],
  });

  const y = lastY(doc) + 20;
  drawSectionHeader(doc, "Delivery & Payment", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.text);
  doc.text([
    `Delivery Requirements: As per agreed schedule, delivered to warehouse.`,
    `Payment Terms: Net 30 days from invoice receipt.`,
    `Quality: Material to meet contracted specifications and grade.`,
  ], margin, y + 18, { lineHeightFactor: 1.5 });

  drawSignatureBlock(doc, W, y + 80, `Authorized By — ${s.companyName || "Vaaldrin Exports"}`);
  drawFooter(doc, W, H, margin);
  doc.save(`purchase-order-${s.quotationNumber}.pdf`);
}

// ============================================================
// Document 7 — EXPORT SALES CONTRACT
// ============================================================

export async function generateSalesContractPDF(s: CalculatorState) {
  const c = computeCoreINR(s);
  const quote = getBuyerQuote(c.recommendedPrice, s.quantity, s);
  const { doc, W, H, margin } = await buildShell({
    title: "EXPORT SALES CONTRACT",
    docNumber: `SC-${s.quotationNumber}`,
    docDate: s.quotationDate,
  });

  drawSectionHeader(doc, "Seller", margin, 140);
  drawFieldBlock(doc, margin, 158, [
    ["Company", s.companyName || "Vaaldrin Exports"],
    ["Address", s.companyAddress || "India"],
    ...(s.companyIec ? [["IEC", s.companyIec] as [string, string]] : []),
    ...(s.companyGstin ? [["GSTIN", s.companyGstin] as [string, string]] : []),
  ]);

  drawSectionHeader(doc, "Buyer", W / 2 + 10, 140);
  drawFieldBlock(doc, W / 2 + 10, 158, [
    ["Company", s.buyerCompany],
    ["Contact", s.buyerName],
    ["Country", s.buyerCountry],
    ["Email", s.buyerEmail],
  ]);

  const y0 = 230;
  drawSectionHeader(doc, "Contract Terms", margin, y0);
  const clauses: Array<[string, string]> = [
    ["1. Goods", `${s.productName || "—"}${s.productGrade ? ` (${s.productGrade})` : ""}, HS ${s.hsCode || "—"}.`],
    ["2. Quantity", `${s.quantity} ${s.uom}.`],
    ["3. Price", `${s.contractCurrency} ${fmtCurrency(quote.unitPrice, s.contractCurrency)} per ${s.uom}; total ${s.contractCurrency} ${fmtCurrency(quote.totalContractValue, s.contractCurrency)}.`],
    ["4. Payment", `${s.paymentTerms || "To be agreed with buyer"}.`],
    ["5. Delivery", `${s.incoterm} as per Incoterms 2020.`],
    ["6. Inspection", "Pre-shipment inspection at seller's premises by buyer-nominated agency at buyer's cost."],
    ["7. Force Majeure", "Neither party liable for delays caused by events beyond reasonable control."],
    ["8. Disputes", "Subject to arbitration under ICC Rules; jurisdiction of issuing office of seller."],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.text);
  let yy = y0 + 22;
  clauses.forEach(([h, body]) => {
    doc.setFont("helvetica", "bold");
    doc.text(h, margin, yy);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, W - margin * 2 - 70);
    doc.text(lines, margin + 70, yy);
    yy += Math.max(14, lines.length * 12);
  });

  // Dual signatures
  yy += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.text);
  doc.text("Buyer", margin, yy);
  doc.text(`Seller (${s.companyName || "Vaaldrin Exports"})`, W / 2 + 10, yy);
  doc.setDrawColor(...BRAND.text);
  doc.setLineWidth(0.5);
  doc.line(margin, yy + 36, margin + 200, yy + 36);
  doc.line(W / 2 + 10, yy + 36, W / 2 + 210, yy + 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.muted);
  doc.text("Authorized Signatory", margin, yy + 50);
  doc.text("Authorized Signatory", W / 2 + 10, yy + 50);

  drawFooter(doc, W, H, margin);
  doc.save(`sales-contract-${s.quotationNumber}.pdf`);
}
