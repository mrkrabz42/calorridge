import { supabase } from './supabase';
import { Exercise, Workout, CreateWorkoutInput } from '../types/workout';

export const workoutsService = {
  async getExercises(): Promise<Exercise[]> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to fetch exercises: ${error.message}`);
    return (data ?? []) as Exercise[];
  },

  async createExercise(name: string, category: string, met_value: number, cals_per_min: number): Promise<Exercise> {
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        name,
        category,
        met_value,
        cals_per_min_default: cals_per_min,
        is_custom: true,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create exercise: ${error.message}`);
    return data as Exercise;
  },

  async createWorkout(input: CreateWorkoutInput): Promise<Workout> {
    const { data, error } = await supabase
      .from('workouts')
      .insert({
        exercise_id: input.exercise_id,
        exercise_name: input.exercise_name,
        category: input.category,
        workout_date: input.workout_date,
        duration_mins: input.duration_mins,
        calories_burned: input.calories_burned,
        notes: input.notes,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create workout: ${error.message}`);
    return data as Workout;
  },

  async getWorkoutsByDate(date: string): Promise<Workout[]> {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('workout_date', date)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch workouts: ${error.message}`);
    return (data ?? []) as Workout[];
  },

  async getWorkoutById(id: string): Promise<Workout | null> {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch workout: ${error.message}`);
    }
    return data as Workout;
  },

  async deleteWorkout(id: string): Promise<void> {
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete workout: ${error.message}`);
  },

  async getDailyBurned(date: string): Promise<number> {
    const workouts = await workoutsService.getWorkoutsByDate(date);
    return workouts.reduce((sum, w) => sum + w.calories_burned, 0);
  },

  async getWorkoutsPaginated(page: number, pageSize = 20): Promise<Workout[]> {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to fetch workouts: ${error.message}`);
    return (data ?? []) as Workout[];
  },
};
