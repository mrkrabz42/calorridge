/**
 * Adaptive calorie utilities -- exponential moving average, TDEE estimation,
 * weekly adjustment logic, and date helpers.
 */

export interface WeightPoint {
  date: string;
  value: number;
}

/**
 * Calculate an exponential moving average over a time-ordered series of weights.
 * Returns an array the same length as the input, where each element is the
 * smoothed value up to that point.
 *
 * @param weights  Chronologically ordered weight entries
 * @param alpha    Smoothing factor (0-1). Lower = smoother. Default 0.1
 */
export function calculateEMA(weights: WeightPoint[], alpha = 0.1): number[] {
  if (weights.length === 0) return [];

  const ema: number[] = [weights[0].value];
  for (let i = 1; i < weights.length; i++) {
    ema.push(alpha * weights[i].value + (1 - alpha) * ema[i - 1]);
  }
  return ema;
}

/**
 * Estimate TDEE from average intake and observed weight change.
 *
 * Formula: avgIntake + (weightChangeKg * 7700 / days)
 *
 * 7700 kcal per kg of body mass is the standard energy-balance constant.
 *
 * @param avgIntake       Average daily calorie intake over the period
 * @param weightChangeKg  Total weight change (positive = gained, negative = lost)
 * @param days            Number of days in the observation window
 */
export function estimateTDEE(
  avgIntake: number,
  weightChangeKg: number,
  days: number
): number {
  if (days <= 0) return avgIntake;
  return Math.round(avgIntake + (weightChangeKg * 7700) / days);
}

/**
 * Calculate a new calorie target based on estimated TDEE and goal type.
 *
 * - cut:      TDEE - 500
 * - bulk:     TDEE + 300
 * - maintain: TDEE
 */
export function calculateWeeklyAdjustment(
  currentTarget: number,
  estimatedTDEE: number,
  goalType: 'cut' | 'bulk' | 'maintain'
): number {
  let raw: number;
  switch (goalType) {
    case 'cut':
      raw = estimatedTDEE - 500;
      break;
    case 'bulk':
      raw = estimatedTDEE + 300;
      break;
    case 'maintain':
    default:
      raw = estimatedTDEE;
      break;
  }
  // Clamp to sensible bounds and round to nearest 25
  const clamped = Math.max(1200, Math.min(raw, 5000));
  return Math.round(clamped / 25) * 25;
}

/**
 * Get the Monday-Sunday bounds of the week containing the given date.
 * Returns YYYY-MM-DD strings.
 */
export function getWeekBounds(date?: Date): { start: string; end: string } {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: toDateString(monday),
    end: toDateString(sunday),
  };
}

/** Format a Date as YYYY-MM-DD */
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
