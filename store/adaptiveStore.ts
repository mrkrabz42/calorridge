import { create } from 'zustand';
import { adaptiveService, WeighIn, WeeklyAdjustment } from '../services/adaptiveService';

interface AdaptiveState {
  weighIns: WeighIn[];
  latestWeight: WeighIn | null;
  estimatedTDEE: number | null;
  lastAdjustment: WeeklyAdjustment | null;
  adjustmentHistory: WeeklyAdjustment[];
  isLoading: boolean;
  error: string | null;

  logWeighIn: (date: string, weightKg: number) => Promise<void>;
  fetchWeighIns: (startDate: string, endDate: string) => Promise<void>;
  fetchLast30Days: () => Promise<void>;
  fetchLatest: () => Promise<void>;
  runAdjustment: () => Promise<void>;
  fetchHistory: () => Promise<void>;
}

export const useAdaptiveStore = create<AdaptiveState>()((set, get) => ({
  weighIns: [],
  latestWeight: null,
  estimatedTDEE: null,
  lastAdjustment: null,
  adjustmentHistory: [],
  isLoading: false,
  error: null,

  logWeighIn: async (date, weightKg) => {
    set({ isLoading: true, error: null });
    try {
      const entry = await adaptiveService.logWeighIn(date, weightKg);
      set({ latestWeight: entry, isLoading: false });
      // Refresh the 30-day list in the background
      get().fetchLast30Days();
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchWeighIns: async (startDate, endDate) => {
    set({ isLoading: true, error: null });
    try {
      const weighIns = await adaptiveService.getWeighIns(startDate, endDate);
      set({ weighIns, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchLast30Days: async () => {
    try {
      const weighIns = await adaptiveService.getWeighInsLast30Days();
      set({ weighIns });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  fetchLatest: async () => {
    try {
      const latestWeight = await adaptiveService.getLatestWeighIn();
      set({ latestWeight });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  runAdjustment: async () => {
    set({ isLoading: true, error: null });
    try {
      const adj = await adaptiveService.runWeeklyAdjustment();
      set({
        lastAdjustment: adj,
        estimatedTDEE: adj.estimated_tdee,
        isLoading: false,
      });
      // Refresh history
      get().fetchHistory();
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchHistory: async () => {
    try {
      const history = await adaptiveService.getAdjustmentHistory();
      const latest = history.length > 0 ? history[0] : null;
      set({
        adjustmentHistory: history,
        lastAdjustment: latest,
        estimatedTDEE: latest?.estimated_tdee ?? null,
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
}));
