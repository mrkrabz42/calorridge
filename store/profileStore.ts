import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, UpdateProfileInput } from '../types/profile';
import { profileService } from '../services/profileService';

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      isLoading: false,
      error: null,

      fetchProfile: async () => {
        set({ isLoading: true, error: null });
        try {
          const profile = await profileService.getProfile();
          set({ profile, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      updateProfile: async (input: UpdateProfileInput) => {
        const current = get().profile;
        if (current) {
          set({ profile: { ...current, ...input } as UserProfile });
        }

        try {
          const updated = await profileService.updateProfile(input);
          set({ profile: updated });
        } catch (err) {
          set({ profile: current, error: (err as Error).message });
        }
      },
    }),
    {
      name: 'calorridge-profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
