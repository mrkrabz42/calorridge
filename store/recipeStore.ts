import { create } from 'zustand';
import { Recipe, CreateRecipeInput, MealType, Meal } from '../types';
import { recipeService } from '../services/recipeService';

interface RecipeState {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;

  fetchRecipes: () => Promise<void>;
  createRecipe: (input: CreateRecipeInput) => Promise<Recipe>;
  updateRecipe: (id: string, input: CreateRecipeInput) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  logRecipe: (recipeId: string, mealType: MealType, servings: number, loggedGrams?: number) => Promise<Meal>;
}

export const useRecipeStore = create<RecipeState>()((set, get) => ({
  recipes: [],
  isLoading: false,
  error: null,

  fetchRecipes: async () => {
    set({ isLoading: true, error: null });
    try {
      const recipes = await recipeService.getRecipes();
      set({ recipes, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createRecipe: async (input) => {
    const recipe = await recipeService.createRecipe(input);
    set((state) => ({
      recipes: [recipe, ...state.recipes],
    }));
    return recipe;
  },

  updateRecipe: async (id, input) => {
    const updated = await recipeService.updateRecipe(id, input);
    set((state) => ({
      recipes: state.recipes.map((r) => (r.id === id ? updated : r)),
    }));
    return updated;
  },

  deleteRecipe: async (id) => {
    const prev = get().recipes;
    set((state) => ({
      recipes: state.recipes.filter((r) => r.id !== id),
    }));
    try {
      await recipeService.deleteRecipe(id);
    } catch (err) {
      set({ recipes: prev, error: (err as Error).message });
      throw err;
    }
  },

  logRecipe: async (recipeId, mealType, servings, loggedGrams) => {
    const meal = await recipeService.logRecipe(recipeId, mealType, servings, loggedGrams);
    // Update use_count locally
    set((state) => ({
      recipes: state.recipes
        .map((r) =>
          r.id === recipeId ? { ...r, use_count: r.use_count + 1 } : r
        )
        .sort((a, b) => b.use_count - a.use_count),
    }));
    return meal;
  },
}));
