import { create } from 'zustand';
import { Workout, CreateWorkoutInput, Exercise } from '../types/workout';
import { workoutsService } from '../services/workoutsService';
import { getTodayDateString } from '../utils/macroUtils';

interface WorkoutsState {
  todayWorkouts: Workout[];
  exercises: Exercise[];
  isLoadingToday: boolean;
  isLoadingExercises: boolean;
  errorToday: string | null;

  fetchTodayWorkouts: () => Promise<void>;
  fetchExercises: () => Promise<void>;
  addWorkout: (input: CreateWorkoutInput) => Promise<Workout>;
  deleteWorkout: (id: string) => Promise<void>;
  getTodayBurned: () => number;
  clearError: () => void;
}

export const useWorkoutsStore = create<WorkoutsState>()((set, get) => ({
  todayWorkouts: [],
  exercises: [],
  isLoadingToday: false,
  isLoadingExercises: false,
  errorToday: null,

  fetchTodayWorkouts: async () => {
    set({ isLoadingToday: true, errorToday: null });
    try {
      const today = getTodayDateString();
      const workouts = await workoutsService.getWorkoutsByDate(today);
      set({ todayWorkouts: workouts, isLoadingToday: false });
    } catch (err) {
      set({ errorToday: (err as Error).message, isLoadingToday: false });
    }
  },

  fetchExercises: async () => {
    set({ isLoadingExercises: true });
    try {
      const exercises = await workoutsService.getExercises();
      set({ exercises, isLoadingExercises: false });
    } catch (err) {
      set({ errorToday: (err as Error).message, isLoadingExercises: false });
    }
  },

  addWorkout: async (input: CreateWorkoutInput) => {
    try {
      const workout = await workoutsService.createWorkout(input);
      set((state) => ({
        todayWorkouts: [...state.todayWorkouts, workout],
      }));
      return workout;
    } catch (err) {
      set({ errorToday: (err as Error).message });
      throw err;
    }
  },

  deleteWorkout: async (id: string) => {
    const prev = get().todayWorkouts;
    set((state) => ({
      todayWorkouts: state.todayWorkouts.filter((w) => w.id !== id),
    }));
    try {
      await workoutsService.deleteWorkout(id);
    } catch (err) {
      set({ todayWorkouts: prev, errorToday: (err as Error).message });
    }
  },

  getTodayBurned: () => {
    return get().todayWorkouts.reduce((sum, w) => sum + w.calories_burned, 0);
  },

  clearError: () => set({ errorToday: null }),
}));
