import { describe, expect, it } from "vitest";
import { calculateNesting } from "@/lib/nesting-engine";
import { referenceItems } from "@/lib/sample-data";

const expectedBlack = [
  { dn: 800, totalSticks: 81, nestedSticks: 0, residualSticks: 81, capacity: 9, fractionalTrailers: 9, slotsAfter: 81 },
  { dn: 630, totalSticks: 284, nestedSticks: 81, residualSticks: 203, capacity: 12, fractionalTrailers: 16.92, slotsAfter: 284 },
  { dn: 500, totalSticks: 388, nestedSticks: 284, residualSticks: 104, capacity: 20, fractionalTrailers: 5.2, slotsAfter: 388 },
  { dn: 400, totalSticks: 163, nestedSticks: 163, residualSticks: 0, capacity: 35, fractionalTrailers: 0, slotsAfter: 225 },
  { dn: 315, totalSticks: 288, nestedSticks: 225, residualSticks: 63, capacity: 48, fractionalTrailers: 1.31, slotsAfter: 288 },
  { dn: 250, totalSticks: 165, nestedSticks: 165, residualSticks: 0, capacity: 81, fractionalTrailers: 0, slotsAfter: 123 },
  { dn: 200, totalSticks: 246, nestedSticks: 123, residualSticks: 123, capacity: 130, fractionalTrailers: 0.95, slotsAfter: 246 },
  { dn: 160, totalSticks: 297, nestedSticks: 246, residualSticks: 51, capacity: 200, fractionalTrailers: 0.26, slotsAfter: 297 },
  { dn: 125, totalSticks: 173, nestedSticks: 173, residualSticks: 0, capacity: 330, fractionalTrailers: 0, slotsAfter: 124 }
];

const expectedRed = [
  { dn: 900, totalSticks: 74, nestedSticks: 0, residualSticks: 74, capacity: 6, fractionalTrailers: 12.33, slotsAfter: 74 },
  { dn: 710, totalSticks: 432, nestedSticks: 74, residualSticks: 358, capacity: 9, fractionalTrailers: 39.78, slotsAfter: 432 },
  { dn: 560, totalSticks: 92, nestedSticks: 92, residualSticks: 0, capacity: 16, fractionalTrailers: 0, slotsAfter: 340 },
  { dn: 450, totalSticks: 182, nestedSticks: 182, residualSticks: 0, capacity: 18, fractionalTrailers: 0, slotsAfter: 158 },
  { dn: 355, totalSticks: 125, nestedSticks: 125, residualSticks: 0, capacity: 40, fractionalTrailers: 0, slotsAfter: 33 },
  { dn: 280, totalSticks: 245, nestedSticks: 33, residualSticks: 212, capacity: 64, fractionalTrailers: 3.31, slotsAfter: 245 },
  { dn: 225, totalSticks: 156, nestedSticks: 156, residualSticks: 0, capacity: 100, fractionalTrailers: 0, slotsAfter: 89 },
  { dn: 180, totalSticks: 420, nestedSticks: 89, residualSticks: 331, capacity: 150, fractionalTrailers: 2.21, slotsAfter: 420 },
  { dn: 140, totalSticks: 453, nestedSticks: 420, residualSticks: 33, capacity: 280, fractionalTrailers: 0.12, slotsAfter: 453 },
  { dn: 110, totalSticks: 109, nestedSticks: 109, residualSticks: 0, capacity: 500, fractionalTrailers: 0, slotsAfter: 344 }
];

describe("Hi-Tech reference calculation 2: waterfall nesting and residuals", () => {
  const result = calculateNesting(referenceItems, true);

  it("matches Family Black residual math and subtotal", () => {
    const black = result.families.find((family) => family.name === "Family Black");
    expect(black?.steps).toMatchObject(expectedBlack);
    expect(black?.subtotalTrailers).toBe(33.64);
  });

  it("matches Family Red residual math and subtotal", () => {
    const red = result.families.find((family) => family.name === "Family Red");
    expect(red?.steps).toMatchObject(expectedRed);
    expect(red?.subtotalTrailers).toBe(57.75);
  });
});
