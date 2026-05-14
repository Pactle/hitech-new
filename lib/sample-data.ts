import type { ParsedInquiry, PipeItem } from "@/types/quotation";

const blackSticks = [
  [800, 81],
  [630, 284],
  [500, 388],
  [400, 163],
  [315, 288],
  [250, 165],
  [200, 246],
  [160, 297],
  [125, 173]
] as const;

const redSticks = [
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
] as const;

const weightByDn: Record<number, number> = {
  110: 1.869,
  125: 2.415,
  140: 2.831,
  160: 3.56,
  180: 4.52,
  200: 5.6,
  225: 7.11,
  250: 8.73,
  280: 10.95,
  315: 13.8,
  355: 17.5,
  400: 22.3,
  450: 28.1,
  500: 34.7,
  560: 43.8,
  630: 55.3,
  710: 70.1,
  800: 88.7,
  900: 112.3
};

function makeItem(index: number, dn: number, sticks: number): PipeItem {
  const wtPerMeter = weightByDn[dn] ?? dn / 10;
  const rateKg = 165;
  const rateMeter = Number((wtPerMeter * rateKg).toFixed(2));
  const qty = sticks * 12;
  const amount = Number((qty * rateMeter).toFixed(2));
  return {
    id: `item-${index.toString().padStart(2, "0")}`,
    description: `PE100 PN4 DN${dn}`,
    pn: 4,
    dn,
    uom: "Rmt",
    qty,
    wtPerMeter,
    rateKg,
    rateMeter,
    amount,
    totalWeight: Number((qty * wtPerMeter).toFixed(2))
  };
}

export const referenceItems: PipeItem[] = [...blackSticks, ...redSticks].map(
  ([dn, sticks], index) => makeItem(index + 1, dn, sticks)
);

export const sampleInquiry: ParsedInquiry = {
  customer: "M/S Prakash B.",
  location: "Kolhapur",
  quoteId: "PRB-001-V1-Q",
  date: "2025-07-30",
  createdBy: "Rakesh Sharma",
  attachments: ["inquiry.pdf", "specs.jpg"],
  items: referenceItems
};

const suite2Sticks = [
  [900, 187],
  [710, 132],
  [560, 44],
  [450, 595],
  [355, 666],
  [280, 853],
  [225, 886],
  [180, 1318],
  [140, 2080],
  [110, 5741],
  [1000, 162],
  [800, 70],
  [630, 97],
  [500, 338],
  [400, 1143],
  [315, 485],
  [250, 832],
  [200, 727],
  [160, 1524],
  [125, 1294],
  [90, 1153]
] as const;

export const demoSuite2Items: PipeItem[] = suite2Sticks.map(([dn, sticks], index) =>
  makeItem(index + 1, dn, sticks)
);

export const demoSuite2Inquiry: ParsedInquiry = {
  customer: "Demo Suite 2",
  location: "Reference PDF (2)",
  quoteId: "DEMO-SUITE-2",
  date: "2026-05-15",
  createdBy: "Hi-Tech",
  attachments: ["ALL 3 Hi-tech Quotation Calculations (2).pdf"],
  items: demoSuite2Items
};

export const emptyInquiry: ParsedInquiry = {
  customer: "No inquiry loaded",
  location: "-",
  quoteId: "New quotation",
  date: new Date().toISOString().slice(0, 10),
  createdBy: "Hi-Tech",
  attachments: [],
  items: []
};

export const defaultSettings = {
  freightPerTrailer: 40000,
  tpiPercent: 0.35,
  gstPercent: 18,
  roundPipePieces: true,
  nestingMode: "subtractive" as const,
  vehicleType: "trailer" as const,
  finalRounding: "ceil" as const
};

export const demoSuite2Settings = {
  ...defaultSettings,
  nestingMode: "reference-hybrid" as const,
  vehicleType: "trailer" as const,
  finalRounding: "ceil" as const
};
