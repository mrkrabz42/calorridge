import { supabase } from './supabase';
import { profileManager } from './profileManager';

export interface BodyMeasurement {
  id: string;
  profile_id: string;
  measured_at: string;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  left_arm_cm: number | null;
  right_arm_cm: number | null;
  left_thigh_cm: number | null;
  right_thigh_cm: number | null;
  left_calf_cm: number | null;
  right_calf_cm: number | null;
  shoulders_cm: number | null;
  neck_cm: number | null;
  body_fat_pct: number | null;
  notes: string | null;
  created_at: string;
}

export interface CreateMeasurementInput {
  measured_at?: string;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  left_arm_cm?: number | null;
  right_arm_cm?: number | null;
  left_thigh_cm?: number | null;
  right_thigh_cm?: number | null;
  left_calf_cm?: number | null;
  right_calf_cm?: number | null;
  shoulders_cm?: number | null;
  neck_cm?: number | null;
  body_fat_pct?: number | null;
  notes?: string | null;
}

export interface PRTimelineEntry {
  id: string;
  exercise_id: string;
  exercise_name: string;
  pr_type: string;
  value: number;
  weight_kg: number | null;
  reps: number | null;
  achieved_at: string;
}

export const analyticsService = {
  /**
   * Log a new body measurement entry.
   */
  async logMeasurement(data: CreateMeasurementInput): Promise<BodyMeasurement> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data: result, error } = await supabase
      .from('body_measurements')
      .insert({
        profile_id: profileId,
        ...data,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to log measurement: ${error.message}`);
    return result as BodyMeasurement;
  },

  /**
   * Get recent body measurements.
   */
  async getMeasurements(limit = 10): Promise<BodyMeasurement[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('profile_id', profileId)
      .order('measured_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch measurements: ${error.message}`);
    return (data ?? []) as BodyMeasurement[];
  },

  /**
   * Calculate total volume per primary muscle group within a date range.
   * Queries workout_sessions -> workout_exercises -> exercise_sets -> exercise_library.
   */
  async getVolumeByMuscleGroup(
    startDate: string,
    endDate: string
  ): Promise<Record<string, number>> {
    const profileId = profileManager.getActiveProfileIdSync();

    // Get completed sessions in range
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('profile_id', profileId)
      .eq('status', 'completed')
      .gte('session_date', startDate)
      .lte('session_date', endDate);

    if (!sessions?.length) return {};

    const sessionIds = sessions.map((s: { id: string }) => s.id);

    // Get workout exercises for those sessions
    const { data: weData } = await supabase
      .from('workout_exercises')
      .select('id, exercise_id')
      .in('session_id', sessionIds);

    if (!weData?.length) return {};

    const workoutExercises = weData as { id: string; exercise_id: string }[];
    const weIds = workoutExercises.map((we) => we.id);
    const exerciseIds = [...new Set(workoutExercises.map((we) => we.exercise_id))];

    // Get exercise details for primary muscles
    const { data: exData } = await supabase
      .from('exercise_library')
      .select('id, primary_muscles')
      .in('id', exerciseIds);

    const exerciseMap = new Map<string, string[]>();
    for (const ex of (exData ?? []) as { id: string; primary_muscles: string[] }[]) {
      exerciseMap.set(ex.id, ex.primary_muscles ?? []);
    }

    // Build we -> exercise map
    const weToExercise = new Map<string, string>();
    for (const we of workoutExercises) {
      weToExercise.set(we.id, we.exercise_id);
    }

    // Get all completed sets
    const { data: setsData } = await supabase
      .from('exercise_sets')
      .select('workout_exercise_id, weight_kg, reps, is_completed')
      .in('workout_exercise_id', weIds)
      .eq('is_completed', true);

    const volumeByMuscle: Record<string, number> = {};

    for (const set of (setsData ?? []) as {
      workout_exercise_id: string;
      weight_kg: number | null;
      reps: number | null;
      is_completed: boolean;
    }[]) {
      const weight = set.weight_kg ?? 0;
      const reps = set.reps ?? 0;
      const volume = weight * reps;
      if (volume <= 0) continue;

      const exerciseId = weToExercise.get(set.workout_exercise_id);
      if (!exerciseId) continue;

      const muscles = exerciseMap.get(exerciseId) ?? [];
      for (const muscle of muscles) {
        volumeByMuscle[muscle] = (volumeByMuscle[muscle] ?? 0) + volume;
      }
    }

    return volumeByMuscle;
  },

  /**
   * Get recent personal records across all exercises, with exercise names.
   */
  async getPRTimeline(limit = 20): Promise<PRTimelineEntry[]> {
    const profileId = profileManager.getActiveProfileIdSync();

    const { data: prs, error } = await supabase
      .from('personal_records')
      .select('*')
      .eq('profile_id', profileId)
      .order('achieved_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch PRs: ${error.message}`);
    if (!prs?.length) return [];

    const records = prs as {
      id: string;
      exercise_id: string;
      pr_type: string;
      value: number;
      weight_kg: number | null;
      reps: number | null;
      achieved_at: string;
    }[];

    // Get exercise names
    const exerciseIds = [...new Set(records.map((r) => r.exercise_id))];
    const { data: exData } = await supabase
      .from('exercise_library')
      .select('id, name')
      .in('id', exerciseIds);

    const nameMap = new Map<string, string>();
    for (const ex of (exData ?? []) as { id: string; name: string }[]) {
      nameMap.set(ex.id, ex.name);
    }

    return records.map((r) => ({
      ...r,
      exercise_name: nameMap.get(r.exercise_id) ?? 'Unknown',
    }));
  },
};
