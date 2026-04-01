import { supabase } from './supabase';
import { profileManager } from './profileManager';
import { CustomFood, FoodLogEntry, ServingUnit } from '../types/meal';

export const foodDiaryService = {
  // Upsert food into library (auto-saves from any logging source)
  async upsertToFoodLibrary(food: {
    name: string; brand?: string | null; serving_size: string; serving_grams?: number | null;
    calories: number; protein_g: number; carbs_g: number; fat_g: number;
    fiber_g?: number | null; serving_units?: ServingUnit[];
    calories_per_100g?: number | null; protein_per_100g?: number | null;
    carbs_per_100g?: number | null; fat_per_100g?: number | null; fiber_per_100g?: number | null;
  }): Promise<void> {
    const profileId = profileManager.getActiveProfileIdSync();
    if (!profileId) return;

    // Compute per_100g if we have serving_grams but no per_100g values
    let cal100 = food.calories_per_100g ?? null;
    let pro100 = food.protein_per_100g ?? null;
    let carb100 = food.carbs_per_100g ?? null;
    let fat100 = food.fat_per_100g ?? null;
    let fib100 = food.fiber_per_100g ?? null;
    if (food.serving_grams && food.serving_grams > 0 && cal100 === null) {
      const factor = 100 / food.serving_grams;
      cal100 = Math.round(food.calories * factor * 100) / 100;
      pro100 = Math.round(food.protein_g * factor * 100) / 100;
      carb100 = Math.round(food.carbs_g * factor * 100) / 100;
      fat100 = Math.round(food.fat_g * factor * 100) / 100;
      fib100 = food.fiber_g ? Math.round(food.fiber_g * factor * 100) / 100 : null;
    }

    const row = {
      profile_id: profileId,
      name: food.name.trim(),
      brand: food.brand?.trim() || null,
      serving_size: food.serving_size,
      serving_grams: food.serving_grams ?? null,
      calories: Math.round(food.calories),
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      fiber_g: food.fiber_g ?? null,
      serving_units: food.serving_units ?? [],
      calories_per_100g: cal100,
      protein_per_100g: pro100,
      carbs_per_100g: carb100,
      fat_per_100g: fat100,
      fiber_per_100g: fib100,
    };

    // Try upsert — on conflict, just increment use_count
    const { error } = await supabase.from('custom_foods').upsert(row, {
      onConflict: 'profile_id,lower_name_brand',
      ignoreDuplicates: false,
    });

    // If upsert fails (e.g. conflict resolution mismatch), try a simpler approach
    if (error) {
      // Check if food exists
      const { data: existing } = await supabase.from('custom_foods').select('id, use_count')
        .eq('profile_id', profileId).ilike('name', food.name.trim()).limit(1).single();
      if (existing) {
        await supabase.from('custom_foods').update({
          use_count: ((existing as any).use_count ?? 0) + 1,
        }).eq('id', (existing as any).id);
      } else {
        await supabase.from('custom_foods').insert({ ...row, use_count: 1 });
      }
    }
  },

  // Custom foods
  async getCustomFoods(): Promise<CustomFood[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('custom_foods').select('*').eq('profile_id', profileId)
      .order('use_count', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as CustomFood[];
  },

  async createCustomFood(input: {
    name: string; brand?: string | null; serving_size: string; serving_grams?: number | null;
    calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g?: number | null;
    serving_units?: any[]; calories_per_100g?: number | null; protein_per_100g?: number | null;
    carbs_per_100g?: number | null; fat_per_100g?: number | null; fiber_per_100g?: number | null;
  }): Promise<CustomFood> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('custom_foods').insert({ ...input, profile_id: profileId }).select().single();
    if (error) throw new Error(error.message);
    return data as CustomFood;
  },

  async searchCustomFoods(query: string): Promise<CustomFood[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('custom_foods').select('*').eq('profile_id', profileId)
      .ilike('name', `%${query}%`).order('use_count', { ascending: false }).limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []) as CustomFood[];
  },

  async incrementUseCount(id: string): Promise<void> {
    const { data: current } = await supabase.from('custom_foods').select('use_count').eq('id', id).single();
    if (current) {
      await supabase.from('custom_foods').update({ use_count: ((current as any).use_count ?? 0) + 1 }).eq('id', id);
    }
  },

  // Food log entries
  async createFoodLogEntries(mealId: string, entries: Array<{
    food_name: string; brand?: string; servings: number; serving_size: string;
    calories: number; protein_g: number; carbs_g: number; fat_g: number;
    fiber_g?: number; source: string; source_id?: string;
  }>): Promise<void> {
    const profileId = profileManager.getActiveProfileIdSync();
    const rows = entries.map(e => ({ ...e, meal_id: mealId, profile_id: profileId }));
    const { error } = await supabase.from('food_log_entries').insert(rows);
    if (error) throw new Error(error.message);
  },

  async getFoodLogEntries(mealId: string): Promise<FoodLogEntry[]> {
    const { data, error } = await supabase
      .from('food_log_entries').select('*').eq('meal_id', mealId);
    if (error) throw new Error(error.message);
    return (data ?? []) as FoodLogEntry[];
  },

  // Recent foods (from food_log_entries, deduplicated)
  async getRecentFoods(limit = 20): Promise<Array<{ food_name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; serving_size: string }>> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('food_log_entries').select('food_name, calories, protein_g, carbs_g, fat_g, serving_size')
      .eq('profile_id', profileId).order('created_at', { ascending: false }).limit(100);
    if (error) return [];
    // Deduplicate by food_name
    const seen = new Set<string>();
    const unique: Array<{ food_name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; serving_size: string }> = [];
    for (const item of (data ?? [])) {
      const row = item as any;
      const name = row.food_name as string;
      if (!seen.has(name)) {
        seen.add(name);
        unique.push({
          food_name: row.food_name,
          calories: row.calories,
          protein_g: row.protein_g,
          carbs_g: row.carbs_g,
          fat_g: row.fat_g,
          serving_size: row.serving_size,
        });
      }
      if (unique.length >= limit) break;
    }
    return unique;
  },
};
