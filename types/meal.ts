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
  items?: SavedMealItem[];
}

export interface SavedMealItem {
  id: string;
  saved_meal_id: string;
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
  source_id: string | null;
  created_at: string;
}

export interface ServingUnit {
  label: string;
  grams: number;
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
  serving_units: ServingUnit[];
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  fiber_per_100g: number | null;
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
  source_id: string | null;
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

// --- Recipe types ---

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  food_name: string;
  brand: string | null;
  amount_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  created_at: string;
}

export interface Recipe {
  id: string;
  profile_id: string;
  name: string;
  servings_count: number;
  total_weight_cooked_g: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  use_count: number;
  created_at: string;
  updated_at: string;
  ingredients?: RecipeIngredient[];
}

export interface CreateRecipeInput {
  name: string;
  servings_count: number;
  total_weight_cooked_g?: number;
  ingredients: Array<{
    food_name: string;
    brand?: string;
    amount_g: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
  }>;
}

// --- Diary completion ---

export interface DiaryCompletion {
  id: string;
  profile_id: string;
  completion_date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number | null;
  goal_calories: number | null;
  goal_protein_g: number | null;
  goal_carbs_g: number | null;
  goal_fat_g: number | null;
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | null;
  created_at: string;
}
