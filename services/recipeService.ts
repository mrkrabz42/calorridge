import { supabase } from './supabase';
import { profileManager } from './profileManager';
import { Recipe, CreateRecipeInput, MealType, Meal } from '../types';
import { getTodayDateString } from '../utils/macroUtils';

export const recipeService = {
  async getRecipes(): Promise<Recipe[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('profile_id', profileId)
      .order('use_count', { ascending: false });

    if (error) throw new Error(`Failed to fetch recipes: ${error.message}`);

    const recipes = (data ?? []) as Recipe[];

    // Fetch ingredients for all recipes
    if (recipes.length > 0) {
      const ids = recipes.map((r) => r.id);
      const { data: ingredients } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .in('recipe_id', ids);

      if (ingredients) {
        const byRecipe = new Map<string, any[]>();
        for (const ing of ingredients) {
          const list = byRecipe.get(ing.recipe_id) ?? [];
          list.push(ing);
          byRecipe.set(ing.recipe_id, list);
        }
        for (const recipe of recipes) {
          recipe.ingredients = byRecipe.get(recipe.id) ?? [];
        }
      }
    }

    return recipes;
  },

  async getRecipeById(id: string): Promise<Recipe | null> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .eq('profile_id', profileId)
      .single();

    if (error) return null;

    const recipe = data as Recipe;

    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', id);

    recipe.ingredients = (ingredients ?? []) as Recipe['ingredients'];

    return recipe;
  },

  async createRecipe(input: CreateRecipeInput): Promise<Recipe> {
    const profileId = profileManager.getActiveProfileIdSync();

    // Sum all ingredient nutrition
    const totalCal = input.ingredients.reduce((s, i) => s + i.calories, 0);
    const totalProtein = input.ingredients.reduce((s, i) => s + i.protein_g, 0);
    const totalCarbs = input.ingredients.reduce((s, i) => s + i.carbs_g, 0);
    const totalFat = input.ingredients.reduce((s, i) => s + i.fat_g, 0);
    const totalFiber = input.ingredients.reduce((s, i) => s + (i.fiber_g ?? 0), 0);

    // Per-serving values
    const servings = input.servings_count;
    const perServingCal = Math.round(totalCal / servings);
    const perServingProtein = Math.round((totalProtein / servings) * 100) / 100;
    const perServingCarbs = Math.round((totalCarbs / servings) * 100) / 100;
    const perServingFat = Math.round((totalFat / servings) * 100) / 100;
    const perServingFiber = Math.round((totalFiber / servings) * 100) / 100;

    const { data, error } = await supabase
      .from('recipes')
      .insert({
        profile_id: profileId,
        name: input.name,
        servings_count: servings,
        total_weight_cooked_g: input.total_weight_cooked_g ?? null,
        calories: perServingCal,
        protein_g: perServingProtein,
        carbs_g: perServingCarbs,
        fat_g: perServingFat,
        fiber_g: perServingFiber || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create recipe: ${error.message}`);

    const recipe = data as Recipe;

    // Insert ingredients
    const ingredientRows = input.ingredients.map((ing) => ({
      recipe_id: recipe.id,
      food_name: ing.food_name,
      brand: ing.brand ?? null,
      amount_g: ing.amount_g,
      calories: ing.calories,
      protein_g: ing.protein_g,
      carbs_g: ing.carbs_g,
      fat_g: ing.fat_g,
      fiber_g: ing.fiber_g ?? null,
    }));

    const { data: insertedIngredients } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientRows)
      .select();

    recipe.ingredients = (insertedIngredients ?? []) as Recipe['ingredients'];

    return recipe;
  },

  async updateRecipe(id: string, input: CreateRecipeInput): Promise<Recipe> {
    const profileId = profileManager.getActiveProfileIdSync();

    // Delete old ingredients (cascade doesn't apply on update)
    await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', id);

    // Recompute per-serving
    const totalCal = input.ingredients.reduce((s, i) => s + i.calories, 0);
    const totalProtein = input.ingredients.reduce((s, i) => s + i.protein_g, 0);
    const totalCarbs = input.ingredients.reduce((s, i) => s + i.carbs_g, 0);
    const totalFat = input.ingredients.reduce((s, i) => s + i.fat_g, 0);
    const totalFiber = input.ingredients.reduce((s, i) => s + (i.fiber_g ?? 0), 0);

    const servings = input.servings_count;
    const perServingCal = Math.round(totalCal / servings);
    const perServingProtein = Math.round((totalProtein / servings) * 100) / 100;
    const perServingCarbs = Math.round((totalCarbs / servings) * 100) / 100;
    const perServingFat = Math.round((totalFat / servings) * 100) / 100;
    const perServingFiber = Math.round((totalFiber / servings) * 100) / 100;

    const { data, error } = await supabase
      .from('recipes')
      .update({
        name: input.name,
        servings_count: servings,
        total_weight_cooked_g: input.total_weight_cooked_g ?? null,
        calories: perServingCal,
        protein_g: perServingProtein,
        carbs_g: perServingCarbs,
        fat_g: perServingFat,
        fiber_g: perServingFiber || null,
      })
      .eq('id', id)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update recipe: ${error.message}`);

    const recipe = data as Recipe;

    // Re-insert ingredients
    const ingredientRows = input.ingredients.map((ing) => ({
      recipe_id: recipe.id,
      food_name: ing.food_name,
      brand: ing.brand ?? null,
      amount_g: ing.amount_g,
      calories: ing.calories,
      protein_g: ing.protein_g,
      carbs_g: ing.carbs_g,
      fat_g: ing.fat_g,
      fiber_g: ing.fiber_g ?? null,
    }));

    const { data: insertedIngredients } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientRows)
      .select();

    recipe.ingredients = (insertedIngredients ?? []) as Recipe['ingredients'];

    return recipe;
  },

  async deleteRecipe(id: string): Promise<void> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('profile_id', profileId)
      .eq('id', id);

    if (error) throw new Error(`Failed to delete recipe: ${error.message}`);
  },

  async incrementUseCount(id: string): Promise<void> {
    const { data } = await supabase
      .from('recipes')
      .select('use_count')
      .eq('id', id)
      .single();

    if (data) {
      await supabase
        .from('recipes')
        .update({ use_count: (data.use_count ?? 0) + 1 })
        .eq('id', id);
    }
  },

  async logRecipe(
    recipeId: string,
    mealType: MealType,
    servings: number,
    loggedGrams?: number
  ): Promise<Meal> {
    const profileId = profileManager.getActiveProfileIdSync();

    // Fetch the recipe with ingredients
    const recipe = await this.getRecipeById(recipeId);
    if (!recipe) throw new Error('Recipe not found.');

    let calories: number;
    let protein_g: number;
    let carbs_g: number;
    let fat_g: number;
    let fiber_g: number | undefined;

    if (loggedGrams != null && recipe.total_weight_cooked_g) {
      // Weight-based logging: compute total recipe nutrition then scale by grams
      const totalCal = recipe.calories * recipe.servings_count;
      const totalP = recipe.protein_g * recipe.servings_count;
      const totalC = recipe.carbs_g * recipe.servings_count;
      const totalF = recipe.fat_g * recipe.servings_count;
      const totalFib = (recipe.fiber_g ?? 0) * recipe.servings_count;

      const ratio = loggedGrams / recipe.total_weight_cooked_g;
      calories = Math.round(totalCal * ratio);
      protein_g = Math.round(totalP * ratio * 10) / 10;
      carbs_g = Math.round(totalC * ratio * 10) / 10;
      fat_g = Math.round(totalF * ratio * 10) / 10;
      fiber_g = Math.round(totalFib * ratio * 10) / 10 || undefined;
    } else {
      // Serving-based logging
      calories = Math.round(recipe.calories * servings);
      protein_g = Math.round(recipe.protein_g * servings * 10) / 10;
      carbs_g = Math.round(recipe.carbs_g * servings * 10) / 10;
      fat_g = Math.round(recipe.fat_g * servings * 10) / 10;
      fiber_g = recipe.fiber_g
        ? Math.round(recipe.fiber_g * servings * 10) / 10
        : undefined;
    }

    // Create meal entry
    const { data: meal, error: insertError } = await supabase
      .from('meals')
      .insert({
        profile_id: profileId,
        meal_type: mealType,
        meal_date: getTodayDateString(),
        food_name: recipe.name,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g: fiber_g ?? null,
      })
      .select()
      .single();

    if (insertError) throw new Error(`Failed to log recipe: ${insertError.message}`);
    const createdMeal = meal as Meal;

    // Create single food_log_entry with source='recipe'
    await supabase.from('food_log_entries').insert({
      meal_id: createdMeal.id,
      profile_id: profileId,
      food_name: recipe.name,
      servings,
      serving_size: loggedGrams != null ? `${loggedGrams}g` : `${servings} serving(s)`,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g: fiber_g ?? null,
      source: 'recipe',
      source_id: recipeId,
    });

    // Increment use count
    await this.incrementUseCount(recipeId);

    return createdMeal;
  },
};
