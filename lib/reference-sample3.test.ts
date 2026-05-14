import { describe, expect, it } from "vitest";
import { calculateNesting } from "@/lib/nesting-engine";
import { pipeItem } from "@/lib/reference-sample-fixtures.test-utils";

const sample3Items = [
  pipeItem(1000, 162),
  pipeItem(800, 70),
  pipeItem(630, 97),
  pipeItem(500, 339),
  pipeItem(400, 1143),
  pipeItem(315, 485),
  pipeItem(250, 832),
  pipeItem(200, 727),
  pipeItem(160, 1525),
  pipeItem(125, 1295),
  pipeItem(90, 1153),
  pipeItem(900, 187),
  pipeItem(710, 132),
  pipeItem(560, 44),
  pipeItem(450, 595),
  pipeItem(355, 666),
  pipeItem(280, 853),
  pipeItem(225, 886),
  pipeItem(180, 1318),
  pipeItem(140, 2080),
  pipeItem(110, 5741)
];

describe("Reference sample 3 from ALL 3 Hi-tech Quotation Calculations (1).pdf", () => {
  it("documents that the PDF's stated red subtotal does not match its listed red residual lines", () => {
    const listedRedLineTotal = 31.17 + 32.44 + 2.92 + 2.72 + 7.32;

    expect(listedRedLineTotal).toBe(76.57);
    expect(listedRedLineTotal).not.toBe(91.17);
  });

  it("supports the quote-specific round-down option for stacked-waterfall calculations", () => {
    const result = calculateNesting(sample3Items, {
      roundPipePieces: true,
      nestingMode: "stacked-waterfall",
      vehicleType: "trailer",
      finalRounding: "floor"
    });

    expect(result.totalVehicles).toBe(Math.floor(result.totalPartialTrailers));
  });
});
