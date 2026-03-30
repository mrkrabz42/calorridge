import { useMemo } from 'react';
import { useMealsStore } from '../store/mealsStore';
import { useGoalsStore } from '../store/goalsStore';
import { sumMealsToday, computeProgress } from '../utils/macroUtils';

export function useDailyStats() {
  const { todayMeals } = useMealsStore();
  const { goals } = useGoalsStore();

  const nutrition = useMemo(() => sumMealsToday(todayMeals), [todayMeals]);

  const progress = useMemo(
    () => ({
      calories: computeProgress(nutrition.total_calories, goals.calories),
      protein: computeProgress(nutrition.total_protein_g, goals.protein_g),
      carbs: computeProgress(nutrition.total_carbs_g, goals.carbs_g),
      fat: computeProgress(nutrition.total_fat_g, goals.fat_g),
      fiber: computeProgress(nutrition.total_fiber_g, goals.fiber_g),
    }),
    [nutrition, goals]
  );

  return { nutrition, progress, goals, meals: todayMeals };
}
