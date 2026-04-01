import { supabase } from './supabase';
import { profileManager } from './profileManager';
import { gamificationService } from './gamificationService';
import { DiaryCompletion } from '../types/meal';

type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

function computeGrade(
  nutrition: { total_calories: number; total_protein_g: number },
  goals: { calories: number; protein_g: number }
): Grade {
  const calDev =
    goals.calories > 0
      ? Math.abs(nutrition.total_calories - goals.calories) / goals.calories
      : 0;
  const protDev =
    goals.protein_g > 0
      ? Math.abs(nutrition.total_protein_g - goals.protein_g) / goals.protein_g
      : 0;

  const avgDev = (calDev + protDev) / 2;

  if (avgDev <= 0.05) return 'A';
  if (avgDev <= 0.1) return 'B';
  if (avgDev <= 0.2) return 'C';
  if (avgDev <= 0.3) return 'D';
  return 'F';
}

export const diaryService = {
  async completeDiary(
    date: string,
    nutrition: {
      total_calories: number;
      total_protein_g: number;
      total_carbs_g: number;
      total_fat_g: number;
      total_fiber_g?: number;
    },
    goals: {
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    }
  ): Promise<DiaryCompletion> {
    const profileId = profileManager.getActiveProfileIdSync();
    if (!profileId) throw new Error('No active profile');

    const grade = computeGrade(nutrition, goals);

    const row = {
      profile_id: profileId,
      completion_date: date,
      total_calories: Math.round(nutrition.total_calories),
      total_protein_g: Math.round(nutrition.total_protein_g * 10) / 10,
      total_carbs_g: Math.round(nutrition.total_carbs_g * 10) / 10,
      total_fat_g: Math.round(nutrition.total_fat_g * 10) / 10,
      total_fiber_g: nutrition.total_fiber_g
        ? Math.round(nutrition.total_fiber_g * 10) / 10
        : null,
      goal_calories: goals.calories,
      goal_protein_g: goals.protein_g,
      goal_carbs_g: goals.carbs_g,
      goal_fat_g: goals.fat_g,
      grade,
    };

    const { data, error } = await supabase
      .from('diary_completions')
      .upsert(row, { onConflict: 'profile_id,completion_date' })
      .select()
      .single();

    if (error) throw new Error(`Failed to complete diary: ${error.message}`);

    // Update meals streak
    await gamificationService.updateStreak('meals', date);

    return data as DiaryCompletion;
  },

  async getCompletion(date: string): Promise<DiaryCompletion | null> {
    const profileId = profileManager.getActiveProfileIdSync();
    if (!profileId) return null;

    const { data, error } = await supabase
      .from('diary_completions')
      .select('*')
      .eq('profile_id', profileId)
      .eq('completion_date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch completion: ${error.message}`);
    }

    return (data as DiaryCompletion) ?? null;
  },

  async isCompleted(date: string): Promise<boolean> {
    const completion = await diaryService.getCompletion(date);
    return completion !== null;
  },

  async getStreak(): Promise<{ current_count: number; longest_count: number }> {
    const profileId = profileManager.getActiveProfileIdSync();
    if (!profileId) return { current_count: 0, longest_count: 0 };

    const { data, error } = await supabase
      .from('streaks')
      .select('current_count, longest_count')
      .eq('profile_id', profileId)
      .eq('streak_type', 'meals')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch streak: ${error.message}`);
    }

    if (!data) return { current_count: 0, longest_count: 0 };
    return {
      current_count: data.current_count as number,
      longest_count: data.longest_count as number,
    };
  },
};
