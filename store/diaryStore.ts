import { create } from 'zustand';
import { DiaryCompletion } from '../types/meal';
import { diaryService } from '../services/diaryService';
import { getTodayDateString } from '../utils/macroUtils';

interface DiaryState {
  todayCompleted: boolean;
  todayCompletion: DiaryCompletion | null;
  streak: { current_count: number; longest_count: number };
  isLoading: boolean;

  checkTodayCompletion: () => Promise<void>;
  completeDiary: (
    nutrition: {
      total_calories: number;
      total_protein_g: number;
      total_carbs_g: number;
      total_fat_g: number;
      total_fiber_g?: number;
    },
    goals: {
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    }
  ) => Promise<DiaryCompletion>;
  fetchStreak: () => Promise<void>;
}

export const useDiaryStore = create<DiaryState>()((set) => ({
  todayCompleted: false,
  todayCompletion: null,
  streak: { current_count: 0, longest_count: 0 },
  isLoading: false,

  checkTodayCompletion: async () => {
    set({ isLoading: true });
    try {
      const today = getTodayDateString();
      const completion = await diaryService.getCompletion(today);
      set({
        todayCompleted: completion !== null,
        todayCompletion: completion,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  completeDiary: async (nutrition, goals) => {
    set({ isLoading: true });
    try {
      const today = getTodayDateString();
      const completion = await diaryService.completeDiary(today, nutrition, goals);
      // Refresh streak after completing
      const streak = await diaryService.getStreak();
      set({
        todayCompleted: true,
        todayCompletion: completion,
        streak,
        isLoading: false,
      });
      return completion;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  fetchStreak: async () => {
    try {
      const streak = await diaryService.getStreak();
      set({ streak });
    } catch {
      // Silently fail — streak is non-critical
    }
  },
}));
