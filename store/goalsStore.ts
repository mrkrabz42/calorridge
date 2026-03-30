import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyGoals } from '../types';
import { DEFAULT_GOALS } from '../constants';
import { goalsService } from '../services/goalsService';

interface GoalsState {
  goals: DailyGoals;
  isLoading: boolean;
  error: string | null;
  fetchGoals: () => Promise<void>;
  updateGoals: (goals: Partial<Omit<DailyGoals, 'id'>>) => Promise<void>;
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      goals: {
        id: '',
        ...DEFAULT_GOALS,
      },
      isLoading: false,
      error: null,

      fetchGoals: async () => {
        set({ isLoading: true, error: null });
        try {
          const goals = await goalsService.getGoals();
          if (goals) {
            set({ goals, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      updateGoals: async (updates) => {
        const current = get().goals;
        const optimistic = { ...current, ...updates };
        set({ goals: optimistic });

        try {
          const { id, ...input } = optimistic;
          const updated = await goalsService.updateGoals(input);
          set({ goals: updated });
        } catch (err) {
          set({ goals: current, error: (err as Error).message });
        }
      },
    }),
    {
      name: 'calorridge-goals',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
