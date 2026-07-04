import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CalculatorState } from "./calculations";
import { computeCoreINR, fmtCurrency, getBuyerQuote } from "./calculations";
import logoAsset from "@/assets/vaaldrin-logo.png.asset.json";
import { SIGNATURE_PNG_DATA_URL, SIGNATURE_ASPECT } from "./signature";

// Draws the extracted blue-ink signature so it sits naturally on/over the
// signature line — angled slightly and overlapping the rule like a real pen stroke.
function drawInkSignature(
  doc: jsPDF,
  xLineStart: number,
  yLine: number,
  lineWidth: number,
) {
  const sigW = Math.min(lineWidth * 0.85, 150);
  const sigH = sigW / SIGNATURE_ASPECT;
  // Nudge left of line start so the loop hangs past the rule, and lift so the
  // baseline of the stroke crosses the line rather than sits above it.
  const x = xLineStart + lineWidth * 0.05;
  const y = yLine - sigH * 0.78;
  try {
    // jsPDF supports rotation via the 7th arg (degrees). Slight tilt for realism.
    (doc as unknown as {
      addImage: (
        d: string, f: string, x: number, y: number, w: number, h: number,
        alias?: string, compression?: string, rotation?: number,
      ) => void;
    }).addImage(SIGNATURE_PNG_DATA_URL, "PNG", x, y, sigW, sigH, "sig", "FAST", -4);
  } catch {
    // Fallback without rotation if the runtime signature differs
    doc.addImage(SIGNATURE_PNG_DATA_URL, "PNG", x, y, sigW, sigH);
  }
}

// ============================================================
// VAALDRIN EXPORTS — Document Design System
// Premium, corporate, trustworthy, international, minimal.
// ============================================================

const BRAND = {
  red: [122, 0, 25] as [number, number, number],        // #7A0019 Deep Burgundy
  gold: [201, 162, 39] as [number, number, number],     // #C9A227 Metallic Gold
  text: [30, 30, 30] as [number, number, number],       // #1E1E1E Dark Charcoal
  muted: [107, 114, 128] as [number, number, number],   // #6B7280
  border: [229, 231, 235] as [number, number, number],  // #E5E7EB
  tableHeader: [250, 246, 235] as [number, number, number], // warm cream — gold tint
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
  state?: CalculatorState;
}

async function buildShell(opts: DocShellOptions) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 40;
  const s = opts.state;

  const logo = await loadLogoDataUrl();
  if (logo) {
    try { doc.addImage(logo, "PNG", margin, 30, 62, 62); } catch { /* ignore */ }
  }

  // Company name + tagline
  doc.setTextColor(...BRAND.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text((s?.companyName || "VAALDRIN EXPORTS").toUpperCase(), margin + 74, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.gold);
  doc.text("Exporters of Premium Indian Agricultural Products", margin + 74, 66);

  // Compliance strip under company name (IEC / GSTIN / FSSAI)
  doc.setTextColor(...BRAND.muted);
  doc.setFontSize(7.5);
  const idBits: string[] = [];
  if (s?.companyIec) idBits.push(`IEC: ${s.companyIec}`);
  if (s?.companyGstin) idBits.push(`GSTIN: ${s.companyGstin}`);
  if (s?.companyFssai) idBits.push(`FSSAI: ${s.companyFssai}`);
  if (idBits.length) doc.text(idBits.join("   •   "), margin + 74, 80);

  // Document title (right) — burgundy, bold, 18pt
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

  // Double gold divider under header (thick + hair line)
  doc.setDrawColor(...BRAND.gold);
  doc.setLineWidth(1.2);
  doc.line(margin, 108, W - margin, 108);
  doc.setLineWidth(0.3);
  doc.line(margin, 112, W - margin, 112);

  // Cache brand context for finalize (footer + watermark)
  (doc as unknown as { __vxState?: CalculatorState }).__vxState = s;

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
  const s = (doc as unknown as { __vxState?: CalculatorState }).__vxState;
  // Double gold divider
  doc.setDrawColor(...BRAND.gold);
  doc.setLineWidth(0.9);
  doc.line(margin, H - 58, W - margin, H - 58);
  doc.setLineWidth(0.25);
  doc.line(margin, H - 55, W - margin, H - 55);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.red);
  doc.text((s?.companyName || "VAALDRIN EXPORTS").toUpperCase(), margin, H - 42);

  // Line 1: address + contact
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.setFontSize(7);
  const contactBits: string[] = [];
  if (s?.companyAddress) contactBits.push(s.companyAddress);
  if (s?.companyPhone) contactBits.push(s.companyPhone);
  if (s?.companyEmail) contactBits.push(s.companyEmail);
  if (s?.companyWebsite) contactBits.push(s.companyWebsite);
  if (contactBits.length) {
    doc.text(contactBits.join("  •  "), margin, H - 32, { maxWidth: W - margin * 2 });
  }

  // Line 2: statutory IDs
  const idBits: string[] = [];
  if (s?.companyIec) idBits.push(`IEC ${s.companyIec}`);
  if (s?.companyGstin) idBits.push(`GSTIN ${s.companyGstin}`);
  if (s?.companyFssai) idBits.push(`FSSAI ${s.companyFssai}`);
  if (s?.companyAdCode) idBits.push(`AD Code ${s.companyAdCode}`);
  if (idBits.length) doc.text(idBits.join("  •  "), margin, H - 22);

  const pages = doc.getNumberOfPages();
  doc.setTextColor(...BRAND.muted);
  doc.text(`Page ${doc.getCurrentPageInfo().pageNumber} of ${pages}`, W - margin, H - 22, { align: "right" });
  if (extra) doc.text(extra, W / 2, H - 22, { align: "center" });
}

