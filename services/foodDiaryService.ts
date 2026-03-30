import { supabase } from './supabase';
import { profileManager } from './profileManager';
import { CustomFood, FoodLogEntry } from '../types/meal';

export const foodDiaryService = {
  // Custom foods
  async getCustomFoods(): Promise<CustomFood[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('custom_foods').select('*').eq('profile_id', profileId)
      .order('use_count', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as CustomFood[];
  },

  async createCustomFood(input: Omit<CustomFood, 'id' | 'profile_id' | 'use_count' | 'created_at'>): Promise<CustomFood> {
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
    fiber_g?: number; source: string;
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
