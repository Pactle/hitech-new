export type PipeItem = {
  id: string;
  description: string;
  pn: number;
  dn: number;
  uom: string;
  qty: number;
  wtPerMeter: number;
  rateKg: number;
  rateMeter: number;
  amount: number;
  totalWeight: number;
};

export type ParsedInquiry = {
  customer: string;
  location: string;
  quoteId: string;
  date: string;
  createdBy: string;
  attachments: string[];
  items: PipeItem[];
};

export type QuoteSettings = {
  freightPerTrailer: number;
  tpiPercent: number;
  gstPercent: number;
  roundPipePieces: boolean;
  nestingMode: "subtractive" | "stacked-waterfall" | "reference-hybrid";
  vehicleType: "trailer" | "truck";
  finalRounding: "ceil" | "floor" | "nearest";
};

export type FamilyStep = {
  dn: number;
  totalSticks: number;
  nestedSticks: number;
  residualSticks: number;
  capacity: number;
  fractionalTrailers: number;
  slotsBefore: number;
  slotsAfter: number;
  slotsCreated: number;
};

export type NestingFamily = {
  id: string;
  name: string;
  pn: number;
  mode: "1_DOWN" | "2_DOWN";
  strategy: "subtractive" | "stacked-waterfall" | "reference-hybrid";
  vehicleType: "trailer" | "truck";
  sequence: number[];
  subtotalTrailers: number;
  steps: FamilyStep[];
};

export type NestingResult = {
  totalPartialTrailers: number;
  totalVehicles: number;
  totalTrailers: number;
  totalMeters: number;
  vehicleType: "trailer" | "truck";
  families: NestingFamily[];
};

export type QuotationLine = PipeItem & {
  sticks: number;
  tpiAmount: number;
  freightPerMeter: number;
  rateExcludingTax: number;
  gstAmountPerMeter: number;
  rateIncludingTax: number;
  finalAmount: number;
};

export type QuotationTotals = {
  totalWeight: number;
  totalMeters: number;
  subtotalBase: number;
  subtotalWithoutTax: number;
  gstTotal: number;
  grandTotal: number;
  totalFreight: number;
  freightPerMeter: number;
  totalVehicles: number;
  totalTrailers: number;
};

export type CalculationResult = {
  lines: QuotationLine[];
  nesting: NestingResult;
  totals: QuotationTotals;
};