// Draws a very faint centered brand mark used as a page watermark.
function drawWatermark(doc: jsPDF, W: number, H: number) {
  const d = doc as unknown as { GState?: new (o: { opacity: number }) => unknown; setGState?: (g: unknown) => void };
  const setOpacity = (v: number) => {
    if (d.GState && d.setGState) d.setGState(new d.GState({ opacity: v }));
  };
  setOpacity(0.05);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(72);
  doc.setTextColor(...BRAND.red);
  doc.text("VAALDRIN", W / 2, H / 2, { align: "center", angle: -30 });
  doc.setFontSize(20);
  doc.setTextColor(...BRAND.gold);
  doc.text("EXPORTS  •  PREMIUM INDIAN AGRI EXPORTS", W / 2, H / 2 + 40, { align: "center", angle: -30 });
  setOpacity(1);
  doc.setTextColor(...BRAND.text);
}

// Remove trailing pages auto-created by jsPDF/autoTable overflow that were
// never actually drawn on (heuristic: a blank page has very few stream ops).
function pruneEmptyTrailingPages(doc: jsPDF) {
  try {
    const internal = doc.internal as unknown as { pages: string[][] };
    const pages = internal.pages;
    if (!Array.isArray(pages)) return;
    while (doc.getNumberOfPages() > 1) {
      const last = doc.getNumberOfPages();
      const ops = pages[last];
      const opCount = Array.isArray(ops) ? ops.length : 0;
      if (opCount > 20) break;
      doc.deletePage(last);
    }
  } catch {
    /* best-effort */
  }
}

// Finalize: prune blank trailing pages, then draw watermark + footer on every remaining page.
function finalizeDoc(doc: jsPDF, W: number, H: number, margin: number, extra?: string) {
  pruneEmptyTrailingPages(doc);
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawWatermark(doc, W, H);
    drawFooter(doc, W, H, margin, extra);
  }
}

function drawSignatureBlock(doc: jsPDF, W: number, y: number, label = "For Vaaldrin Exports") {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.text);
  doc.text(label, W - 240, y);
  // Ink signature drawn BEFORE the line so the line crosses through the stroke
  drawInkSignature(doc, W - 240, y + 36, 200);
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
// Shared helpers for shipping documents
// ============================================================

function exporterRows(s: CalculatorState): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["Company", s.companyName || "Vaaldrin Exports"],
    ["Address", s.companyAddress || "—"],
  ];
  if (s.companyEmail) rows.push(["Email", s.companyEmail]);
  if (s.companyPhone) rows.push(["Phone", s.companyPhone]);
  if (s.companyWebsite) rows.push(["Website", s.companyWebsite]);
  if (s.companyIec) rows.push(["IEC", s.companyIec]);
  if (s.companyGstin) rows.push(["GSTIN", s.companyGstin]);
  if (s.companyPan) rows.push(["PAN", s.companyPan]);
  if (s.companyFssai) rows.push(["FSSAI", s.companyFssai]);
  if (s.companyAdCode) rows.push(["AD Code", s.companyAdCode]);
  return rows;
}

function buyerRows(s: CalculatorState, opts: { includeContact?: boolean; includeTax?: boolean } = {}): Array<[string, string]> {
  const rows: Array<[string, string]> = [["Company", s.buyerCompany || "—"]];
  if (opts.includeContact && s.buyerName) rows.push(["Contact", s.buyerName]);
  rows.push(["Address", s.buyerAddress || "(buyer address required)"]);
  rows.push(["Country", s.buyerCountry || "—"]);
  if (opts.includeTax && s.buyerTaxRegistration) rows.push(["Tax Reg. No.", s.buyerTaxRegistration]);
  if (s.buyerEmail) rows.push(["Email", s.buyerEmail]);
  if (s.buyerPhone) rows.push(["Phone", s.buyerPhone]);
  return rows;
}

