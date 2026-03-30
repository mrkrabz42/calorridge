import { Meal, DailyNutrition, DailyGoals } from '../types';
import { MACRO_CALORIES_PER_GRAM } from '../constants';

export interface MacroProgress {
  value: number;
  goal: number;
  percentage: number;
  remaining: number;
  isOver: boolean;
}

export function computeProgress(value: number, goal: number): MacroProgress {
  const percentage = goal > 0 ? Math.min((value / goal) * 100, 150) : 0;
  const remaining = Math.max(goal - value, 0);
  return {
    value,
    goal,
    percentage,
    remaining,
    isOver: value > goal,
  };
}

export function sumMealsToday(meals: Meal[]): DailyNutrition {
  const totals = meals.reduce(
    (acc, meal) => ({
      total_calories: acc.total_calories + meal.calories,
      total_protein_g: acc.total_protein_g + meal.protein_g,
      total_carbs_g: acc.total_carbs_g + meal.carbs_g,
      total_fat_g: acc.total_fat_g + meal.fat_g,
      total_fiber_g: acc.total_fiber_g + (meal.fiber_g ?? 0),
    }),
    {
      total_calories: 0,
      total_protein_g: 0,
      total_carbs_g: 0,
      total_fat_g: 0,
      total_fiber_g: 0,
    }
  );

  return {
    meal_date: new Date().toISOString().split('T')[0],
    meal_count: meals.length,
    ...totals,
  };
}

export function formatMacro(value: number, unit = 'g', decimals = 1): string {
  if (unit === 'kcal') return `${Math.round(value)}`;
  return `${value.toFixed(decimals)}${unit}`;
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateString === todayStr) return 'Today';
  if (dateString === yesterdayStr) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getCaloriesFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round(
    protein * MACRO_CALORIES_PER_GRAM.protein +
    carbs * MACRO_CALORIES_PER_GRAM.carbs +
    fat * MACRO_CALORIES_PER_GRAM.fat
  );
}
