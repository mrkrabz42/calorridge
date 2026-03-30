import { create } from 'zustand';
import { Meal, CreateMealInput } from '../types';
import { mealsService } from '../services/mealsService';
import { getTodayDateString } from '../utils';

interface MealsState {
  todayMeals: Meal[];
  isLoadingToday: boolean;
  errorToday: string | null;

  fetchTodayMeals: () => Promise<void>;
  addMealOptimistic: (meal: Meal) => void;
  removeMealOptimistic: (id: string) => void;
  deleteMeal: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useMealsStore = create<MealsState>()((set, get) => ({
  todayMeals: [],
  isLoadingToday: false,
  errorToday: null,

  fetchTodayMeals: async () => {
    set({ isLoadingToday: true, errorToday: null });
    try {
      const today = getTodayDateString();
      const meals = await mealsService.getMealsByDate(today);
      set({ todayMeals: meals, isLoadingToday: false });
    } catch (err) {
      set({ errorToday: (err as Error).message, isLoadingToday: false });
    }
  },

  addMealOptimistic: (meal: Meal) => {
    set((state) => ({
      todayMeals: [...state.todayMeals, meal],
    }));
  },

  removeMealOptimistic: (id: string) => {
    set((state) => ({
      todayMeals: state.todayMeals.filter((m) => m.id !== id),
    }));
  },

  deleteMeal: async (id: string) => {
    const prev = get().todayMeals;
    set((state) => ({
      todayMeals: state.todayMeals.filter((m) => m.id !== id),
    }));
    try {
      await mealsService.deleteMeal(id);
    } catch (err) {
      set({ todayMeals: prev, errorToday: (err as Error).message });
    }
  },

  clearError: () => set({ errorToday: null }),
}));
