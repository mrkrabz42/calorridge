import { create } from 'zustand';
import {
  Challenge,
  CreateChallengeInput,
  ChallengeDay,
  UpdateChallengeDayInput,
} from '../types/challenge';
import { challengeService } from '../services/challengeService';

interface ChallengeState {
  activeChallenge: Challenge | null;
  challengeDays: ChallengeDay[];
  isLoading: boolean;
  error: string | null;

  fetchActiveChallenge: () => Promise<void>;
  fetchChallengeDays: (challengeId: string) => Promise<void>;
  createChallenge: (input: CreateChallengeInput) => Promise<Challenge>;
  updateChallenge: (id: string, input: Partial<CreateChallengeInput>) => Promise<Challenge>;
  updateDay: (dayId: string, input: UpdateChallengeDayInput) => Promise<void>;
  syncDay: (
    date: string,
    nutrition: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
    caloriesBurned: number
  ) => Promise<void>;
  endChallenge: () => Promise<void>;
  clearError: () => void;
}

export const useChallengeStore = create<ChallengeState>()((set, get) => ({
  activeChallenge: null,
  challengeDays: [],
  isLoading: false,
  error: null,

  fetchActiveChallenge: async () => {
    set({ isLoading: true, error: null });
    try {
      const challenge = await challengeService.getActiveChallenge();
      set({ activeChallenge: challenge, isLoading: false });
      if (challenge) {
        const days = await challengeService.getChallengeDays(challenge.id);
        set({ challengeDays: days });
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchChallengeDays: async (challengeId: string) => {
    try {
      const days = await challengeService.getChallengeDays(challengeId);
      set({ challengeDays: days });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  createChallenge: async (input: CreateChallengeInput) => {
    set({ isLoading: true, error: null });
    try {
      const challenge = await challengeService.createChallenge(input);
      const days = await challengeService.getChallengeDays(challenge.id);
      set({
        activeChallenge: challenge,
        challengeDays: days,
        isLoading: false,
      });
      return challenge;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  updateChallenge: async (id: string, input: Partial<CreateChallengeInput>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await challengeService.updateChallenge(id, input);
      const { activeChallenge } = get();
      if (activeChallenge && activeChallenge.id === id) {
        set({ activeChallenge: updated, isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return updated;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  updateDay: async (dayId: string, input: UpdateChallengeDayInput) => {
    try {
      const updated = await challengeService.updateChallengeDay(dayId, input);
      set((state) => ({
        challengeDays: state.challengeDays.map((d) =>
          d.id === dayId ? updated : d
        ),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  syncDay: async (date, nutrition, caloriesBurned) => {
    const { activeChallenge } = get();
    if (!activeChallenge) return;

    try {
      await challengeService.syncChallengeDay(
        activeChallenge.id,
        date,
        nutrition,
        caloriesBurned
      );
      // Refresh days
      const days = await challengeService.getChallengeDays(activeChallenge.id);
      set({ challengeDays: days });
    } catch {
      // Silent fail for background sync
    }
  },

  endChallenge: async () => {
    const { activeChallenge } = get();
    if (!activeChallenge) return;

    try {
      await challengeService.endChallenge(activeChallenge.id);
      set({ activeChallenge: null, challengeDays: [] });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  clearError: () => set({ error: null }),
}));
