import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const ACTIVE_PROFILE_KEY = 'calorridge-active-profile';

export interface Profile {
  id: string;
  name: string;
  colour: string;
  created_at: string;
}

let _activeProfileId: string | null = null;

export const profileManager = {
  /**
   * Get the currently active profile ID. Cached in memory after first load.
   */
  async getActiveProfileId(): Promise<string | null> {
    if (_activeProfileId) return _activeProfileId;
    const stored = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
    _activeProfileId = stored;
    return stored;
  },

  /**
   * Set the active profile. Persists to AsyncStorage.
   */
  async setActiveProfile(profileId: string): Promise<void> {
    _activeProfileId = profileId;
    await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  },

  /**
   * Clear active profile (for switching/logout).
   */
  async clearActiveProfile(): Promise<void> {
    _activeProfileId = null;
    await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
  },

  /**
   * Get all profiles.
   */
  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at');

    if (error) throw new Error(`Failed to fetch profiles: ${error.message}`);
    return (data ?? []) as Profile[];
  },

  /**
   * Create a new profile and set it as active.
   */
  async createProfile(name: string, colour: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ name, colour })
      .select()
      .single();

    if (error) throw new Error(`Failed to create profile: ${error.message}`);

    const profile = data as Profile;
    await profileManager.setActiveProfile(profile.id);

    // Create default goals for this profile
    await supabase.from('daily_goals').insert({
      profile_id: profile.id,
      calories: 2000,
      protein_g: 150,
      carbs_g: 200,
      fat_g: 65,
      fiber_g: 25,
    });

    // Create empty user_profile for this profile
    await supabase.from('user_profile').insert({
      profile_id: profile.id,
    });

    return profile;
  },

  /**
   * Synchronous getter (returns cached value, may be null if not loaded yet).
   */
  getActiveProfileIdSync(): string | null {
    return _activeProfileId;
  },
};
