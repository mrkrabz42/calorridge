import { ActivityLevel, GoalType, Sex } from '../types/profile';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Mifflin-St Jeor BMR formula
 */
export function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  sex: Sex
): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function calculateTDEE(
  weight_kg: number,
  height_cm: number,
  age: number,
  sex: Sex,
  activity_level: ActivityLevel
): number {
  const bmr = calculateBMR(weight_kg, height_cm, age, sex);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity_level]);
}

export interface GoalMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

/**
 * Auto-calculate macro targets based on TDEE and goal type.
 * Protein: g/kg bodyweight, fat: g/kg bodyweight, carbs: fill remaining calories.
 */
export function calculateGoalMacros(
  tdee: number,
  weight_kg: number,
  goal_type: GoalType
): GoalMacros {
  let calories: number;
  let proteinPerKg: number;
  let fatPerKg: number;

  switch (goal_type) {
    case 'cut':
      calories = tdee - 500;
      proteinPerKg = 2.0;
      fatPerKg = 0.8;
      break;
    case 'bulk':
      calories = tdee + 300;
      proteinPerKg = 1.8;
      fatPerKg = 1.0;
      break;
    case 'maintain':
    default:
      calories = tdee;
      proteinPerKg = 1.6;
      fatPerKg = 0.9;
      break;
  }

  const protein_g = Math.round(proteinPerKg * weight_kg);
  const fat_g = Math.round(fatPerKg * weight_kg);

  // Fill remaining calories with carbs (protein 4cal/g, fat 9cal/g, carbs 4cal/g)
  const proteinCals = protein_g * 4;
  const fatCals = fat_g * 9;
  const carbCals = Math.max(calories - proteinCals - fatCals, 0);
  const carbs_g = Math.round(carbCals / 4);

  return {
    calories: Math.max(calories, 1200),
    protein_g,
    carbs_g,
    fat_g,
    fiber_g: 25,
  };
}

/**
 * Calculate calories burned from MET value.
 * Formula: MET * weight_kg * (duration_mins / 60) * 1.05
 */
export function calculateCaloriesBurned(
  met_value: number,
  weight_kg: number,
  duration_mins: number
): number {
  return Math.round(met_value * weight_kg * (duration_mins / 60) * 1.05);
}

/**
 * Fallback calorie burn when no user weight is available.
 */
export function calculateCaloriesBurnedDefault(
  cals_per_min: number,
  duration_mins: number
): number {
  return Math.round(cals_per_min * duration_mins);
}

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job)',
  light: 'Light (1-3 days/week)',
  moderate: 'Moderate (3-5 days/week)',
  active: 'Active (6-7 days/week)',
  very_active: 'Very Active (2x/day)',
};

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  cut: 'Cut (lose fat)',
  bulk: 'Bulk (build muscle)',
  maintain: 'Maintain (recomp)',
};
