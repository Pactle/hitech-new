import type { PipeItem } from "@/types/quotation";

export function pipeItem(dn: number, sticks: number, options?: { pn?: number; qty?: number }): PipeItem {
  const pn = options?.pn ?? 4;
  const qty = options?.qty ?? sticks * 12;
  const wtPerMeter = 1;
  const rateKg = 100;
  const rateMeter = wtPerMeter * rateKg;

  return {
    id: `sample-pn${pn}-dn${dn}`,
    description: `PE100 PN${pn} DN${dn}`,
    pn,
    dn,
    uom: "Rmt",
    qty,
    wtPerMeter,
    rateKg,
    rateMeter,
    amount: qty * rateMeter,
    totalWeight: qty * wtPerMeter
  };
}