function shipmentRows(s: CalculatorState): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["Origin", s.countryOfOrigin || "India"],
    ["Destination", s.finalDestination || s.buyerCountry || "—"],
    ["Port of Loading", s.portOfLoading || "(to be confirmed)"],
    ["Port of Discharge", s.portOfDischarge || "(to be confirmed)"],
    ["Mode of Transport", s.modeOfTransport || "Sea Freight"],
    ["Incoterm", `${s.incoterm} (Incoterms 2020)`],
    ["Lead time", `${s.shipmentLeadTimeDays || 30} days from PO confirmation`],
  ];
  if (s.lcNumber) rows.push(["LC No.", s.lcNumber]);
  return rows;
}

function productTraceRows(s: CalculatorState): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (s.botanicalName) rows.push(["Botanical Name", s.botanicalName]);
  if (s.productGrade) rows.push(["Grade", s.productGrade]);
  if (s.cropYear) rows.push(["Crop Year", s.cropYear]);
  if (s.batchLotNumber) rows.push(["Batch / Lot No.", s.batchLotNumber]);
  if (s.manufacturingDate) rows.push(["Mfg Date", s.manufacturingDate]);
  if (s.bestBeforeDate) rows.push(["Best Before", s.bestBeforeDate]);
  if (s.storageCondition) rows.push(["Storage", s.storageCondition]);
  if (s.manufacturerName) rows.push(["Manufacturer", s.manufacturerName]);
  return rows;
}

