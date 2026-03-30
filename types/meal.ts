export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  name: string;
  estimated_quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Meal {
  id: string;
  meal_type: MealType;
  logged_at: string;
  meal_date: string;
  notes?: string;
  photo_url?: string;
  food_name: string;
  food_items?: FoodItem[];
  confidence?: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMealInput {
  meal_type: MealType;
  meal_date: string;
  notes?: string;
  photo_url?: string;
  food_name: string;
  food_items?: FoodItem[];
  confidence?: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface SavedMeal {
  id: string;
  profile_id: string;
  name: string;
  meal_type: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustomFood {
  id: string;
  profile_id: string;
  name: string;
  brand: string | null;
  serving_size: string;
  serving_grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  use_count: number;
  created_at: string;
}

export interface FoodLogEntry {
  id: string;
  meal_id: string;
  profile_id: string;
  food_name: string;
  brand: string | null;
  servings: number;
  serving_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  source: string;
  created_at: string;
}

export interface DailyNutrition {
  meal_date: string;
  meal_count: number;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
}
