import { supabase } from './supabase';
import { Meal, CreateMealInput, DailyNutrition } from '../types';

export const mealsService = {
  async createMeal(input: CreateMealInput): Promise<Meal> {
    const { data, error } = await supabase
      .from('meals')
      .insert({
        meal_type: input.meal_type,
        meal_date: input.meal_date,
        notes: input.notes,
        photo_url: input.photo_url,
        food_name: input.food_name,
        food_items: input.food_items as unknown,
        confidence: input.confidence,
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

    if (error) throw new Error(`Failed to create meal: ${error.message}`);
    return data as Meal;
  },

  async getMealsByDate(date: string): Promise<Meal[]> {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('meal_date', date)
      .order('logged_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch meals: ${error.message}`);
    return (data ?? []) as Meal[];
  },

  async getMealById(id: string): Promise<Meal | null> {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch meal: ${error.message}`);
    }
    return data as Meal;
  },

  async getMealsPaginated(page: number, pageSize = 20): Promise<Meal[]> {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .order('logged_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to fetch meals: ${error.message}`);
    return (data ?? []) as Meal[];
  },

  async deleteMeal(id: string): Promise<void> {
    const { error } = await supabase.from('meals').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete meal: ${error.message}`);
  },

  async getDailyNutrition(date: string): Promise<DailyNutrition | null> {
    const { data, error } = await supabase
      .from('daily_nutrition')
      .select('*')
      .eq('meal_date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch daily nutrition: ${error.message}`);
    }
    return data as DailyNutrition;
  },
};
