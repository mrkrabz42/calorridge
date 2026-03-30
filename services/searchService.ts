import { supabase } from './supabase';

export interface FoodSearchResult {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_size: string;
}

export const searchService = {
  async searchFood(query: string): Promise<FoodSearchResult[]> {
    // Call the search-food edge function
    const { data, error } = await supabase.functions.invoke('search-food', {
      body: { query },
    });

    if (error) throw new Error(`Search failed: ${error.message}`);
    if (!data?.results) return [];

    return data.results as FoodSearchResult[];
  },
};
