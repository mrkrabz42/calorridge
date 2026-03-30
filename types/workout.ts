export type ExerciseCategory = 'cardio' | 'strength' | 'flexibility' | 'sports' | 'other';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  cals_per_min_default: number | null;
  met_value: number | null;
  is_custom: boolean;
  created_at: string;
}

export interface Workout {
  id: string;
  exercise_id: string | null;
  exercise_name: string;
  category: string;
  workout_date: string;
  duration_mins: number;
  calories_burned: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkoutInput {
  exercise_id?: string;
  exercise_name: string;
  category: string;
  workout_date: string;
  duration_mins: number;
  calories_burned: number;
  notes?: string;
}
