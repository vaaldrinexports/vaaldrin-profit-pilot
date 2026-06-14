import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CalculatorState } from "./calculations";
import { computeCoreINR, fmtCurrency, getBuyerQuote } from "./calculations";

export function generateQuotationPDF(s: CalculatorState) {
  const c = computeCoreINR(s);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(212, 175, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("VAALDRIN EXPORTS", 40, 35);
  doc.setFontSize(9);
  doc.setTextColor(230, 230, 230);
  doc.setFont("helvetica", "normal");
  doc.text("Export Pricing & Profit Control", 40, 52);
  doc.setFontSize(14);
  doc.setTextColor(212, 175, 55);
  doc.setFont("helvetica", "bold");
  doc.text("EXPORT QUOTATION", W - 40, 35, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(230, 230, 230);
  doc.setFont("helvetica", "normal");
  doc.text(`No: ${s.quotationNumber}`, W - 40, 52, { align: "right" });
  doc.text(`Date: ${s.quotationDate}`, W - 40, 64, { align: "right" });

  // Buyer
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("BUYER", 40, 100);
  doc.setFont("helvetica", "normal");
  doc.text([
    s.buyerCompany || "-",
    s.buyerName || "-",
    s.buyerCountry || "-",
    s.buyerEmail || "-",
  ], 40, 116);

  doc.setFont("helvetica", "bold");
  doc.text("INCOTERM", W - 200, 100);
  doc.setFont("helvetica", "normal");
  doc.text(s.incoterm, W - 200, 116);
  doc.setFont("helvetica", "bold");
  doc.text("VALIDITY", W - 200, 132);
  doc.setFont("helvetica", "normal");
  doc.text("30 days from quote date", W - 200, 148);

  // Product table
  const fmtContract = (val: number) => fmtCurrency(val, s.contractCurrency);
  const quote = getBuyerQuote(c.recommendedPrice, s.quantity, s);
  const unitPriceContract = quote.unitPrice;
  const totalContract = quote.totalContractValue;
  const currencyLabel = s.contractCurrency;

  autoTable(doc, {
    startY: 180,
    head: [["Product", "Grade", "HS Code", "Qty", "UoM", `Unit Price (${currencyLabel})`, `Total (${currencyLabel})`]],
    body: [[
      s.productName || "-", s.productGrade || "-", s.hsCode || "-",
      String(s.quantity), s.uom, fmtContract(unitPriceContract), fmtContract(totalContract),
    ]],
    headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55] },
    styles: { fontSize: 9 },
    margin: { left: 40, right: 40 },
  });

  // Buyer documents show one contract currency only.
  const finalY = (doc as any).lastAutoTable.finalY + 16;
  autoTable(doc, {
    startY: finalY,
    head: [[`TOTAL CONTRACT VALUE (${currencyLabel})`]],
    body: [[fmtContract(totalContract)]],
    headStyles: { fillColor: [240, 230, 200], textColor: [20, 20, 20] },
    styles: { fontSize: 10, halign: "center" },
    margin: { left: 40, right: 40 },
  });

  // Terms
  const y2 = (doc as any).lastAutoTable.finalY + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TERMS & CONDITIONS", 40, y2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text([
    `Payment Terms: 30% advance, 70% against B/L copy.`,
    `Delivery Terms: ${s.incoterm} as per Incoterms 2020.`,
    `Validity: 30 days from quotation date.`,
    `Quotation subject to availability at time of order confirmation.`,
    `All disputes subject to jurisdiction of issuing office.`,
  ], 40, y2 + 16);

  // Signature
  doc.setFont("helvetica", "bold");
  doc.text("For Vaaldrin Exports", W - 200, y2 + 110);
  doc.line(W - 200, y2 + 140, W - 60, y2 + 140);
  doc.setFont("helvetica", "normal");
  doc.text("Authorized Signatory", W - 200, y2 + 154);

  doc.save(`${s.quotationNumber || "quotation"}.pdf`);
}
