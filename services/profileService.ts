import { supabase } from './supabase';
import { profileManager } from './profileManager';
import { UserProfile, UpdateProfileInput } from '../types/profile';

export const profileService = {
  async getProfile(): Promise<UserProfile | null> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('user_profile')
      .select('*')
      .eq('profile_id', profileId)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }
    return data as UserProfile;
  },

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    const profileId = profileManager.getActiveProfileIdSync();
    const existing = await profileService.getProfile();

    if (existing) {
      const { data, error } = await supabase
        .from('user_profile')
        .update(input)
        .eq('profile_id', profileId)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update profile: ${error.message}`);
      return data as UserProfile;
    } else {
      const { data, error } = await supabase
        .from('user_profile')
        .insert({ ...input, profile_id: profileId })
        .select()
        .single();

      if (error) throw new Error(`Failed to create profile: ${error.message}`);
      return data as UserProfile;
    }
  },
};
