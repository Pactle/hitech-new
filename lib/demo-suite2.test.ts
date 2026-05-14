import { describe, expect, it } from "vitest";
import { calculateQuotation } from "@/lib/freight";
import { demoSuite2Inquiry, demoSuite2Settings } from "@/lib/sample-data";

describe("Demo suite 2 revised reference calculation", () => {
  it("loads the revised PDF data with reference-hybrid mode and normal DN110 capacity", () => {
    const result = calculateQuotation(demoSuite2Inquiry.items, demoSuite2Settings);

    expect(result.nesting.families.find((family) => family.name === "Family Black")?.subtotalTrailers).toBe(71.47);
    expect(result.nesting.families.find((family) => family.name === "Family Red")?.subtotalTrailers).toBe(91.1);
    expect(result.nesting.totalPartialTrailers).toBe(162.57);
    expect(result.nesting.totalVehicles).toBe(163);
  });
});