function packageSummary(s: CalculatorState) {
  const qty = Math.max(0, s.quantity);
  const netPerPkg = s.netWeightPerPackageKg > 0 ? s.netWeightPerPackageKg : 25;
  const packages = s.packagesCountOverride > 0
    ? s.packagesCountOverride
    : Math.max(1, Math.ceil(qty / netPerPkg));
  const netWeight = qty;
  const grossWeight = qty * 1.05;
  return { packages, netPerPkg, netWeight, grossWeight };
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
    state: s,
  });

  drawSectionHeader(doc, "Exporter", margin, 140);
  drawFieldBlock(doc, margin, 158, exporterRows(s));

  drawSectionHeader(doc, "Buyer", W / 2 + 10, 140);
  drawFieldBlock(doc, W / 2 + 10, 158, buyerRows(s, { includeContact: true }));

  const yTerms = 260;
  drawSectionHeader(doc, "Shipment & Terms", margin, yTerms);
  drawFieldBlock(doc, margin, yTerms + 18, [
    ["Incoterm", `${s.incoterm} (Incoterms 2020)`],
    ["Port of Loading", s.portOfLoading || "(to be confirmed)"],
    ["Port of Discharge", s.portOfDischarge || "(to be confirmed)"],
    ["Origin", s.countryOfOrigin || "India"],
    ["Currency", s.contractCurrency],
    ["Validity", `${s.quotationValidityDays} days from quote date`],
    ["Lead time", `${s.shipmentLeadTimeDays || 30} days from PO confirmation`],
    ["Payment", s.paymentTerms || "(to be finalised with buyer)"],
  ], 110);

  const quote = getBuyerQuote(c.recommendedPrice, s.quantity, s);
  autoTable(doc, {
    ...applyTableTheme(),
    startY: 388,
    head: [["Product", "Grade", "HS Code", "Origin", "Qty", "UoM", `Unit Price (${s.contractCurrency})`, `Total (${s.contractCurrency})`]],
    body: [[
      s.productName || "—",
      s.productGrade || "—",
      s.hsCode || "—",
      s.countryOfOrigin || "India",
      String(s.quantity),
      s.uom,
      fmtCurrency(quote.unitPrice, s.contractCurrency),
      fmtCurrency(quote.totalContractValue, s.contractCurrency),
    ]],
  });

  autoTable(doc, {
    ...applyTableTheme(),
    startY: lastY(doc) + 12,
    head: [[`TOTAL CONTRACT VALUE (${s.contractCurrency})`]],
    body: [[fmtCurrency(quote.totalContractValue, s.contractCurrency)]],
    headStyles: { fillColor: BRAND.tableHeader, textColor: BRAND.red, fontStyle: "bold", halign: "center", lineColor: BRAND.border, lineWidth: 0.5 },
    bodyStyles: { halign: "center", fontStyle: "bold", fontSize: 11, textColor: BRAND.text },
  });

  const yTC = lastY(doc) + 24;
  drawSectionHeader(doc, "Terms & Conditions", margin, yTC);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BRAND.text);
  doc.text([
    `1. Payment: ${s.paymentTerms || "(to be finalised with buyer prior to order confirmation)"}.`,
    `2. Delivery: ${s.incoterm} ${s.portOfLoading || "(POL TBC)"} → ${s.portOfDischarge || "(POD TBC)"}, Incoterms 2020.`,
    `3. Validity: ${s.quotationValidityDays} days from issue date.`,
    `4. Lead time: ${s.shipmentLeadTimeDays || 30} days from PO confirmation, subject to stock availability.`,
    `5. Country of Origin: ${s.countryOfOrigin || "India"}. Certificate of Origin available on request (FIEO / Chamber of Commerce).`,
    `6. Quality: as per agreed specification${s.qualityStandard ? ` (${s.qualityStandard})` : ""}. Pre-shipment inspection at buyer's option and cost.`,
    `7. All disputes subject to ${s.governingLaw || "Indian Law"} and exclusive jurisdiction of seller's office.`,
  ], margin, yTC + 18, { lineHeightFactor: 1.5 });

  drawSignatureBlock(doc, W, yTC + 140, "For " + (s.companyName || "Vaaldrin Exports"));
  finalizeDoc(doc, W, H, margin, "E&OE — Errors & Omissions Excepted");
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
    state: s,
    proforma: true,
  });

  drawSectionHeader(doc, "Exporter", margin, 140);
  drawFieldBlock(doc, margin, 158, exporterRows(s));

  drawSectionHeader(doc, "Buyer / Consignee", W / 2 + 10, 140);
  drawFieldBlock(doc, W / 2 + 10, 158, buyerRows(s, { includeContact: true, includeTax: true }));

  const yShip = 260;
  drawSectionHeader(doc, "Shipment", margin, yShip);
  drawFieldBlock(doc, margin, yShip + 18, shipmentRows(s), 110);

  autoTable(doc, {
    ...applyTableTheme(),
    startY: yShip + 130,
    head: [["HS Code", "Description", "Origin", "Qty", "UoM", `Unit (${s.contractCurrency})`, `Amount (${s.contractCurrency})`]],
    body: [[
      s.hsCode || "—",
      `${s.productName || "—"}${s.productGrade ? ` — ${s.productGrade}` : ""}${s.botanicalName ? `\n(${s.botanicalName})` : ""}`,
      s.countryOfOrigin || "India",
      String(s.quantity),
      s.uom,
      fmtCurrency(quote.unitPrice, s.contractCurrency),
      fmtCurrency(quote.totalContractValue, s.contractCurrency),
    ]],
  });

  // Product traceability (food-export details)
  const trace = productTraceRows(s);
  if (trace.length) {
    autoTable(doc, {
      ...applyTableTheme(),
      startY: lastY(doc) + 10,
      head: [["Product Traceability", "Detail"]],
      body: trace.map(([k, v]) => [k, v]),
      columnStyles: { 0: { cellWidth: 160, fontStyle: "bold" }, 1: { halign: "left" } },
    });
  }

  const subtotal = quote.totalContractValue;
  autoTable(doc, {
    ...applyTableTheme(),
    startY: lastY(doc) + 10,
    head: [["Summary", `Amount (${s.contractCurrency})`]],
    body: [
      ["Subtotal", fmtCurrency(subtotal, s.contractCurrency)],
      [`Freight (${s.incoterm === "CFR" || s.incoterm === "CIF" ? "included in price" : "to buyer's account"})`, "—"],
      [`Insurance (${s.incoterm === "CIF" ? "included in price" : "to buyer's account"})`, "—"],
      [{ content: "GRAND TOTAL", styles: { fontStyle: "bold", textColor: BRAND.red } },
       { content: fmtCurrency(subtotal, s.contractCurrency), styles: { fontStyle: "bold", textColor: BRAND.red } }],
    ],
    columnStyles: { 1: { halign: "right" } },
  });

  // Payment terms
  const yPay = lastY(doc) + 16;
  drawSectionHeader(doc, "Payment Terms", margin, yPay);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...BRAND.text);
  doc.text(doc.splitTextToSize(s.paymentTerms || "(To be finalised with buyer prior to order confirmation)", W - margin * 2), margin, yPay + 18);

  // Bank details
  const yBank = yPay + 50;
  drawSectionHeader(doc, "Bank Details (for remittance)", margin, yBank);
  drawFieldBlock(doc, margin, yBank + 18, [
    ["Bank Name", s.companyBankName || "—"],
    ["Account No.", s.companyBankAccount || "—"],
    ["SWIFT", s.companyBankSwift || "—"],
    ["IFSC", s.companyBankIfsc || "—"],
    ["AD Code", s.companyAdCode || "—"],
    ["Branch", s.companyBankBranch || "—"],
  ], 80);

  const yDecl = yBank + 110;
  doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); doc.setTextColor(...BRAND.muted);
  doc.text("This is a Proforma Invoice and not a tax invoice. Verify bank details with exporter before remittance.", margin, yDecl);

  drawSignatureBlock(doc, W, yDecl + 16, "For " + (s.companyName || "Vaaldrin Exports"));
  finalizeDoc(doc, W, H, margin);
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
    state: s,
  });

  drawSectionHeader(doc, "Exporter", margin, 140);
  drawFieldBlock(doc, margin, 158, exporterRows(s));

  drawSectionHeader(doc, "Consignee", W / 2 + 10, 140);
  drawFieldBlock(doc, W / 2 + 10, 158, buyerRows(s, { includeContact: true, includeTax: true }));

  // PO / LC references
  const yRefs = 260;
  drawSectionHeader(doc, "Order References", margin, yRefs);
  drawFieldBlock(doc, margin, yRefs + 18, [
    ["Purchase Order No.", s.purchaseOrderNo || "—"],
    ["Purchase Order Date", s.purchaseOrderDate || "—"],
    ["Letter of Credit No.", s.lcNumber || "—"],
    ["Payment Terms", s.paymentTerms || "(as per contract)"],
  ], 120);

  // Notify Party + Shipment row
  const yMid = 360;
  drawSectionHeader(doc, "Notify Party", margin, yMid);
  const notify = s.notifyParty?.trim()
    ? doc.splitTextToSize(s.notifyParty, W / 2 - margin - 10)
    : doc.splitTextToSize("Same as Consignee", W / 2 - margin - 10);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...BRAND.text);
  doc.text(notify, margin, yMid + 16);

  drawSectionHeader(doc, "Shipment", W / 2 + 10, yMid);
  drawFieldBlock(doc, W / 2 + 10, yMid + 18, shipmentRows(s), 100);

  const pkg = packageSummary(s);

  autoTable(doc, {
    ...applyTableTheme(),
    startY: yMid + 150,
    head: [["HS Code", "Description", "Origin", "Marks & Nos.", "Qty", "UoM", `Unit (${s.contractCurrency})`, `Amount (${s.contractCurrency})`]],
    body: [[
      s.hsCode || "—",
      [
        s.productName || "—",
        s.productGrade ? `Grade: ${s.productGrade}` : null,
        s.botanicalName ? `Botanical: ${s.botanicalName}` : null,
        s.batchLotNumber ? `Batch: ${s.batchLotNumber}` : null,
        s.cropYear ? `Crop: ${s.cropYear}` : null,
      ].filter(Boolean).join("\n"),
      s.countryOfOrigin || "India",
      s.marksAndNumbers || "—",
      String(s.quantity),
      s.uom,
      fmtCurrency(quote.unitPrice, s.contractCurrency),
      fmtCurrency(quote.totalContractValue, s.contractCurrency),
    ]],
    styles: { fontSize: 8.5, cellPadding: 4 },
  });

  // Invoice Summary (per international CI standard)
  const freight = Number(s.invoiceFreightCharges) || 0;
  const insurance = Number(s.invoiceInsuranceCharges) || 0;
  const other = Number(s.invoiceOtherCharges) || 0;
  const grand = quote.totalContractValue + freight + insurance + other;

  autoTable(doc, {
    ...applyTableTheme(),
    startY: lastY(doc) + 10,
    head: [["Invoice Summary", "Value"]],
    body: [
      ["Number of Packages", `${pkg.packages} × ${s.packageType || "PP bags"}`],
      ["Net Weight", `${pkg.netWeight.toLocaleString()} KG`],
      ["Gross Weight", `${pkg.grossWeight.toLocaleString()} KG`],
      ["Subtotal (FOB value)", `${s.contractCurrency} ${fmtCurrency(quote.totalContractValue, s.contractCurrency)}`],
      ["Freight Charges", freight > 0 ? `${s.contractCurrency} ${fmtCurrency(freight, s.contractCurrency)}` : "—"],
      ["Insurance Charges", insurance > 0 ? `${s.contractCurrency} ${fmtCurrency(insurance, s.contractCurrency)}` : "—"],
      ["Other Charges", other > 0 ? `${s.contractCurrency} ${fmtCurrency(other, s.contractCurrency)}` : "—"],
      [{ content: "TOTAL INVOICE VALUE", styles: { fontStyle: "bold", textColor: BRAND.red } },
       { content: `${s.contractCurrency} ${fmtCurrency(grand, s.contractCurrency)}`, styles: { fontStyle: "bold", textColor: BRAND.red } }],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 200 }, 1: { halign: "right" } },
  });

  // Product traceability
  const trace = productTraceRows(s);
  if (trace.length) {
    autoTable(doc, {
      ...applyTableTheme(),
      startY: lastY(doc) + 10,
      head: [["Product Traceability", "Detail"]],
      body: trace.map(([k, v]) => [k, v]),
      columnStyles: { 0: { cellWidth: 160, fontStyle: "bold" }, 1: { halign: "left" } },
    });
  }

  // Shipping refs
  const yRef = lastY(doc) + 16;
  drawSectionHeader(doc, "Shipping References", margin, yRef);
  drawFieldBlock(doc, margin, yRef + 18, [
    ["Vessel / Flight", s.vesselFlight || "(to be advised)"],
    ["B/L or AWB No.", s.blAwbNumber || "(to be advised)"],
    ["Container No.", s.containerNo || "(to be advised)"],
    ["Seal No.", s.sealNo || "(to be advised)"],
  ], 110);

  const yDecl = yRef + 90;
  doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); doc.setTextColor(...BRAND.muted);
  doc.text([
    `We hereby certify that the goods described above are of ${s.countryOfOrigin || "Indian"} origin and that this invoice is true and correct.`,
    "Formal Certificate of Origin issued by FIEO / Chamber of Commerce accompanies this shipment where required.",
  ], margin, yDecl, { lineHeightFactor: 1.5 });

  drawSignatureBlock(doc, W, yDecl + 26, "For " + (s.companyName || "Vaaldrin Exports"));
  finalizeDoc(doc, W, H, margin);
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
    state: s,
  });

  drawSectionHeader(doc, "Exporter", margin, 140);
  drawFieldBlock(doc, margin, 158, exporterRows(s));

  drawSectionHeader(doc, "Consignee", W / 2 + 10, 140);
  drawFieldBlock(doc, W / 2 + 10, 158, buyerRows(s));

  const yShip = 260;
  drawSectionHeader(doc, "Shipment", margin, yShip);
  drawFieldBlock(doc, margin, yShip + 18, [
    ...shipmentRows(s),
    ["Vessel / Flight", s.vesselFlight || "(to be advised)"],
    ["Container No.", s.containerNo || "(to be advised)"],
    ["Seal No.", s.sealNo || "(to be advised)"],
    ["B/L or AWB No.", s.blAwbNumber || "(to be advised)"],
    ["Marks & Nos.", s.marksAndNumbers || "(as per buyer instructions)"],
  ], 110);

  const { packages, netPerPkg, netWeight, grossWeight } = packageSummary(s);

  autoTable(doc, {
    ...applyTableTheme(),
    startY: yShip + 180,
    head: [["Description", "Packaging", "Packages", `Net/pkg (kg)`, "Net Wt (kg)", "Gross Wt (kg)", "Dim/pkg (cm)"]],
    body: [[
      `${s.productName || "—"}${s.productGrade ? ` — ${s.productGrade}` : ""}`,
      s.packageType || "(specify packaging type)",
      String(packages),
      netPerPkg.toFixed(2),
      netWeight.toFixed(2),
      grossWeight.toFixed(2),
      s.packageDimensionsCm || "—",
    ]],
    styles: { fontSize: 8.5, cellPadding: 4 },
  });

  autoTable(doc, {
    ...applyTableTheme(),
    startY: lastY(doc) + 10,
    head: [["Totals", "Value"]],
    body: [
      ["Commercial Invoice No.", s.quotationNumber ? `CI-${s.quotationNumber}` : "—"],
      ["Total Packages", String(packages)],
      ["Packaging Type", s.packageType || "(specify)"],
      ["Dimensions per package (cm)", s.packageDimensionsCm || "(specify)"],
      ["Total Net Weight (kg)", netWeight.toFixed(2)],
      ["Total Gross Weight (kg)", grossWeight.toFixed(2)],
      ["Total Volume (CBM)", s.totalVolumeCbm > 0 ? s.totalVolumeCbm.toFixed(3) : "(to be advised)"],
      ["Marks & Numbers", s.marksAndNumbers || "(as per buyer instructions)"],
    ],
    columnStyles: { 1: { halign: "right" } },
  });

  // Product traceability block for food exports
  const trace = productTraceRows(s);
  if (trace.length) {
    autoTable(doc, {
      ...applyTableTheme(),
      startY: lastY(doc) + 10,
      head: [["Product Traceability", "Detail"]],
      body: trace.map(([k, v]) => [k, v]),
      columnStyles: { 0: { cellWidth: 160, fontStyle: "bold" }, 1: { halign: "left" } },
    });
  }

  drawSignatureBlock(doc, W, lastY(doc) + 30, "For " + (s.companyName || "Vaaldrin Exports"));
  finalizeDoc(doc, W, H, margin);
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
    state: s,
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

  finalizeDoc(doc, W, H, margin, "FOR INTERNAL USE ONLY");
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
    state: s,
  });

  drawSectionHeader(doc, "Supplier", margin, 140);
  const supRows: Array<[string, string]> = [
    ["Company", s.supplierName || "(supplier name required)"],
    ["Address", s.supplierAddress || "(supplier address required)"],
  ];
  if (s.supplierGstin) supRows.push(["GSTIN", s.supplierGstin]);
  if (s.supplierContact) supRows.push(["Contact", s.supplierContact]);
  if (s.supplierEmail) supRows.push(["Email", s.supplierEmail]);
  if (s.supplierPhone) supRows.push(["Phone", s.supplierPhone]);
  drawFieldBlock(doc, margin, 158, supRows);

  drawSectionHeader(doc, `Buyer (${s.companyName || "Vaaldrin"})`, W / 2 + 10, 140);
  const buyerSelfRows: Array<[string, string]> = [
    ["Company", s.companyName || "Vaaldrin Exports"],
    ["Address", s.companyAddress || "India"],
  ];
  if (s.companyGstin) buyerSelfRows.push(["GSTIN", s.companyGstin]);
  if (s.companyEmail) buyerSelfRows.push(["Email", s.companyEmail]);
  if (s.companyPhone) buyerSelfRows.push(["Phone", s.companyPhone]);
  drawFieldBlock(doc, W / 2 + 10, 158, buyerSelfRows);

  const yPO = 260;
  drawSectionHeader(doc, "Order Details", margin, yPO);
  drawFieldBlock(doc, margin, yPO + 18, [
    ["PO Number", `PO-${s.quotationNumber}`],
    ["PO Date", s.quotationDate],
    ["Delivery Date", s.supplierDeliveryDate || "(to be confirmed)"],
    ["Place of Supply", s.supplierPlaceOfSupply || s.companyAddress || "—"],
    ["Deliver To", s.companyAddress || "—"],
  ], 110);

  const lineTotal = s.supplierPricePerUnit * s.quantity;
  const gstPct = Math.max(0, s.supplierGstRate || 0);
  const gstAmt = lineTotal * gstPct / 100;
  const grand = lineTotal + gstAmt;

  autoTable(doc, {
    ...applyTableTheme(),
    startY: yPO + 110,
    head: [["Description", "HSN/SAC", "Qty", "UoM", "Unit Price (INR)", "Amount (INR)"]],
    body: [[
      `${s.productName || "—"}${s.productGrade ? ` — ${s.productGrade}` : ""}`,
      s.hsCode || "—",
      String(s.quantity),
      s.uom,
      fmtCurrency(s.supplierPricePerUnit, "INR"),
      fmtCurrency(lineTotal, "INR"),
    ]],
  });

  const gstRows: Array<Array<{ content: string; styles?: Record<string, unknown> } | string>> = [
    [{ content: "Taxable Value", styles: { halign: "right" } }, { content: fmtCurrency(lineTotal, "INR"), styles: { halign: "right" } }],
  ];
  if (s.supplierGstType === "CGST_SGST") {
    const half = gstAmt / 2;
    gstRows.push(
      [{ content: `CGST @ ${(gstPct / 2).toFixed(2)}%`, styles: { halign: "right" } }, { content: fmtCurrency(half, "INR"), styles: { halign: "right" } }],
      [{ content: `SGST @ ${(gstPct / 2).toFixed(2)}%`, styles: { halign: "right" } }, { content: fmtCurrency(half, "INR"), styles: { halign: "right" } }],
    );
  } else if (s.supplierGstType === "IGST") {
    gstRows.push([{ content: `IGST @ ${gstPct.toFixed(2)}%`, styles: { halign: "right" } }, { content: fmtCurrency(gstAmt, "INR"), styles: { halign: "right" } }]);
  }
  gstRows.push([
    { content: "GRAND TOTAL (INR)", styles: { fontStyle: "bold", textColor: BRAND.red, halign: "right" } },
    { content: fmtCurrency(grand, "INR"), styles: { fontStyle: "bold", textColor: BRAND.red, halign: "right" } },
  ]);
  autoTable(doc, {
    ...applyTableTheme(),
    startY: lastY(doc) + 8,
    body: gstRows,
    columnStyles: { 0: { cellWidth: W - 80 - 160 }, 1: { cellWidth: 160 } },
  });

  const y = lastY(doc) + 20;
  drawSectionHeader(doc, "Delivery, Payment & Quality", margin, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...BRAND.text);
  doc.text([
    `Delivery: by ${s.supplierDeliveryDate || "(date TBC)"} to ${s.companyAddress || "buyer warehouse"}.`,
    `Payment: ${s.supplierPaymentTerms || "Net 30 days from invoice receipt"}.`,
    `Quality: ${s.productGrade || "—"}${s.qualityStandard ? `, conforming to ${s.qualityStandard}` : ""}${s.qualityMoisturePct > 0 ? `, moisture ≤ ${s.qualityMoisturePct}%` : ""}${s.qualityActiveCompoundLabel && s.qualityActiveCompoundPct > 0 ? `, ${s.qualityActiveCompoundLabel} ≥ ${s.qualityActiveCompoundPct}%` : ""}.`,
    `Place of Supply: ${s.supplierPlaceOfSupply || "—"} (under GST).`,
  ], margin, y + 18, { lineHeightFactor: 1.5 });

  drawSignatureBlock(doc, W, y + 100, `Authorized By — ${s.companyName || "Vaaldrin Exports"}`);
  finalizeDoc(doc, W, H, margin);
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
    state: s,
  });

  drawSectionHeader(doc, "Seller", margin, 140);
  drawFieldBlock(doc, margin, 158, exporterRows(s));

  drawSectionHeader(doc, "Buyer", W / 2 + 10, 140);
  drawFieldBlock(doc, W / 2 + 10, 158, buyerRows(s, { includeContact: true }));

  const y0 = 270;
  drawSectionHeader(doc, "Contract Terms", margin, y0);
  const qualityBits: string[] = [];
  if (s.qualityStandard) qualityBits.push(`Standard: ${s.qualityStandard}`);
  if (s.qualityMoisturePct > 0) qualityBits.push(`Moisture ≤ ${s.qualityMoisturePct}%`);
  if (s.qualityActiveCompoundLabel && s.qualityActiveCompoundPct > 0)
    qualityBits.push(`${s.qualityActiveCompoundLabel} ≥ ${s.qualityActiveCompoundPct}%`);
  if (s.qualityAdmixturePct > 0) qualityBits.push(`Admixture ≤ ${s.qualityAdmixturePct}%`);
  if (s.qualityBulkDensity) qualityBits.push(`Bulk density ${s.qualityBulkDensity}`);
  if (s.qualityNotes) qualityBits.push(s.qualityNotes);
  const qualityLine = qualityBits.length
    ? `Grade ${s.productGrade || "—"}. ${qualityBits.join("; ")}.`
    : `Grade ${s.productGrade || "—"} (detailed specification to be agreed in writing prior to shipment).`;

  const clauses: Array<[string, string]> = [
    ["1. Goods", `${s.productName || "—"}${s.productGrade ? ` (${s.productGrade})` : ""}, HS ${s.hsCode || "—"}; Country of Origin: ${s.countryOfOrigin || "India"}.`],
    ["2. Quantity", `${s.quantity} ${s.uom}.`],
    ["3. Price", `${s.contractCurrency} ${fmtCurrency(quote.unitPrice, s.contractCurrency)} per ${s.uom}; total ${s.contractCurrency} ${fmtCurrency(quote.totalContractValue, s.contractCurrency)}.`],
    ["4. Payment", `${s.paymentTerms || "(To be finalised in writing — leaving this open invalidates the contract)"}.`],
    ["5. Delivery", `${s.incoterm} ${s.portOfLoading || "(POL TBC)"} → ${s.portOfDischarge || "(POD TBC)"}, Incoterms 2020. Shipment within ${s.shipmentLeadTimeDays || 30} days of PO confirmation.`],
    ["6. Quality", qualityLine],
    ["7. Inspection", "Pre-shipment inspection at seller's premises by buyer-nominated agency at buyer's cost, to be completed within 7 working days of shipment readiness notice."],
    ["8. Documents", `Seller shall provide: Commercial Invoice, Packing List, Bill of Lading / AWB, Certificate of Origin (FIEO / Chamber of Commerce), Phytosanitary Certificate where required, and ${s.qualityStandard || "agreed"} quality test report.`],
    ["9. Force Majeure", "Neither party liable for delays caused by events beyond reasonable control (acts of God, war, strikes, port closures, government restrictions)."],
    ["10. Penalty", "Delay beyond agreed shipment window attracts liquidated damages of 0.5% of contract value per week, capped at 5%, unless waived in writing by buyer."],
    ["11. Governing Law", `This contract is governed by ${s.governingLaw || "Indian Law"}.`],
    ["12. Disputes", `Subject to arbitration under ICC Rules; seat of arbitration: ${s.arbitrationVenue || s.companyAddress || "seller's office"}.`],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.text);
  let yy = y0 + 22;
  clauses.forEach(([h, body]) => {
    doc.setFont("helvetica", "bold");
    doc.text(h, margin, yy);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, W - margin * 2 - 90);
    doc.text(lines, margin + 90, yy);
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

  finalizeDoc(doc, W, H, margin);
  doc.save(`sales-contract-${s.quotationNumber}.pdf`);
}
