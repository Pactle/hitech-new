import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateQuotation } from "@/lib/freight";

const itemSchema = z.object({
  id: z.string(),
  description: z.string(),
  pn: z.coerce.number(),
  dn: z.coerce.number(),
  uom: z.string(),
  qty: z.coerce.number(),
  wtPerMeter: z.coerce.number(),
  rateKg: z.coerce.number(),
  rateMeter: z.coerce.number(),
  amount: z.coerce.number(),
  totalWeight: z.coerce.number()
});

const bodySchema = z.object({
  items: z.array(itemSchema),
  settings: z.object({
    freightPerTrailer: z.coerce.number(),
    tpiPercent: z.coerce.number(),
    gstPercent: z.coerce.number(),
    roundPipePieces: z.boolean(),
    nestingMode: z.enum(["subtractive", "stacked-waterfall", "reference-hybrid"]).default("subtractive"),
    vehicleType: z.enum(["trailer", "truck"]).default("trailer"),
    finalRounding: z.enum(["ceil", "floor", "nearest"]).default("ceil")
  })
});

export async function POST(request: Request) {
  const json = await request.json();
  const result = bodySchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  return NextResponse.json(calculateQuotation(result.data.items, result.data.settings));
}
