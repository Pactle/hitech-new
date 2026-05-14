export const DN_LADDER = [
  90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500,
  560, 630, 710, 800, 900, 1000, 1200
] as const;

export const TRAILER_12M_CAPACITY: Record<number, number> = {
  63: 900,
  75: 800,
  90: 700,
  110: 500,
  125: 330,
  140: 280,
  160: 200,
  180: 150,
  200: 130,
  225: 100,
  250: 81,
  280: 64,
  315: 48,
  355: 40,
  400: 35,
  450: 18,
  500: 20,
  560: 16,
  630: 12,
  710: 9,
  800: 9,
  900: 6,
  1000: 5,
  1200: 4
};

export const TRUCK_6M_CAPACITY: Record<
  number,
  { quantity: number; unit: "Coils" | "Pipes"; lengthMeters: number; totalMeters: number }
> = {
  20: { quantity: 60, unit: "Coils", lengthMeters: 500, totalMeters: 30000 },
  25: { quantity: 60, unit: "Coils", lengthMeters: 500, totalMeters: 30000 },
  40: { quantity: 16, unit: "Coils", lengthMeters: 500, totalMeters: 8000 },
  50: { quantity: 16, unit: "Coils", lengthMeters: 500, totalMeters: 8000 },
  63: { quantity: 1200, unit: "Pipes", lengthMeters: 6, totalMeters: 7200 },
  75: { quantity: 1000, unit: "Pipes", lengthMeters: 6, totalMeters: 6000 },
  90: { quantity: 700, unit: "Pipes", lengthMeters: 6, totalMeters: 4200 },
  110: { quantity: 500, unit: "Pipes", lengthMeters: 6, totalMeters: 3000 },
  125: { quantity: 380, unit: "Pipes", lengthMeters: 6, totalMeters: 2280 },
  140: { quantity: 315, unit: "Pipes", lengthMeters: 6, totalMeters: 1890 },
  160: { quantity: 230, unit: "Pipes", lengthMeters: 6, totalMeters: 1380 },
  180: { quantity: 160, unit: "Pipes", lengthMeters: 6, totalMeters: 960 },
  200: { quantity: 135, unit: "Pipes", lengthMeters: 6, totalMeters: 810 },
  225: { quantity: 115, unit: "Pipes", lengthMeters: 6, totalMeters: 690 },
  250: { quantity: 85, unit: "Pipes", lengthMeters: 6, totalMeters: 510 },
  280: { quantity: 75, unit: "Pipes", lengthMeters: 6, totalMeters: 450 },
  315: { quantity: 45, unit: "Pipes", lengthMeters: 6, totalMeters: 270 },
  355: { quantity: 35, unit: "Pipes", lengthMeters: 6, totalMeters: 210 },
  400: { quantity: 25, unit: "Pipes", lengthMeters: 6, totalMeters: 150 },
  450: { quantity: 18, unit: "Pipes", lengthMeters: 6, totalMeters: 108 },
  500: { quantity: 16, unit: "Pipes", lengthMeters: 6, totalMeters: 96 },
  560: { quantity: 16, unit: "Pipes", lengthMeters: 6, totalMeters: 96 },
  630: { quantity: 12, unit: "Pipes", lengthMeters: 6, totalMeters: 72 },
  710: { quantity: 9, unit: "Pipes", lengthMeters: 6, totalMeters: 54 },
  800: { quantity: 5, unit: "Pipes", lengthMeters: 6, totalMeters: 30 },
  900: { quantity: 5, unit: "Pipes", lengthMeters: 6, totalMeters: 30 },
  1000: { quantity: 4, unit: "Pipes", lengthMeters: 6, totalMeters: 24 },
  1200: { quantity: 2, unit: "Pipes", lengthMeters: 6, totalMeters: 12 }
};

export function getNestingMode(pn: number): "1_DOWN" | "2_DOWN" {
  return pn >= 12.5 ? "2_DOWN" : "1_DOWN";
}

export function getFamilyModulo(pn: number) {
  return getNestingMode(pn) === "1_DOWN" ? 2 : 3;
}
