export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'abs';

export type ExerciseMuscle =
  | 'chest' | 'front_delt' | 'side_delt' | 'rear_delt'
  | 'upper_back' | 'lats' | 'lower_back'
  | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves'
  | 'abs' | 'obliques';

export type GymExerciseCategory =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'abs'
  | 'cardio' | 'olympic' | 'full_body' | 'other';

export type Equipment =
  | 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight'
  | 'kettlebell' | 'band' | 'smith_machine' | 'ez_bar' | 'trap_bar'
  | 'other' | 'none';

export type SetType = 'normal' | 'warmup' | 'drop_set' | 'failure' | 'rest_pause';

export type SessionStatus = 'active' | 'completed' | 'cancelled';

export type PRType = 'weight' | 'reps' | 'volume' | 'estimated_1rm';

export interface GymExercise {
  id: string;
  name: string;
  category: GymExerciseCategory;
  primary_muscles: ExerciseMuscle[];
  secondary_muscles: ExerciseMuscle[];
  equipment: Equipment | null;
  movement_type: 'compound' | 'isolation' | null;
  is_barbell: boolean;
  is_custom: boolean;
  instructions: string | null;
  met_value: number | null;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  name: string | null;
  template_id: string | null;
  started_at: string;
  finished_at: string | null;
  duration_secs: number | null;
  total_volume_kg: number | null;
  total_sets: number | null;
  calories_burned: number | null;
  notes: string | null;
  session_date: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  position: number;
  superset_group: number | null;
  rest_secs: number;
  notes: string | null;
  created_at: string;
}

export interface ExerciseSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  set_type: SetType;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  is_completed: boolean;
  is_pr: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface PersonalRecord {
  id: string;
  exercise_id: string;
  pr_type: PRType;
  value: number;
  weight_kg: number | null;
  reps: number | null;
  session_id: string | null;
  achieved_at: string;
  created_at: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  estimated_duration_mins: number | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  position: number;
  superset_group: number | null;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  rest_secs: number;
  notes: string | null;
}

// Composite types for UI
export interface SessionExerciseWithSets extends WorkoutExercise {
  exercise: GymExercise;
  sets: ExerciseSet[];
  previousSets: ExerciseSet[][] | null; // last session's sets for this exercise
}

export interface CreateSessionInput {
  name?: string;
  template_id?: string;
}

export interface CreateSetInput {
  workout_exercise_id: string;
  set_number: number;
  set_type?: SetType;
  weight_kg?: number;
  reps?: number;
  rpe?: number;
  rir?: number;
}

export interface UpdateSetInput {
  weight_kg?: number | null;
  reps?: number | null;
  rpe?: number | null;
  rir?: number | null;
  set_type?: SetType;
  is_completed?: boolean;
  is_pr?: boolean;
  completed_at?: string | null;
}
