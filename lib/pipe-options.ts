import { DN_LADDER } from "@/lib/capacity";

export const PN_OPTIONS = [4, 6, 8, 10, 12.5, 16, 20] as const;

export const PN_DIAMETERS: Record<number, number[]> = {
  4: [...DN_LADDER],
  6: [...DN_LADDER],
  8: [...DN_LADDER],
  10: [...DN_LADDER],
  12.5: [...DN_LADDER],
  16: DN_LADDER.filter((dn) => dn !== 1200),
  20: DN_LADDER.filter((dn) => dn !== 1000 && dn !== 1200)
};

export const DEFAULT_WEIGHT_BY_DN: Record<number, number> = {
  90: 1.25,
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
  900: 112.3,
  1000: 139.6,
  1200: 200.4
};

export function getDiametersForPn(pn: number) {
  return PN_DIAMETERS[pn] ?? [...DN_LADDER];
}

export function getDefaultWeightPerMeter(dn: number) {
  return DEFAULT_WEIGHT_BY_DN[dn] ?? Number((dn / 10).toFixed(3));
}
