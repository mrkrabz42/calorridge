/**
 * Estimate 1 rep max using Epley formula.
 */
export function estimateE1RM_Epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/**
 * Estimate 1 rep max using Brzycki formula.
 */
export function estimateE1RM_Brzycki(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (reps >= 37) return weight * 2; // cap to avoid division by zero
  return Math.round((weight * 36 / (37 - reps)) * 10) / 10;
}

/**
 * Average of Epley and Brzycki for best estimate.
 */
export function estimateE1RM(weight: number, reps: number): number {
  const epley = estimateE1RM_Epley(weight, reps);
  const brzycki = estimateE1RM_Brzycki(weight, reps);
  return Math.round(((epley + brzycki) / 2) * 10) / 10;
}

/**
 * Estimate how many reps at a given weight based on 1RM.
 */
export function estimateRepsAtWeight(oneRM: number, targetWeight: number): number {
  if (oneRM <= 0 || targetWeight <= 0 || targetWeight >= oneRM) return 1;
  // Rearranged Epley: reps = 30 * (oneRM / weight - 1)
  return Math.max(1, Math.round(30 * (oneRM / targetWeight - 1)));
}

/**
 * Calculate total volume (tonnage) for a set.
 */
export function setVolume(weight: number | null, reps: number | null): number {
  if (!weight || !reps) return 0;
  return weight * reps;
}

/**
 * Calculate total volume for an array of sets.
 */
export function totalVolume(sets: { weight_kg: number | null; reps: number | null; is_completed: boolean }[]): number {
  return sets
    .filter((s) => s.is_completed)
    .reduce((sum, s) => sum + setVolume(s.weight_kg, s.reps), 0);
}

/**
 * Calculate calories burned for a workout session.
 * Uses average MET * weight * duration.
 * Fallback: 5 kcal/min for strength training.
 */
export function estimateSessionCalories(
  durationSecs: number,
  avgMet: number | null,
  userWeightKg: number | null
): number {
  const durationHours = durationSecs / 3600;
  if (avgMet && userWeightKg) {
    return Math.round(avgMet * userWeightKg * durationHours * 1.05);
  }
  // Fallback: ~5 kcal/min for moderate weight training
  return Math.round((durationSecs / 60) * 5);
}
