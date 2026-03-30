import { supabase } from './supabase';
import { profileManager } from './profileManager';
import { DailyGoals, GoalsInput } from '../types';

export const goalsService = {
  async getGoals(): Promise<DailyGoals | null> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('daily_goals')
      .select('*')
      .eq('profile_id', profileId)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }
    return data as DailyGoals;
  },

  async updateGoals(input: GoalsInput): Promise<DailyGoals> {
    const profileId = profileManager.getActiveProfileIdSync();
    // Get existing row to upsert
    const existing = await goalsService.getGoals();

    if (existing) {
      const { data, error } = await supabase
        .from('daily_goals')
        .update(input)
        .eq('profile_id', profileId)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update goals: ${error.message}`);
      return data as DailyGoals;
    } else {
      const { data, error } = await supabase
        .from('daily_goals')
        .insert({ ...input, profile_id: profileId })
        .select()
        .single();

      if (error) throw new Error(`Failed to create goals: ${error.message}`);
      return data as DailyGoals;
    }
  },
};
