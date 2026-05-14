import { describe, expect, it } from "vitest";
import { calculateNesting } from "@/lib/nesting-engine";
import { referenceItems } from "@/lib/sample-data";
import type { PipeItem } from "@/types/quotation";

function item(dn: number, pn: number, sticks: number): PipeItem {
  return {
    id: `${pn}-${dn}`,
    description: `PE100 PN${pn} DN${dn}`,
    pn,
    dn,
    uom: "Rmt",
    qty: sticks * 12,
    wtPerMeter: 1,
    rateKg: 100,
    rateMeter: 100,
    amount: sticks * 1200,
    totalWeight: sticks * 12
  };
}

describe("calculateNesting", () => {
  it("matches the Hi-Tech reference waterfall calculation", () => {
    const result = calculateNesting(referenceItems, true);
    const black = result.families.find((family) => family.name === "Family Black");
    const red = result.families.find((family) => family.name === "Family Red");

    expect(black?.subtotalTrailers).toBeCloseTo(33.64, 2);
    expect(red?.subtotalTrailers).toBeCloseTo(57.75, 2);
    expect(result.totalPartialTrailers).toBeCloseTo(91.39, 2);
    expect(result.totalTrailers).toBe(92);
  });

  it("uses two alternating DN families for PN4 through PN10", () => {
    const result = calculateNesting([item(800, 6, 10), item(630, 6, 12), item(710, 6, 8)]);
    expect(result.families).toHaveLength(2);
    expect(result.families.map((family) => family.mode)).toEqual(["1_DOWN", "1_DOWN"]);
  });

  it("uses three DN-offset families for PN12.5 and above", () => {
    const result = calculateNesting([item(900, 16, 10), item(630, 16, 30), item(450, 16, 20)]);
    expect(result.families).toHaveLength(1);
    expect(result.families[0].mode).toBe("2_DOWN");
    expect(result.families[0].steps.map((step) => step.dn)).toEqual([900, 630, 450]);
  });

  it("carries only remaining slots when a row fully nests", () => {
    const result = calculateNesting([item(800, 4, 10), item(630, 4, 4), item(500, 4, 9)]);
    const steps = result.families[0].steps;
    expect(steps[1]).toMatchObject({ dn: 630, nestedSticks: 4, residualSticks: 0, slotsAfter: 6 });
    expect(steps[2]).toMatchObject({ dn: 500, nestedSticks: 6, residualSticks: 3 });
  });
});
