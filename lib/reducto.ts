import { sampleInquiry } from "@/lib/sample-data";
import type { ParsedInquiry } from "@/types/quotation";

export async function parseWithReducto(file: File): Promise<ParsedInquiry> {
  const apiKey = process.env.REDUCTO_API_KEY;
  if (!apiKey) {
    return sampleInquiry;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "prompt",
    [
      "Extract PE100 pipe quotation rows as JSON.",
      "Detect item description, PN, DN, UOM, quantity meters, weight per meter, rate/kg, rate/m, amount, and total weight.",
      "Normalize OCR errors and return only structured quotation JSON."
    ].join(" ")
  );

  const response = await fetch("https://platform.reducto.ai/api/parse", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    return sampleInquiry;
  }

  const data = await response.json();
  return normalizeReductoResponse(data);
}

function normalizeReductoResponse(data: unknown): ParsedInquiry {
  if (!data || typeof data !== "object") {
    return sampleInquiry;
  }

  const candidate = data as Partial<ParsedInquiry> & { result?: Partial<ParsedInquiry> };
  const parsed = candidate.items ? candidate : candidate.result;
  if (!parsed?.items?.length) {
    return sampleInquiry;
  }

  return {
    customer: parsed.customer ?? "Imported Customer",
    location: parsed.location ?? "Unknown",
    quoteId: parsed.quoteId ?? `OCR-${Date.now()}`,
    date: parsed.date ?? new Date().toISOString().slice(0, 10),
    createdBy: parsed.createdBy ?? "Hi-Tech",
    attachments: parsed.attachments ?? [],
    items: parsed.items.map((item, index) => ({
      id: item.id ?? `ocr-${index + 1}`,
      description: item.description ?? "",
      pn: Number(item.pn ?? 0),
      dn: Number(item.dn ?? 0),
      uom: item.uom ?? "Rmt",
      qty: Number(item.qty ?? 0),
      wtPerMeter: Number(item.wtPerMeter ?? 0),
      rateKg: Number(item.rateKg ?? 0),
      rateMeter: Number(item.rateMeter ?? 0),
      amount: Number(item.amount ?? 0),
      totalWeight: Number(item.totalWeight ?? 0)
    }))
  };
}
