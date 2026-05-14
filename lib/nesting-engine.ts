import { DN_LADDER, TRAILER_12M_CAPACITY, TRUCK_6M_CAPACITY, getFamilyModulo, getNestingMode } from "@/lib/capacity";
import type { FamilyStep, NestingFamily, NestingResult, PipeItem } from "@/types/quotation";

type StickRow = {
  pn: number;
  dn: number;
  sticks: number;
};

export type NestingOptions = {
  roundPipePieces?: boolean;
  nestingMode?: "subtractive" | "stacked-waterfall" | "reference-hybrid";
  vehicleType?: "trailer" | "truck";
  finalRounding?: "ceil" | "floor" | "nearest";
};

export function metersToSticks(meters: number, roundPipePieces = true) {
  const sticks = meters / 12;
  return roundPipePieces ? Math.ceil(sticks) : sticks;
}

export function metersToVehiclePieces(meters: number, vehicleType: "trailer" | "truck", roundPipePieces = true) {
  const length = vehicleType === "truck" ? 6 : 12;
  const pieces = meters / length;
  return roundPipePieces ? Math.ceil(pieces) : pieces;
}

export function calculateNesting(items: PipeItem[], optionsOrRound: NestingOptions | boolean = true): NestingResult {
  const options: Required<NestingOptions> =
    typeof optionsOrRound === "boolean"
      ? {
          roundPipePieces: optionsOrRound,
          nestingMode: "subtractive",
          vehicleType: "trailer",
          finalRounding: "ceil"
        }
      : {
          roundPipePieces: optionsOrRound.roundPipePieces ?? true,
          nestingMode: optionsOrRound.nestingMode ?? "subtractive",
          vehicleType: optionsOrRound.vehicleType ?? "trailer",
          finalRounding: optionsOrRound.finalRounding ?? "ceil"
        };

  const rows = items
    .filter((item) => Number.isFinite(item.dn) && Number.isFinite(item.qty) && item.qty > 0)
    .map<StickRow>((item) => ({
      pn: item.pn,
      dn: item.dn,
      sticks: metersToVehiclePieces(item.qty, options.vehicleType, options.roundPipePieces)
    }));

  const grouped = new Map<string, StickRow[]>();
  for (const row of rows) {
    const mode = getNestingMode(row.pn);
    const modulo = getFamilyModulo(row.pn);
    const ladderIndex = DN_LADDER.indexOf(row.dn as (typeof DN_LADDER)[number]);
    const familyIndex = ladderIndex >= 0 ? ladderIndex % modulo : row.dn % modulo;
    const key = `${row.pn}:${mode}:${familyIndex}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  const families = Array.from(grouped.entries())
    .map(([key, familyRows]) => buildFamily(key, familyRows, options))
    .filter((family) => family.steps.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalPartialTrailers = round2(families.reduce((sum, family) => sum + family.subtotalTrailers, 0));
  const totalMeters = items.reduce((sum, item) => sum + item.qty, 0);
  const totalVehicles = roundVehicles(totalPartialTrailers, options.finalRounding);

  return {
    totalPartialTrailers,
    totalVehicles,
    totalTrailers: totalVehicles,
    totalMeters,
    vehicleType: options.vehicleType,
    families
  };
}

function buildFamily(key: string, rows: StickRow[], options: Required<NestingOptions>): NestingFamily {
  const [pnText, mode, familyIndexText] = key.split(":");
  const pn = Number(pnText);
  const familyIndex = Number(familyIndexText);
  const totalsByDn = new Map<number, number>();

  for (const row of rows) {
    totalsByDn.set(row.dn, (totalsByDn.get(row.dn) ?? 0) + row.sticks);
  }

  const sequence = Array.from(totalsByDn.keys()).sort((a, b) => b - a);
  if (options.nestingMode === "reference-hybrid" && pn < 12.5) {
    const hybrid = buildReferenceHybridFamily(key, pn, mode as "1_DOWN" | "2_DOWN", familyIndex, sequence, totalsByDn, options);
    if (hybrid) return hybrid;
  }

  let availableSlots = 0;
  const steps: FamilyStep[] = [];

  for (const dn of sequence) {
    const totalSticks = totalsByDn.get(dn) ?? 0;
    const nestedSticks = Math.min(totalSticks, availableSlots);
    const residualSticks = Math.max(totalSticks - nestedSticks, 0);
    const capacity = getCapacity(dn, options.vehicleType);
    const fractionalTrailers = round2(residualSticks / capacity);
    const slotsBefore = availableSlots;
    const slotsAfter =
      options.nestingMode === "stacked-waterfall"
        ? residualSticks > 0
          ? totalSticks
          : Math.max(availableSlots, totalSticks)
        : residualSticks > 0
          ? totalSticks
          : Math.max(availableSlots - nestedSticks, 0);
    const slotsCreated = residualSticks > 0 ? residualSticks : 0;

    steps.push({
      dn,
      totalSticks,
      nestedSticks,
      residualSticks,
      capacity,
      fractionalTrailers,
      slotsBefore,
      slotsAfter,
      slotsCreated
    });

    availableSlots = slotsAfter;
  }

  const subtotalTrailers = round2(steps.reduce((sum, step) => sum + step.fractionalTrailers, 0));
  const familyLabel = mode === "1_DOWN" ? ["Black", "Red"][familyIndex] ?? `Group ${familyIndex + 1}` : `Group ${familyIndex + 1}`;

  return {
    id: key,
    name: `Family ${familyLabel}`,
    pn,
    mode: mode as "1_DOWN" | "2_DOWN",
    strategy: options.nestingMode,
    vehicleType: options.vehicleType,
    sequence,
    subtotalTrailers,
    steps
  };
}

function buildReferenceHybridFamily(
  key: string,
  pn: number,
  mode: "1_DOWN" | "2_DOWN",
  familyIndex: number,
  sequence: number[],
  totalsByDn: Map<number, number>,
  options: Required<NestingOptions>
): NestingFamily | null {
  const hasAll = (dns: number[]) => dns.every((dn) => totalsByDn.has(dn));
  const steps: FamilyStep[] = [];
  const push = (dn: number, totalSticks: number, nestedSticks: number, residualSticks: number, slotsBefore: number, slotsAfter: number, charge = true) => {
    const capacity = getCapacity(dn, options.vehicleType);
    steps.push({
      dn,
      totalSticks,
      nestedSticks,
      residualSticks,
      capacity,
      fractionalTrailers: charge ? round2(residualSticks / capacity) : 0,
      slotsBefore,
      slotsAfter,
      slotsCreated: residualSticks > 0 ? residualSticks : 0
    });
  };

  if (familyIndex === 0 && hasAll([1000, 800, 630, 500, 400, 315, 250, 200, 160, 125, 90])) {
    const dn1000 = totalsByDn.get(1000) ?? 0;
    const dn800 = totalsByDn.get(800) ?? 0;
    const dn630 = totalsByDn.get(630) ?? 0;
    const topGuestResidual = Math.max(dn800 + dn630 - dn1000, 0);
    const tunnelsAfterTopGuests = dn800 + dn630;
    const dn500 = totalsByDn.get(500) ?? 0;
    const dn500Residual = Math.max(dn500 - tunnelsAfterTopGuests, 0);
    const dn400 = totalsByDn.get(400) ?? 0;
    const dn400Residual = Math.max(dn400 - dn500, 0);

    push(1000, dn1000, 0, dn1000, 0, dn1000);
    push(800, dn800, Math.min(dn800, dn1000), 0, dn1000, Math.max(dn1000 - dn800, 0), false);
    push(630, dn630, Math.min(dn630, Math.max(dn1000 - dn800, 0)), topGuestResidual, Math.max(dn1000 - dn800, 0), tunnelsAfterTopGuests);
    push(500, dn500, Math.min(dn500, tunnelsAfterTopGuests), dn500Residual, tunnelsAfterTopGuests, dn500);
    push(400, dn400, Math.min(dn400, dn500), dn400Residual, dn500, dn400);

    // Preserve the revised reference sheet's treatment: middle residuals can become tunnels,
    // but only DN160 is chargeable in the lower black-family overflow group.
    const dn315 = totalsByDn.get(315) ?? 0;
    const after315 = Math.max(dn400 - dn315, 0);
    push(315, dn315, Math.min(dn315, dn400), 0, dn400, after315, false);
    const dn250 = totalsByDn.get(250) ?? 0;
    const dn250Residual = Math.max(dn250 - after315, 0);
    push(250, dn250, Math.min(dn250, after315), dn250Residual, after315, dn250, false);
    const dn200 = totalsByDn.get(200) ?? 0;
    const after200 = Math.max(dn250 - dn200, 0);
    push(200, dn200, Math.min(dn200, dn250), 0, dn250, after200, false);
    const dn160 = totalsByDn.get(160) ?? 0;
    const dn160Residual = Math.max(dn160 - after200, 0);
    push(160, dn160, Math.min(dn160, after200), dn160Residual, after200, dn160);
    const dn125 = totalsByDn.get(125) ?? 0;
    push(125, dn125, Math.min(dn125, dn160), 0, dn160, Math.max(dn160 - dn125, 0), false);
    const dn90 = totalsByDn.get(90) ?? 0;
    push(90, dn90, Math.min(dn90, dn160), 0, dn160, Math.max(dn160 - dn90, 0), false);

    return finishReferenceHybridFamily(key, pn, mode, familyIndex, sequence, options, steps);
  }

  if (familyIndex === 1 && hasAll([900, 710, 560, 450, 355, 280, 225, 180, 140, 110])) {
    const dn900 = totalsByDn.get(900) ?? 0;
    const dn710 = totalsByDn.get(710) ?? 0;
    const dn560 = totalsByDn.get(560) ?? 0;
    const remainingTop = Math.max(dn900 - dn710 - dn560, 0);
    const dn450 = totalsByDn.get(450) ?? 0;
    const dn450Residual = Math.max(dn450 - remainingTop, 0);
    const tunnelsAfter450 = dn900 + dn450Residual;
    const dn355 = totalsByDn.get(355) ?? 0;
    const remainingAfter355 = Math.max(tunnelsAfter450 - dn355, 0);
    const dn280 = totalsByDn.get(280) ?? 0;
    const dn280Residual = Math.max(dn280 - remainingAfter355, 0);
    const tunnelsAfter280 = tunnelsAfter450 + dn280Residual;
    const dn225 = totalsByDn.get(225) ?? 0;
    const dn180 = totalsByDn.get(180) ?? 0;
    const lowerPairTotal = dn225 + dn180;
    const lowerPairResidual = Math.max(lowerPairTotal - tunnelsAfter280, 0);
    const tunnelsAfterLowerPair = tunnelsAfter280 + lowerPairResidual;
    const dn140 = totalsByDn.get(140) ?? 0;
    const remainingAfter140 = Math.max(tunnelsAfterLowerPair - dn140, 0);
    const dn110 = totalsByDn.get(110) ?? 0;
    const dn110Residual = Math.max(dn110 - remainingAfter140, 0);

    push(900, dn900, 0, dn900, 0, dn900);
    push(710, dn710, dn710, 0, dn900, dn900 - dn710, false);
    push(560, dn560, dn560, 0, dn900 - dn710, remainingTop, false);
    push(450, dn450, Math.min(dn450, remainingTop), dn450Residual, remainingTop, tunnelsAfter450);
    push(355, dn355, dn355, 0, tunnelsAfter450, remainingAfter355, false);
    push(280, dn280, Math.min(dn280, remainingAfter355), dn280Residual, remainingAfter355, tunnelsAfter280);
    push(225, dn225, Math.min(dn225, tunnelsAfter280), 0, tunnelsAfter280, Math.max(tunnelsAfter280 - dn225, 0), false);
    push(180, dn180, Math.min(dn180, Math.max(tunnelsAfter280 - dn225, 0)), lowerPairResidual, Math.max(tunnelsAfter280 - dn225, 0), tunnelsAfterLowerPair);
    push(140, dn140, dn140, 0, tunnelsAfterLowerPair, remainingAfter140, false);
    push(110, dn110, Math.min(dn110, remainingAfter140), dn110Residual, remainingAfter140, dn110);

    return finishReferenceHybridFamily(key, pn, mode, familyIndex, sequence, options, steps);
  }

  return null;
}

function finishReferenceHybridFamily(
  key: string,
  pn: number,
  mode: "1_DOWN" | "2_DOWN",
  familyIndex: number,
  sequence: number[],
  options: Required<NestingOptions>,
  steps: FamilyStep[]
): NestingFamily {
  const subtotalTrailers = round2(steps.reduce((sum, step) => sum + step.fractionalTrailers, 0));
  const familyLabel = ["Black", "Red"][familyIndex] ?? `Group ${familyIndex + 1}`;

  return {
    id: key,
    name: `Family ${familyLabel}`,
    pn,
    mode,
    strategy: options.nestingMode,
    vehicleType: options.vehicleType,
    sequence,
    subtotalTrailers,
    steps
  };
}

function getCapacity(dn: number, vehicleType: "trailer" | "truck") {
  if (vehicleType === "truck") {
    return TRUCK_6M_CAPACITY[dn]?.quantity ?? TRAILER_12M_CAPACITY[dn] ?? 1;
  }

  return TRAILER_12M_CAPACITY[dn] ?? 1;
}

function roundVehicles(value: number, mode: "ceil" | "floor" | "nearest") {
  if (mode === "floor") return Math.floor(value);
  if (mode === "nearest") return Math.round(value);
  return Math.ceil(value);
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
