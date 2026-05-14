import { describe, expect, it } from "vitest";
import { calculateNesting } from "@/lib/nesting-engine";
import { pipeItem } from "@/lib/reference-sample-fixtures.test-utils";

const sample2Items = [
  pipeItem(560, 228, { qty: 2729 }),
  pipeItem(500, 185, { qty: 2211 }),
  pipeItem(400, 35, { qty: 420 }),
  pipeItem(355, 124, { qty: 1479 }),
  pipeItem(315, 90, { qty: 1072 }),
  pipeItem(280, 70, { qty: 832 }),
  pipeItem(250, 122, { qty: 1464 }),
  pipeItem(225, 99, { qty: 1184 }),
  pipeItem(180, 395, { qty: 4735 }),
  pipeItem(160, 2383, { qty: 28586 }),
  pipeItem(140, 1661, { qty: 19931 })
];

describe("Reference sample 2 from ALL 3 Hi-tech Quotation Calculations (1).pdf", () => {
  it("matches the sample 2 family totals and final trailer count", () => {
    const result = calculateNesting(sample2Items, {
      roundPipePieces: true,
      nestingMode: "stacked-waterfall",
      vehicleType: "trailer",
      finalRounding: "ceil"
    });

    expect.soft(result.families.find((family) => family.name === "Family Black")?.subtotalTrailers).toBe(20.24);
    expect.soft(result.families.find((family) => family.name === "Family Red")?.subtotalTrailers).toBe(19.88);
    expect.soft(result.totalPartialTrailers).toBe(40.12);
    expect.soft(result.totalTrailers).toBe(41);
  });
});
