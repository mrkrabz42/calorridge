import { supabase } from './supabase';
import { profileManager } from './profileManager';
import { PlateItem } from '../store/plateBuildStore';
import { Meal } from '../types/meal';
import { getTodayDateString } from '../utils/macroUtils';

function genId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export const copyService = {
  /**
   * Fetch a meal's food_log_entries and convert them to PlateItems.
   * Falls back to the meal's food_items JSONB if no entries exist.
   */
  async copyMealToPlate(mealId: string): Promise<PlateItem[]> {
    // Try food_log_entries first
    const { data: entries, error: entriesErr } = await supabase
      .from('food_log_entries')
      .select('*')
      .eq('meal_id', mealId);

    if (!entriesErr && entries && entries.length > 0) {
      return entries.map((e: any) => ({
        id: genId(),
        food_name: e.food_name,
        brand: e.brand ?? undefined,
        servings: e.servings ?? 1,
        serving_size: e.serving_size ?? '1 serving',
        calories_per_serving: e.calories ?? 0,
        protein_per_serving: e.protein_g ?? 0,
        carbs_per_serving: e.carbs_g ?? 0,
        fat_per_serving: e.fat_g ?? 0,
        fiber_per_serving: e.fiber_g ?? undefined,
        source: (e.source as PlateItem['source']) ?? 'manual',
        source_id: e.source_id ?? undefined,
      }));
    }

    // Fallback: use meal's food_items JSONB
    const { data: meal, error: mealErr } = await supabase
      .from('meals')
      .select('food_items, food_name, calories, protein_g, carbs_g, fat_g, fiber_g')
      .eq('id', mealId)
      .single();

    if (mealErr || !meal) {
      throw new Error('Could not find meal to copy');
    }

    const mealRow = meal as any;
    const foodItems = mealRow.food_items as any[] | null;

    if (foodItems && foodItems.length > 0) {
      return foodItems.map((item: any) => ({
        id: genId(),
        food_name: item.name ?? 'Unknown',
        servings: 1,
        serving_size: item.estimated_quantity ?? '1 serving',
        calories_per_serving: item.calories ?? 0,
        protein_per_serving: item.protein_g ?? 0,
        carbs_per_serving: item.carbs_g ?? 0,
        fat_per_serving: item.fat_g ?? 0,
        fiber_per_serving: item.fiber_g ?? undefined,
        source: 'manual' as const,
      }));
    }

    // Last resort: create a single PlateItem from the meal totals
    return [{
      id: genId(),
      food_name: mealRow.food_name ?? 'Copied Meal',
      servings: 1,
      serving_size: '1 serving',
      calories_per_serving: mealRow.calories ?? 0,
      protein_per_serving: mealRow.protein_g ?? 0,
      carbs_per_serving: mealRow.carbs_g ?? 0,
      fat_per_serving: mealRow.fat_g ?? 0,
      fiber_per_serving: mealRow.fiber_g ?? undefined,
      source: 'manual' as const,
    }];
  },

  /**
   * Copy a meal (and its food_log_entries) to a target date.
   * Creates a new meal row and new food_log_entries with fresh IDs.
   */
  async copyMealToDate(mealId: string, targetDate: string): Promise<Meal> {
    const profileId = profileManager.getActiveProfileIdSync();
    if (!profileId) throw new Error('No active profile');

    // Fetch the source meal
    const { data: sourceMeal, error: mealErr } = await supabase
      .from('meals')
      .select('*')
      .eq('id', mealId)
      .single();

    if (mealErr || !sourceMeal) {
      throw new Error('Could not find meal to copy');
    }

    const src = sourceMeal as any;

    // Create new meal row
    const { data: newMeal, error: createErr } = await supabase
      .from('meals')
      .insert({
        profile_id: profileId,
        meal_type: src.meal_type,
        meal_date: targetDate,
        notes: src.notes ?? null,
        photo_url: src.photo_url ?? null,
        food_name: src.food_name,
        food_items: src.food_items ?? null,
        confidence: src.confidence ?? null,
        calories: src.calories,
        protein_g: src.protein_g,
        carbs_g: src.carbs_g,
        fat_g: src.fat_g,
        fiber_g: src.fiber_g ?? null,
        sugar_g: src.sugar_g ?? null,
        sodium_mg: src.sodium_mg ?? null,
      })
      .select()
      .single();

    if (createErr || !newMeal) {
      throw new Error(`Failed to copy meal: ${createErr?.message ?? 'unknown error'}`);
    }

    const newMealRow = newMeal as any;

    // Copy food_log_entries
    const { data: entries } = await supabase
      .from('food_log_entries')
      .select('*')
      .eq('meal_id', mealId);

    if (entries && entries.length > 0) {
      const newEntries = entries.map((e: any) => ({
        meal_id: newMealRow.id,
        profile_id: profileId,
        food_name: e.food_name,
        brand: e.brand ?? null,
        servings: e.servings,
        serving_size: e.serving_size,
        calories: e.calories,
        protein_g: e.protein_g,
        carbs_g: e.carbs_g,
        fat_g: e.fat_g,
        fiber_g: e.fiber_g ?? null,
        source: e.source,
        source_id: e.source_id ?? null,
      }));

      const { error: entryErr } = await supabase
        .from('food_log_entries')
        .insert(newEntries);

      if (entryErr) {
        console.warn('Failed to copy food_log_entries:', entryErr.message);
      }
    }

    return newMealRow as Meal;
  },

  /**
   * Copy all meals from one date to another.
   */
  async copyDayToDate(sourceDate: string, targetDate: string): Promise<Meal[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    if (!profileId) throw new Error('No active profile');

    const { data: meals, error } = await supabase
      .from('meals')
      .select('*')
      .eq('profile_id', profileId)
      .eq('meal_date', sourceDate)
      .order('logged_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch meals for ${sourceDate}: ${error.message}`);
    if (!meals || meals.length === 0) return [];

    const copiedMeals: Meal[] = [];
    for (const meal of meals) {
      const copied = await this.copyMealToDate((meal as any).id, targetDate);
      copiedMeals.push(copied);
    }

    return copiedMeals;
  },
};
