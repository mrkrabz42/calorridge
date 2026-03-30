import { supabase } from './supabase';
import { profileManager } from './profileManager';
import {
  Challenge,
  CreateChallengeInput,
  ChallengeDay,
  UpdateChallengeDayInput,
} from '../types/challenge';

export const challengeService = {
  async createChallenge(input: CreateChallengeInput): Promise<Challenge> {
    const profileId = profileManager.getActiveProfileIdSync();
    // Deactivate any existing active challenges
    await supabase
      .from('challenges')
      .update({ is_active: false })
      .eq('profile_id', profileId)
      .eq('is_active', true);

    const { data, error } = await supabase
      .from('challenges')
      .insert({ ...input, profile_id: profileId })
      .select()
      .single();

    if (error) throw new Error(`Failed to create challenge: ${error.message}`);

    const challenge = data as Challenge;

    // Pre-generate challenge days
    const days = [];
    const start = new Date(input.start_date + 'T00:00:00');
    for (let i = 0; i < input.duration_days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push({
        challenge_id: challenge.id,
        day_number: i + 1,
        day_date: date.toISOString().split('T')[0],
        profile_id: profileId,
      });
    }

    const { error: daysError } = await supabase
      .from('challenge_days')
      .insert(days);

    if (daysError) throw new Error(`Failed to create challenge days: ${daysError.message}`);

    return challenge;
  },

  async getActiveChallenge(): Promise<Challenge | null> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch active challenge: ${error.message}`);
    }
    return data as Challenge;
  },

  async getChallengeById(id: string): Promise<Challenge | null> {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch challenge: ${error.message}`);
    }
    return data as Challenge;
  },

  async getChallengeDays(challengeId: string): Promise<ChallengeDay[]> {
    const { data, error } = await supabase
      .from('challenge_days')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('day_number', { ascending: true });

    if (error) throw new Error(`Failed to fetch challenge days: ${error.message}`);
    return (data ?? []) as ChallengeDay[];
  },

  async getChallengeDayByDate(challengeId: string, date: string): Promise<ChallengeDay | null> {
    const { data, error } = await supabase
      .from('challenge_days')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('day_date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch challenge day: ${error.message}`);
    }
    return data as ChallengeDay;
  },

  async updateChallengeDay(dayId: string, input: UpdateChallengeDayInput): Promise<ChallengeDay> {
    const { data, error } = await supabase
      .from('challenge_days')
      .update(input)
      .eq('id', dayId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update challenge day: ${error.message}`);
    return data as ChallengeDay;
  },

  async syncChallengeDay(
    challengeId: string,
    date: string,
    nutrition: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
    caloriesBurned: number
  ): Promise<void> {
    const day = await challengeService.getChallengeDayByDate(challengeId, date);
    if (!day) return;

    await supabase
      .from('challenge_days')
      .update({
        actual_calories: nutrition.calories,
        actual_protein_g: nutrition.protein_g,
        actual_carbs_g: nutrition.carbs_g,
        actual_fat_g: nutrition.fat_g,
        calories_burned: caloriesBurned,
      })
      .eq('id', day.id);
  },

  async updateChallenge(id: string, input: Partial<CreateChallengeInput>): Promise<Challenge> {
    const { data, error } = await supabase
      .from('challenges')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update challenge: ${error.message}`);
    return data as Challenge;
  },

  async endChallenge(id: string): Promise<void> {
    const { error } = await supabase
      .from('challenges')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new Error(`Failed to end challenge: ${error.message}`);
  },

  async getAllChallenges(): Promise<Challenge[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch challenges: ${error.message}`);
    return (data ?? []) as Challenge[];
  },
};
