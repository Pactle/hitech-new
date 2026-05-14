import { describe, expect, it } from "vitest";
import { calculateNesting } from "@/lib/nesting-engine";
import { referenceItems } from "@/lib/sample-data";

describe("Reference sample 1 from ALL 3 Hi-tech Quotation Calculations (1).pdf", () => {
  it("matches the sample 1 family totals and final trailer count", () => {
    const result = calculateNesting(referenceItems, true);

    expect(result.families.find((family) => family.name === "Family Black")?.subtotalTrailers).toBe(33.64);
    expect(result.families.find((family) => family.name === "Family Red")?.subtotalTrailers).toBe(57.75);
    expect(result.totalPartialTrailers).toBe(91.39);
    expect(result.totalTrailers).toBe(92);
  });
});
