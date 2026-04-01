import { create } from 'zustand';
import { SavedMeal, MealType, Meal } from '../types';
import { savedMealsService } from '../services/savedMealsService';

interface SavedMealsState {
  savedMeals: SavedMeal[];
  isLoading: boolean;
  error: string | null;

  fetchSavedMeals: () => Promise<void>;
  saveMeal: (data: {
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
  }) => Promise<SavedMeal>;
  logSavedMeal: (savedMealId: string, mealType: MealType) => Promise<Meal>;
  deleteSavedMeal: (id: string) => Promise<void>;
}

export const useSavedMealsStore = create<SavedMealsState>()((set, get) => ({
  savedMeals: [],
  isLoading: false,
  error: null,

  fetchSavedMeals: async () => {
    set({ isLoading: true, error: null });
    try {
      const savedMeals = await savedMealsService.getSavedMeals();
      set({ savedMeals, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  saveMeal: async (data) => {
    const saved = await savedMealsService.saveMeal(data);
    set((state) => ({
      savedMeals: [saved, ...state.savedMeals],
    }));
    return saved;
  },

  logSavedMeal: async (savedMealId, mealType) => {
    const meal = await savedMealsService.logSavedMeal(savedMealId, mealType);
    // Update use_count locally
    set((state) => ({
      savedMeals: state.savedMeals
        .map((sm) =>
          sm.id === savedMealId ? { ...sm, use_count: sm.use_count + 1 } : sm
        )
        .sort((a, b) => b.use_count - a.use_count),
    }));
    return meal;
  },

  deleteSavedMeal: async (id) => {
    const prev = get().savedMeals;
    set((state) => ({
      savedMeals: state.savedMeals.filter((sm) => sm.id !== id),
    }));
    try {
      await savedMealsService.deleteSavedMeal(id);
    } catch (err) {
      set({ savedMeals: prev, error: (err as Error).message });
      throw err;
    }
  },
}));
