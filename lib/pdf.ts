import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatCurrency, formatInteger, formatNumber } from "@/lib/utils";
import type { CalculationResult, ParsedInquiry } from "@/types/quotation";

export async function createQuotationPdf(inquiry: ParsedInquiry, calculation: CalculationResult) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText("Hi-Tech Pipe Quotation", {
    x: 36,
    y: 548,
    size: 18,
    font: bold,
    color: rgb(0.06, 0.14, 0.18)
  });
  page.drawText(`${inquiry.quoteId} | ${inquiry.customer} | ${inquiry.location}`, {
    x: 36,
    y: 526,
    size: 10,
    font,
    color: rgb(0.32, 0.38, 0.43)
  });

  const summary = [
    ["Total trailers", formatInteger(calculation.totals.totalTrailers)],
    ["Freight / trailer", formatCurrency(calculation.totals.totalFreight / Math.max(calculation.totals.totalTrailers, 1))],
    ["Freight / meter", formatCurrency(calculation.totals.freightPerMeter)],
    ["Grand total", formatCurrency(calculation.totals.grandTotal)]
  ];

  summary.forEach(([label, value], index) => {
    const x = 36 + index * 190;
    page.drawRectangle({ x, y: 466, width: 170, height: 42, color: rgb(0.94, 0.97, 0.96) });
    page.drawText(label, { x: x + 10, y: 490, size: 8, font, color: rgb(0.32, 0.38, 0.43) });
    page.drawText(value, { x: x + 10, y: 474, size: 12, font: bold, color: rgb(0.08, 0.34, 0.26) });
  });

  const headers = ["Item", "PN", "DN", "Qty", "Rate/m", "Freight/m", "GST/m", "Final Amt"];
  const xs = [38, 270, 312, 360, 430, 505, 590, 665];
  headers.forEach((header, index) => {
    page.drawText(header, { x: xs[index], y: 430, size: 8, font: bold, color: rgb(0.06, 0.14, 0.18) });
  });

  calculation.lines.slice(0, 14).forEach((line, row) => {
    const y = 410 - row * 22;
    page.drawText(line.description.slice(0, 34), { x: xs[0], y, size: 8, font });
    page.drawText(String(line.pn), { x: xs[1], y, size: 8, font });
    page.drawText(String(line.dn), { x: xs[2], y, size: 8, font });
    page.drawText(formatInteger(line.qty), { x: xs[3], y, size: 8, font });
    page.drawText(formatNumber(line.rateMeter), { x: xs[4], y, size: 8, font });
    page.drawText(formatNumber(line.freightPerMeter), { x: xs[5], y, size: 8, font });
    page.drawText(formatNumber(line.gstAmountPerMeter), { x: xs[6], y, size: 8, font });
    page.drawText(formatCurrency(line.finalAmount, 0), { x: xs[7], y, size: 8, font });
  });

  page.drawText(`Subtotal without tax: ${formatCurrency(calculation.totals.subtotalWithoutTax)}`, {
    x: 560,
    y: 78,
    size: 10,
    font: bold
  });
  page.drawText(`GST: ${formatCurrency(calculation.totals.gstTotal)}`, {
    x: 560,
    y: 58,
    size: 10,
    font: bold
  });
  page.drawText(`Grand Total: ${formatCurrency(calculation.totals.grandTotal)}`, {
    x: 560,
    y: 38,
    size: 12,
    font: bold,
    color: rgb(0.08, 0.34, 0.26)
  });

  return pdf.save();
}
