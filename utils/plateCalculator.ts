const DEFAULT_BAR_WEIGHT = 20; // kg
const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]; // kg, per side

export interface PlateResult {
  plates: number[];  // plates per side, sorted descending
  barWeight: number;
  totalWeight: number;
  achievable: boolean;
}

/**
 * Calculate plates needed per side for a given target weight.
 */
export function calculatePlates(
  targetWeight: number,
  barWeight: number = DEFAULT_BAR_WEIGHT,
  availablePlates: number[] = DEFAULT_PLATES
): PlateResult {
  const perSide = (targetWeight - barWeight) / 2;

  if (perSide < 0) {
    return { plates: [], barWeight, totalWeight: barWeight, achievable: false };
  }

  if (perSide === 0) {
    return { plates: [], barWeight, totalWeight: barWeight, achievable: true };
  }

  const sorted = [...availablePlates].sort((a, b) => b - a);
  const plates: number[] = [];
  let remaining = perSide;

  for (const plate of sorted) {
    while (remaining >= plate) {
      plates.push(plate);
      remaining -= plate;
      remaining = Math.round(remaining * 100) / 100; // float fix
    }
  }

  const achievable = remaining === 0;
  const actualTotal = barWeight + plates.reduce((s, p) => s + p, 0) * 2;

  return {
    plates,
    barWeight,
    totalWeight: achievable ? targetWeight : actualTotal,
    achievable,
  };
}

/**
 * Format plates for display: "25 + 20 + 5 per side"
 */
export function formatPlates(plates: number[]): string {
  if (plates.length === 0) return 'Bar only';
  return plates.join(' + ') + ' per side';
}
