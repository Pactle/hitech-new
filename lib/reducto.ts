import { sampleInquiry } from "@/lib/sample-data";
import { getDefaultWeightPerMeter } from "@/lib/pipe-options";
import type { ParsedInquiry, PipeItem } from "@/types/quotation";

type ReductoInputReference = Record<string, unknown>;

type ReductoExtractResponse = {
  result?: unknown;
  [key: string]: unknown;
};

class ReductoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReductoError";
  }
}

export async function parseWithReducto(file: File): Promise<ParsedInquiry> {
  const apiKey = process.env.REDUCTO_API_KEY;
  if (!apiKey) {
    return sampleInquiry;
  }

  try {
    const baseUrl = (process.env.REDUCTO_API_BASE_URL ?? "https://platform.reducto.ai").replace(/\/$/, "");
    const input = await uploadDocument({ apiKey, baseUrl, file });
    const raw = await extractPipeQuotation({ apiKey, baseUrl, input });
    return normalizeReductoResponse(raw, file.name);
  } catch (error) {
    console.error("Reducto parsing failed", error);
    return sampleInquiry;
  }
}

async function uploadDocument({
  apiKey,
  baseUrl,
  file
}: {
  apiKey: string;
  baseUrl: string;
  file: File;
}): Promise<ReductoInputReference> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  try {
    const response = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      },
      body: formData
    });

    if (!response.ok) {
      throw new ReductoError(`Upload failed with ${response.status}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return isRecord(data.input) ? data.input : data;
  } catch {
    const bytes = Buffer.from(await file.arrayBuffer());
    return {
      type: "inline",
      data: bytes.toString("base64"),
      filename: file.name,
      content_type: file.type || "application/octet-stream"
    };
  }
}

async function extractPipeQuotation({
  apiKey,
  baseUrl,
  input
}: {
  apiKey: string;
  baseUrl: string;
  input: ReductoInputReference;
}) {
  const response = await fetch(`${baseUrl}/extract`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input,
      instructions: {
        schema: buildPipeQuotationSchema(),
        system_prompt: buildPipeQuotationPrompt()
      },
      settings: {
        array_extract: true,
        citations: { enabled: false }
      }
    })
  });

  if (!response.ok) {
    throw new ReductoError(`Extract failed with ${response.status}`);
  }

  return (await response.json()) as ReductoExtractResponse;
}

export function normalizeReductoResponse(raw: unknown, fileName = "uploaded document"): ParsedInquiry {
  const payload = extractPayload(raw);
  if (!isRecord(payload)) {
    return { ...sampleInquiry, attachments: [fileName] };
  }

  const projectInfo = unwrapRecord(payload.project_info);
  const lineItems = ensureArray(payload.items ?? payload.line_items);

  if (lineItems.length === 0) {
    return { ...sampleInquiry, attachments: [fileName] };
  }

  const items = lineItems
    .map((line, index) => normalizeLineItem(line, index))
    .filter((item): item is PipeItem => Boolean(item));

  if (items.length === 0) {
    return { ...sampleInquiry, attachments: [fileName] };
  }

  return {
    customer: stringValue(payload.customer ?? projectInfo.customer ?? projectInfo.company_name, "Imported Customer"),
    location: stringValue(payload.location ?? projectInfo.location, "Unknown"),
    quoteId: stringValue(payload.quote_id ?? projectInfo.reference_number, `OCR-${Date.now()}`),
    date: stringValue(payload.date ?? projectInfo.date, new Date().toISOString().slice(0, 10)),
    createdBy: "Reducto",
    attachments: [fileName],
    items
  };
}

function normalizeLineItem(raw: unknown, index: number): PipeItem | null {
  const values = unwrapRecord(raw);
  const description = stringValue(values.description ?? values.item_description, "");
  const pn = numberValue(values.pn ?? values.PN ?? extractPn(description), 0);
  const dn = numberValue(values.dn ?? values.DN ?? extractDn(description), 0);
  const qty = numberValue(values.qty ?? values.quantity ?? values.total_meters ?? values.meters, 0);

  if (!description && !dn) {
    return null;
  }

  const wtPerMeter = numberValue(
    values.wtPerMeter ?? values.weight_per_meter ?? values.wt_per_meter ?? values.weightPerMeter,
    dn ? getDefaultWeightPerMeter(dn) : 0
  );
  const rateKg = numberValue(values.rateKg ?? values.rate_kg ?? values.rate_per_kg, 0);
  const rateMeter = numberValue(values.rateMeter ?? values.rate_m ?? values.rate_per_meter, wtPerMeter * rateKg);
  const amount = numberValue(values.amount ?? values.total_price, qty * rateMeter);
  const totalWeight = numberValue(values.totalWeight ?? values.total_weight, qty * wtPerMeter);

  return {
    id: `ocr-${index + 1}`,
    description: description || `PE100 PN${pn} DN${dn}`,
    pn,
    dn,
    uom: stringValue(values.uom ?? values.unit, "Rmt"),
    qty,
    wtPerMeter,
    rateKg,
    rateMeter,
    amount,
    totalWeight
  };
}

function extractPayload(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    return raw[0];
  }

  if (!isRecord(raw)) {
    return raw;
  }

  if ("result" in raw) {
    const result = raw.result;
    if (Array.isArray(result) && result.length === 1) return result[0];
    if (Array.isArray(result)) return { line_items: result };
    if (isRecord(result)) return result;
  }

  return raw;
}

function unwrapRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  if (isRecord(value.value)) return value.value;
  return value;
}

function ensureArray(value: unknown): unknown[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function numberValue(value: unknown, fallback: number): number {
  const unwrapped = isRecord(value) && "value" in value ? value.value : value;
  if (typeof unwrapped === "number") return Number.isFinite(unwrapped) ? unwrapped : fallback;
  if (typeof unwrapped !== "string") return fallback;

  const cleaned = unwrapped.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!cleaned) return fallback;

  const parsed = Number(cleaned[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  const unwrapped = isRecord(value) && "value" in value ? value.value : value;
  if (typeof unwrapped === "string" && unwrapped.trim()) return unwrapped.trim();
  if (typeof unwrapped === "number") return String(unwrapped);
  return fallback;
}

function extractPn(description: string) {
  const match = description.match(/\bPN\s*(\d+(?:\.\d+)?)\b/i);
  return match ? Number(match[1]) : 0;
}

function extractDn(description: string) {
  const match = description.match(/\bDN\s*(\d+)\b/i);
  return match ? Number(match[1]) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildPipeQuotationSchema() {
  return {
    type: "object",
    properties: {
      project_info: {
        type: "object",
        properties: {
          customer: { type: "string" },
          company_name: { type: "string" },
          location: { type: "string" },
          reference_number: { type: "string" },
          date: { type: "string" }
        }
      },
      customer: { type: "string" },
      location: { type: "string" },
      quote_id: { type: "string" },
      date: { type: "string" },
      line_items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            line_no: { type: ["integer", "string"] },
            description: { type: "string" },
            pn: { type: ["number", "string"] },
            dn: { type: ["number", "string"] },
            uom: { type: "string" },
            quantity: { type: ["number", "string"] },
            weight_per_meter: { type: ["number", "string", "null"] },
            rate_per_kg: { type: ["number", "string", "null"] },
            rate_per_meter: { type: ["number", "string", "null"] },
            amount: { type: ["number", "string", "null"] },
            total_weight: { type: ["number", "string", "null"] },
            notes: { type: "string" }
          }
        }
      },
      confidence_score: { type: ["number", "null"] }
    },
    required: ["line_items"]
  };
}

function buildPipeQuotationPrompt() {
  return `
You are an RFQ extraction expert for HDPE/PE pipe quotations.

Extract all PE100/HDPE/PE pipe table rows from inquiry documents.

Return JSON matching the schema only.

Fields to extract:
- customer / company_name: buyer or customer name.
- location: project or delivery location.
- quote_id / reference_number: inquiry, quote, or reference number if visible.
- date: document date if visible.
- line_items: all pipe rows.
- description: copy item description exactly.
- pn: pressure class number from text such as PN4, PN6, PN8, PN10, PN12.5, PN16, PN20.
- dn: pipe diameter number from text such as DN140, DN 630, 900 mm.
- uom: unit, usually Rmt.
- quantity: running meters / Qty in m / Rmt quantity.
- weight_per_meter: Wt/m, kg/m, or weight per meter.
- rate_per_kg: basic rate per kg.
- rate_per_meter: rate per meter.
- amount: item amount.
- total_weight: total weight for the row.

Normalize OCR errors:
- Treat Rmt, RM, running meter, and meters as Rmt.
- Remove commas from numbers.
- Preserve decimal values, especially PN12.5 and weights.
- If PN or DN is missing as a separate column, extract it from the description.
- Ignore subtotal, GST, freight, and grand total rows.
`;
}
