import { supabase } from './supabase';
import { profileManager } from './profileManager';

export interface Streak {
  id: string;
  profile_id: string;
  streak_type: 'meals' | 'workouts' | 'combined';
  current_count: number;
  longest_count: number;
  last_active_date: string | null;
  freeze_available: number;
  updated_at: string;
}

export interface Achievement {
  id: string;
  profile_id: string;
  achievement_key: string;
  name: string;
  description: string | null;
  category: 'workout' | 'nutrition' | 'streak' | 'pr' | 'milestone';
  unlocked_at: string | null;
  created_at: string;
}

const ACHIEVEMENT_DEFINITIONS: {
  key: string;
  name: string;
  description: string;
  category: Achievement['category'];
}[] = [
  { key: 'first_workout', name: 'First Workout', description: 'Complete your first gym session', category: 'workout' },
  { key: 'workouts_10', name: '10 Sessions', description: 'Complete 10 gym sessions', category: 'workout' },
  { key: 'workouts_50', name: '50 Sessions', description: 'Complete 50 gym sessions', category: 'workout' },
  { key: 'workouts_100', name: 'Century Club', description: 'Complete 100 gym sessions', category: 'workout' },
  { key: 'first_meal', name: 'First Meal Logged', description: 'Log your first meal', category: 'nutrition' },
  { key: 'meals_50', name: '50 Meals Logged', description: 'Log 50 meals', category: 'nutrition' },
  { key: 'meals_100', name: '100 Meals Logged', description: 'Log 100 meals', category: 'nutrition' },
  { key: 'meals_500', name: '500 Meals Logged', description: 'Log 500 meals', category: 'nutrition' },
  { key: 'streak_3', name: '3-Day Streak', description: 'Maintain a 3-day streak', category: 'streak' },
  { key: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', category: 'streak' },
  { key: 'streak_14', name: 'Fortnight Fighter', description: 'Maintain a 14-day streak', category: 'streak' },
  { key: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', category: 'streak' },
  { key: 'streak_60', name: '60-Day Legend', description: 'Maintain a 60-day streak', category: 'streak' },
  { key: 'first_pr', name: 'First PR', description: 'Set your first personal record', category: 'pr' },
  { key: 'prs_10', name: '10 PRs', description: 'Set 10 personal records', category: 'pr' },
  { key: 'prs_25', name: '25 PRs', description: 'Set 25 personal records', category: 'pr' },
  { key: 'first_challenge', name: 'Challenger', description: 'Start your first challenge', category: 'milestone' },
  { key: 'first_measurement', name: 'Body Check', description: 'Log your first body measurement', category: 'milestone' },
  { key: 'profile_complete', name: 'All Set', description: 'Complete your profile with all fields', category: 'milestone' },
];

export const gamificationService = {
  /**
   * Create the 3 streak rows for a profile if they do not already exist.
   */
  async initStreaks(profileId: string): Promise<void> {
    const types: Streak['streak_type'][] = ['meals', 'workouts', 'combined'];

    for (const t of types) {
      await supabase
        .from('streaks')
        .upsert(
          { profile_id: profileId, streak_type: t, current_count: 0, longest_count: 0 },
          { onConflict: 'profile_id,streak_type' }
        );
    }
  },

  /**
   * Update a streak for the given type and date.
   * If the date is consecutive to last_active_date, increment.
   * Otherwise reset to 1.
   */
  async updateStreak(
    type: Streak['streak_type'],
    date: string
  ): Promise<Streak> {
    const profileId = profileManager.getActiveProfileIdSync();

    // Get current streak
    const { data: existing } = await supabase
      .from('streaks')
      .select('*')
      .eq('profile_id', profileId)
      .eq('streak_type', type)
      .single();

    const streak = existing as Streak | null;

    if (!streak) {
      // Create it
      const { data, error } = await supabase
        .from('streaks')
        .insert({
          profile_id: profileId,
          streak_type: type,
          current_count: 1,
          longest_count: 1,
          last_active_date: date,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to create streak: ${error.message}`);
      return data as Streak;
    }

    // Already recorded today
    if (streak.last_active_date === date) {
      return streak;
    }

    // Check if consecutive
    const lastDate = streak.last_active_date
      ? new Date(streak.last_active_date + 'T00:00:00')
      : null;
    const currentDate = new Date(date + 'T00:00:00');

    let newCount: number;
    if (lastDate) {
      const diffMs = currentDate.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      newCount = diffDays === 1 ? streak.current_count + 1 : 1;
    } else {
      newCount = 1;
    }

    const newLongest = Math.max(streak.longest_count, newCount);

    const { data, error } = await supabase
      .from('streaks')
      .update({
        current_count: newCount,
        longest_count: newLongest,
        last_active_date: date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', streak.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update streak: ${error.message}`);
    return data as Streak;
  },

  /**
   * Get all 3 streaks for the active profile.
   */
  async getStreaks(): Promise<Streak[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('streaks')
      .select('*')
      .eq('profile_id', profileId)
      .order('streak_type');

    if (error) throw new Error(`Failed to fetch streaks: ${error.message}`);
    return (data ?? []) as Streak[];
  },

  /**
   * Check various conditions and unlock any new achievements.
   * Returns newly unlocked achievement keys.
   */
  async checkAchievements(): Promise<Achievement[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    if (!profileId) return [];

    const newlyUnlocked: Achievement[] = [];

    // Get all existing achievements
    const { data: existing } = await supabase
      .from('achievements')
      .select('*')
      .eq('profile_id', profileId);
    const achievements = (existing ?? []) as Achievement[];
    const unlockedKeys = new Set(
      achievements.filter((a) => a.unlocked_at).map((a) => a.achievement_key)
    );

    // Helper to unlock
    const unlock = async (key: string) => {
      if (unlockedKeys.has(key)) return;
      const { data, error } = await supabase
        .from('achievements')
        .update({ unlocked_at: new Date().toISOString() })
        .eq('profile_id', profileId)
        .eq('achievement_key', key)
        .select()
        .single();

      if (!error && data) {
        newlyUnlocked.push(data as Achievement);
      }
    };

    // Count completed gym sessions
    const { count: sessionCount } = await supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('status', 'completed');

    const sessions = sessionCount ?? 0;
    if (sessions >= 1) await unlock('first_workout');
    if (sessions >= 10) await unlock('workouts_10');
    if (sessions >= 50) await unlock('workouts_50');
    if (sessions >= 100) await unlock('workouts_100');

    // Count meals
    const { count: mealCount } = await supabase
      .from('meals')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId);

    const meals = mealCount ?? 0;
    if (meals >= 1) await unlock('first_meal');
    if (meals >= 50) await unlock('meals_50');
    if (meals >= 100) await unlock('meals_100');
    if (meals >= 500) await unlock('meals_500');

    // Check streaks
    const streaks = await gamificationService.getStreaks();
    const maxCurrent = Math.max(0, ...streaks.map((s) => s.current_count));
    const maxLongest = Math.max(0, ...streaks.map((s) => s.longest_count));
    const bestStreak = Math.max(maxCurrent, maxLongest);

    if (bestStreak >= 3) await unlock('streak_3');
    if (bestStreak >= 7) await unlock('streak_7');
    if (bestStreak >= 14) await unlock('streak_14');
    if (bestStreak >= 30) await unlock('streak_30');
    if (bestStreak >= 60) await unlock('streak_60');

    // Count PRs
    const { count: prCount } = await supabase
      .from('personal_records')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId);

    const prs = prCount ?? 0;
    if (prs >= 1) await unlock('first_pr');
    if (prs >= 10) await unlock('prs_10');
    if (prs >= 25) await unlock('prs_25');

    // Challenges
    const { count: challengeCount } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId);

    if ((challengeCount ?? 0) >= 1) await unlock('first_challenge');

    // Body measurements
    const { count: measurementCount } = await supabase
      .from('body_measurements')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId);

    if ((measurementCount ?? 0) >= 1) await unlock('first_measurement');

    // Profile complete
    const { data: profileData } = await supabase
      .from('user_profile')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (profileData) {
      const p = profileData as Record<string, unknown>;
      if (p.weight_kg && p.height_cm && p.age && p.sex && p.activity_level && p.goal_type) {
        await unlock('profile_complete');
      }
    }

    return newlyUnlocked;
  },

  /**
   * Get all achievements for the active profile.
   */
  async getAchievements(): Promise<Achievement[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('profile_id', profileId)
      .order('category')
      .order('achievement_key');

    if (error) throw new Error(`Failed to fetch achievements: ${error.message}`);
    return (data ?? []) as Achievement[];
  },

  /**
   * Seed all possible achievement rows (locked) for a profile.
   */
  async seedAchievements(profileId: string): Promise<void> {
    const rows = ACHIEVEMENT_DEFINITIONS.map((d) => ({
      profile_id: profileId,
      achievement_key: d.key,
      name: d.name,
      description: d.description,
      category: d.category,
      unlocked_at: null,
    }));

    // Upsert to avoid duplicates
    for (const row of rows) {
      await supabase
        .from('achievements')
        .upsert(row, { onConflict: 'profile_id,achievement_key' });
    }
  },
};
