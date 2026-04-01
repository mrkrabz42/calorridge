import { supabase } from './supabase';
import { profileManager } from './profileManager';
import { SavedMeal, SavedMealItem, MealType, Meal } from '../types';
import { getTodayDateString } from '../utils/macroUtils';

export const savedMealsService = {
  async getSavedMeals(): Promise<SavedMeal[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('saved_meals')
      .select('*')
      .eq('profile_id', profileId)
      .order('use_count', { ascending: false });

    if (error) throw new Error(`Failed to fetch saved meals: ${error.message}`);

    const meals = (data ?? []) as SavedMeal[];

    // Fetch items for all saved meals
    if (meals.length > 0) {
      const ids = meals.map((m) => m.id);
      const { data: items } = await supabase
        .from('saved_meal_items')
        .select('*')
        .in('saved_meal_id', ids);

      if (items) {
        const itemsByMeal = new Map<string, SavedMealItem[]>();
        for (const item of items as SavedMealItem[]) {
          const list = itemsByMeal.get(item.saved_meal_id) ?? [];
          list.push(item);
          itemsByMeal.set(item.saved_meal_id, list);
        }
        for (const meal of meals) {
          meal.items = itemsByMeal.get(meal.id) ?? [];
        }
      }
    }

    return meals;
  },

  async saveMeal(input: {
    name: string;
    meal_type?: MealType;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    items?: Array<{
      food_name: string;
      brand?: string;
      servings: number;
      serving_size: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      fiber_g?: number;
      source: string;
      source_id?: string;
    }>;
  }): Promise<SavedMeal> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('saved_meals')
      .insert({
        profile_id: profileId,
        name: input.name,
        meal_type: input.meal_type,
        calories: input.calories,
        protein_g: input.protein_g,
        carbs_g: input.carbs_g,
        fat_g: input.fat_g,
        fiber_g: input.fiber_g,
        sugar_g: input.sugar_g,
        sodium_mg: input.sodium_mg,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to save meal: ${error.message}`);

    const savedMeal = data as SavedMeal;

    // Insert component items if provided
    if (input.items && input.items.length > 0) {
      const itemRows = input.items.map((item) => ({
        saved_meal_id: savedMeal.id,
        food_name: item.food_name,
        brand: item.brand ?? null,
        servings: item.servings,
        serving_size: item.serving_size,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g ?? null,
        source: item.source,
        source_id: item.source_id ?? null,
      }));
      const { data: insertedItems } = await supabase
        .from('saved_meal_items')
        .insert(itemRows)
        .select();

      savedMeal.items = (insertedItems ?? []) as SavedMealItem[];
    }

    return savedMeal;
  },

  async logSavedMeal(savedMealId: string, mealType: MealType): Promise<Meal> {
    const profileId = profileManager.getActiveProfileIdSync();

    // Fetch the saved meal
    const { data: saved, error: fetchError } = await supabase
      .from('saved_meals')
      .select('*')
      .eq('id', savedMealId)
      .eq('profile_id', profileId)
      .single();

    if (fetchError || !saved) throw new Error('Saved meal not found.');

    // Fetch saved meal items
    const { data: savedItems } = await supabase
      .from('saved_meal_items')
      .select('*')
      .eq('saved_meal_id', savedMealId);

    const items = (savedItems ?? []) as SavedMealItem[];

    // Create meal entry
    const { data: meal, error: insertError } = await supabase
      .from('meals')
      .insert({
        profile_id: profileId,
        meal_type: mealType,
        meal_date: getTodayDateString(),
        food_name: saved.name,
        calories: saved.calories,
        protein_g: saved.protein_g,
        carbs_g: saved.carbs_g,
        fat_g: saved.fat_g,
        fiber_g: saved.fiber_g,
        sugar_g: saved.sugar_g,
        sodium_mg: saved.sodium_mg,
      })
      .select()
      .single();

    if (insertError) throw new Error(`Failed to log meal: ${insertError.message}`);
    const createdMeal = meal as Meal;

    // Create food_log_entries from saved meal items (or fallback to single entry)
    if (items.length > 0) {
      const entryRows = items.map((item) => ({
        meal_id: createdMeal.id,
        profile_id: profileId,
        food_name: item.food_name,
        brand: item.brand,
        servings: item.servings,
        serving_size: item.serving_size,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g,
        source: item.source || 'saved',
        source_id: item.source_id,
      }));
      await supabase.from('food_log_entries').insert(entryRows);
    } else {
      // Backward compat: no items stored, create single entry from aggregate
      await supabase.from('food_log_entries').insert({
        meal_id: createdMeal.id,
        profile_id: profileId,
        food_name: saved.name,
        servings: 1,
        serving_size: '1 meal',
        calories: saved.calories,
        protein_g: saved.protein_g,
        carbs_g: saved.carbs_g,
        fat_g: saved.fat_g,
        fiber_g: saved.fiber_g,
        source: 'saved',
      });
    }

    // Increment use_count
    await supabase
      .from('saved_meals')
      .update({ use_count: (saved.use_count ?? 0) + 1 })
      .eq('id', savedMealId);

    return createdMeal;
  },

  async deleteSavedMeal(id: string): Promise<void> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { error } = await supabase
      .from('saved_meals')
      .delete()
      .eq('profile_id', profileId)
      .eq('id', id);

    if (error) throw new Error(`Failed to delete saved meal: ${error.message}`);
  },

  async searchSavedMeals(query: string): Promise<SavedMeal[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('saved_meals')
      .select('*')
      .eq('profile_id', profileId)
      .ilike('name', `%${query}%`)
      .order('use_count', { ascending: false });

    if (error) throw new Error(`Failed to search saved meals: ${error.message}`);
    return (data ?? []) as SavedMeal[];
  },
};
