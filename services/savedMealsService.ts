import { supabase } from './supabase';
import { profileManager } from './profileManager';
import { SavedMeal, MealType, Meal } from '../types';
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
    return (data ?? []) as SavedMeal[];
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
    return data as SavedMeal;
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

    // Increment use_count
    await supabase
      .from('saved_meals')
      .update({ use_count: (saved.use_count ?? 0) + 1 })
      .eq('id', savedMealId);

    return meal as Meal;
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
