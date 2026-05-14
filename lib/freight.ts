import { calculateNesting, metersToVehiclePieces } from "@/lib/nesting-engine";
import type { CalculationResult, PipeItem, QuoteSettings, QuotationLine } from "@/types/quotation";

export function calculateQuotation(items: PipeItem[], settings: QuoteSettings): CalculationResult {
  const nesting = calculateNesting(items, settings);
  const totalFreight = nesting.totalVehicles * settings.freightPerTrailer;
  const totalMeters = items.reduce((sum, item) => sum + item.qty, 0);
  const freightPerMeter = totalMeters > 0 ? totalFreight / totalMeters : 0;

  const lines: QuotationLine[] = items.map((item) => {
    const baseRate = Number.isFinite(item.rateMeter) ? item.rateMeter : item.wtPerMeter * item.rateKg;
    const tpiAmount = baseRate * (settings.tpiPercent / 100);
    const rateExcludingTax = baseRate + tpiAmount + freightPerMeter;
    const gstAmountPerMeter = rateExcludingTax * (settings.gstPercent / 100);
    const rateIncludingTax = rateExcludingTax + gstAmountPerMeter;
    return {
      ...item,
      sticks: metersToVehiclePieces(item.qty, settings.vehicleType, settings.roundPipePieces),
      rateMeter: baseRate,
      amount: item.qty * baseRate,
      tpiAmount,
      freightPerMeter,
      rateExcludingTax,
      gstAmountPerMeter,
      rateIncludingTax,
      finalAmount: rateIncludingTax * item.qty
    };
  });

  const subtotalBase = lines.reduce((sum, line) => sum + line.amount, 0);
  const subtotalWithoutTax = lines.reduce((sum, line) => sum + line.rateExcludingTax * line.qty, 0);
  const gstTotal = lines.reduce((sum, line) => sum + line.gstAmountPerMeter * line.qty, 0);
  const totalWeight = lines.reduce((sum, line) => sum + line.totalWeight, 0);

  return {
    lines,
    nesting,
    totals: {
      totalWeight,
      totalMeters,
      subtotalBase,
      subtotalWithoutTax,
      gstTotal,
      grandTotal: subtotalWithoutTax + gstTotal,
      totalFreight,
      freightPerMeter,
      totalVehicles: nesting.totalVehicles,
      totalTrailers: nesting.totalVehicles
    }
  };
}
