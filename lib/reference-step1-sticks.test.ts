import { describe, expect, it } from "vitest";
import { metersToSticks } from "@/lib/nesting-engine";
import { referenceItems } from "@/lib/sample-data";

const expectedBlackSticks = new Map([
  [800, 81],
  [630, 284],
  [500, 388],
  [400, 163],
  [315, 288],
  [250, 165],
  [200, 246],
  [160, 297],
  [125, 173]
]);

const expectedRedSticks = new Map([
  [900, 74],
  [710, 432],
  [560, 92],
  [450, 182],
  [355, 125],
  [280, 245],
  [225, 156],
  [180, 420],
  [140, 453],
  [110, 109]
]);

describe("Hi-Tech reference calculation 1: quantity to 12m sticks", () => {
  it("converts the Family Black quantities to the PDF stick counts", () => {
    for (const [dn, expectedSticks] of expectedBlackSticks) {
      const item = referenceItems.find((candidate) => candidate.dn === dn);
      expect(item, `missing DN ${dn}`).toBeDefined();
      expect(metersToSticks(item?.qty ?? 0, true), `DN ${dn}`).toBe(expectedSticks);
    }
  });

  it("converts the Family Red quantities to the PDF stick counts", () => {
    for (const [dn, expectedSticks] of expectedRedSticks) {
      const item = referenceItems.find((candidate) => candidate.dn === dn);
      expect(item, `missing DN ${dn}`).toBeDefined();
      expect(metersToSticks(item?.qty ?? 0, true), `DN ${dn}`).toBe(expectedSticks);
    }
  });
});
