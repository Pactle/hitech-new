import { describe, expect, it } from "vitest";
import { calculateNesting } from "@/lib/nesting-engine";
import { calculateQuotation } from "@/lib/freight";
import { defaultSettings, referenceItems } from "@/lib/sample-data";

describe("Hi-Tech reference calculation 3: final grand trailer total", () => {
  it("sums family partials first and rounds only the final trailer count", () => {
    const result = calculateNesting(referenceItems, true);

    expect(result.families.find((family) => family.name === "Family Black")?.subtotalTrailers).toBe(33.64);
    expect(result.families.find((family) => family.name === "Family Red")?.subtotalTrailers).toBe(57.75);
    expect(result.totalPartialTrailers).toBe(91.39);
    expect(result.totalTrailers).toBe(92);
  });

  it("uses the rounded final trailer count for freight", () => {
    const result = calculateQuotation(referenceItems, defaultSettings);

    expect(result.totals.totalTrailers).toBe(92);
    expect(result.totals.totalFreight).toBe(92 * defaultSettings.freightPerTrailer);
    expect(result.totals.freightPerMeter).toBeCloseTo(result.totals.totalFreight / result.totals.totalMeters, 8);
  });
});
