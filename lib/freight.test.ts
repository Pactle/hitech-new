import { describe, expect, it } from "vitest";
import { calculateQuotation } from "@/lib/freight";
import { defaultSettings, referenceItems } from "@/lib/sample-data";

describe("calculateQuotation", () => {
  it("calculates freight from final rounded trailer count", () => {
    const result = calculateQuotation(referenceItems, defaultSettings);
    expect(result.totals.totalTrailers).toBe(92);
    expect(result.totals.totalFreight).toBe(3680000);
    expect(result.totals.freightPerMeter).toBeCloseTo(3680000 / result.totals.totalMeters, 8);
  });

  it("applies TPI, freight per meter, and GST per line", () => {
    const result = calculateQuotation([referenceItems[0]], {
      freightPerTrailer: 40000,
      tpiPercent: 0.35,
      gstPercent: 18,
      roundPipePieces: true,
      nestingMode: "subtractive",
      vehicleType: "trailer",
      finalRounding: "ceil"
    });
    const line = result.lines[0];
    expect(line.tpiAmount).toBeCloseTo(line.rateMeter * 0.0035, 6);
    expect(line.rateExcludingTax).toBeCloseTo(line.rateMeter + line.tpiAmount + line.freightPerMeter, 6);
    expect(line.rateIncludingTax).toBeCloseTo(line.rateExcludingTax * 1.18, 6);
  });
});
