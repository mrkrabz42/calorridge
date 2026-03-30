import { supabase } from './supabase';
import { MealSuggestion, SuggestMealsResponse } from '../types/chat';
import { MealType } from '../types/meal';

export const suggestionsService = {
  async getSuggestions(params: {
    todayMeals: { food_name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[];
    goals: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number };
    remaining: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
    pantryItems?: string[];
    mealType: MealType;
    preferences?: string;
  }): Promise<SuggestMealsResponse> {
    const { data, error } = await supabase.functions.invoke('suggest-meals', {
      body: params,
    });

    if (error) throw new Error(`Suggestions failed: ${error.message}`);

    return data as SuggestMealsResponse;
  },
};
