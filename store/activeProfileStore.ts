import { create } from 'zustand';
import { Profile, profileManager } from '../services/profileManager';

interface ActiveProfileState {
  activeProfileId: string | null;
  profiles: Profile[];
  isLoaded: boolean;

  loadProfiles: () => Promise<void>;
  selectProfile: (profileId: string) => Promise<void>;
  createProfile: (name: string, colour: string) => Promise<Profile>;
  switchProfile: () => void;
}

export const useActiveProfileStore = create<ActiveProfileState>()((set) => ({
  activeProfileId: null,
  profiles: [],
  isLoaded: false,

  loadProfiles: async () => {
    try {
      const [activeId, profiles] = await Promise.all([
        profileManager.getActiveProfileId(),
        profileManager.getProfiles(),
      ]);
      set({ activeProfileId: activeId, profiles, isLoaded: true });
    } catch (err) {
      console.error('Failed to load profiles:', err);
      set({ isLoaded: true });
    }
  },

  selectProfile: async (profileId: string) => {
    await profileManager.setActiveProfile(profileId);
    set({ activeProfileId: profileId });
  },

  createProfile: async (name: string, colour: string) => {
    const profile = await profileManager.createProfile(name, colour);
    set((state) => ({
      activeProfileId: profile.id,
      profiles: [...state.profiles, profile],
    }));
    return profile;
  },

  switchProfile: () => {
    profileManager.clearActiveProfile();
    set({ activeProfileId: null });
  },
}));
