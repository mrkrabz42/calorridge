import { supabase } from './supabase';
import { profileManager } from './profileManager';
import { goalsService } from './goalsService';
import {
  calculateEMA,
  estimateTDEE,
  calculateWeeklyAdjustment,
  getWeekBounds,
  WeightPoint,
} from '../utils/adaptiveUtils';

export interface WeighIn {
  id: string;
  profile_id: string;
  weigh_in_date: string;
  weight_kg: number;
  created_at: string;
}

export interface WeeklyAdjustment {
  id: string;
  profile_id: string;
  week_start_date: string;
  week_end_date: string;
  avg_weight_kg: number | null;
  weight_trend_kg: number | null;
  avg_daily_intake: number | null;
  estimated_tdee: number | null;
  previous_target: number | null;
  new_target: number | null;
  adjustment_reason: string | null;
  created_at: string;
}

export const adaptiveService = {
  /**
   * Log (upsert) a weigh-in for the given date.
   */
  async logWeighIn(date: string, weightKg: number): Promise<WeighIn> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('daily_weigh_ins')
      .upsert(
        { profile_id: profileId, weigh_in_date: date, weight_kg: weightKg },
        { onConflict: 'profile_id,weigh_in_date' }
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to log weigh-in: ${error.message}`);
    return data as WeighIn;
  },

  /**
   * Get weigh-ins between two dates (inclusive), ordered ascending.
   */
  async getWeighIns(startDate: string, endDate: string): Promise<WeighIn[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('daily_weigh_ins')
      .select('*')
      .eq('profile_id', profileId)
      .gte('weigh_in_date', startDate)
      .lte('weigh_in_date', endDate)
      .order('weigh_in_date', { ascending: true });

    if (error) throw new Error(`Failed to fetch weigh-ins: ${error.message}`);
    return (data ?? []) as WeighIn[];
  },

  /**
   * Get the most recent weigh-in for the active profile.
   */
  async getLatestWeighIn(): Promise<WeighIn | null> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('daily_weigh_ins')
      .select('*')
      .eq('profile_id', profileId)
      .order('weigh_in_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch latest weigh-in: ${error.message}`);
    }
    return data as WeighIn;
  },

  /**
   * Get weigh-ins from the last 30 days for trend calculation.
   */
  async getWeighInsLast30Days(): Promise<WeighIn[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return adaptiveService.getWeighIns(fmt(start), fmt(end));
  },

  /**
   * Run the weekly adjustment algorithm.
   *
   * 1. Pull the last 7 days of weigh-ins
   * 2. Pull the last 7 days of meal intake
   * 3. Compute EMA trend and weight change
   * 4. Estimate TDEE
   * 5. Calculate new calorie target
   * 6. Write to weekly_adjustments and update daily_goals
   */
  async runWeeklyAdjustment(): Promise<WeeklyAdjustment> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { start, end } = getWeekBounds();

    // -- Weigh-ins for this week --
    const weighIns = await adaptiveService.getWeighIns(start, end);
    if (weighIns.length < 2) {
      throw new Error('Need at least 2 weigh-ins this week to calculate an adjustment.');
    }

    const points: WeightPoint[] = weighIns.map((w) => ({
      date: w.weigh_in_date,
      value: Number(w.weight_kg),
    }));
    const emaValues = calculateEMA(points);
    const trendWeight = emaValues[emaValues.length - 1];
    const avgWeight =
      points.reduce((s, p) => s + p.value, 0) / points.length;

    // Weight change: last EMA minus first EMA
    const weightChangeKg = emaValues[emaValues.length - 1] - emaValues[0];

    // -- Daily intake for this week (sum calories from meals table) --
    const { data: mealData, error: mealError } = await supabase
      .from('meals')
      .select('meal_date, calories')
      .eq('profile_id', profileId)
      .gte('meal_date', start)
      .lte('meal_date', end);

    if (mealError) throw new Error(`Failed to fetch meal data: ${mealError.message}`);

    const meals = (mealData ?? []) as { meal_date: string; calories: number }[];
    const dailyTotals: Record<string, number> = {};
    for (const m of meals) {
      dailyTotals[m.meal_date] = (dailyTotals[m.meal_date] ?? 0) + m.calories;
    }
    const daysWithData = Object.keys(dailyTotals).length;
    const totalIntake = Object.values(dailyTotals).reduce((s, v) => s + v, 0);
    const avgDailyIntake = daysWithData > 0 ? Math.round(totalIntake / daysWithData) : 0;

    // -- Estimate TDEE --
    const days = weighIns.length; // number of data points spanning the week
    const tdee = estimateTDEE(avgDailyIntake, weightChangeKg, days);

    // -- Current goal and goal type --
    const goals = await goalsService.getGoals();
    const previousTarget = goals?.calories ?? 2000;

    // Fetch profile for goal_type
    const { data: profileData } = await supabase
      .from('user_profile')
      .select('goal_type')
      .eq('profile_id', profileId)
      .single();
    const goalType = (profileData?.goal_type as 'cut' | 'bulk' | 'maintain') ?? 'maintain';

    const newTarget = calculateWeeklyAdjustment(previousTarget, tdee, goalType);

    // Build reason string
    const direction = newTarget > previousTarget ? 'increased' : newTarget < previousTarget ? 'decreased' : 'unchanged';
    const adjustmentReason = `TDEE estimated at ${tdee} kcal. Target ${direction} from ${previousTarget} to ${newTarget} kcal (goal: ${goalType}).`;

    // -- Write weekly adjustment record --
    const { data: adj, error: adjError } = await supabase
      .from('weekly_adjustments')
      .upsert(
        {
          profile_id: profileId,
          week_start_date: start,
          week_end_date: end,
          avg_weight_kg: Math.round(avgWeight * 100) / 100,
          weight_trend_kg: Math.round(trendWeight * 100) / 100,
          avg_daily_intake: avgDailyIntake,
          estimated_tdee: tdee,
          previous_target: previousTarget,
          new_target: newTarget,
          adjustment_reason: adjustmentReason,
        },
        { onConflict: 'profile_id,week_start_date' }
      )
      .select()
      .single();

    if (adjError) throw new Error(`Failed to save weekly adjustment: ${adjError.message}`);

    // -- Update daily_goals with the new calorie target --
    if (goals) {
      await goalsService.updateGoals({ ...goals, calories: newTarget });
    }

    return adj as WeeklyAdjustment;
  },

  /**
   * Get the last 10 weekly adjustments, most recent first.
   */
  async getAdjustmentHistory(): Promise<WeeklyAdjustment[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('weekly_adjustments')
      .select('*')
      .eq('profile_id', profileId)
      .order('week_start_date', { ascending: false })
      .limit(10);

    if (error) throw new Error(`Failed to fetch adjustment history: ${error.message}`);
    return (data ?? []) as WeeklyAdjustment[];
  },
};
