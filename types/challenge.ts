export type ChallengeGoalType = 'cut' | 'bulk' | 'maintain' | 'custom';

export interface Challenge {
  id: string;
  name: string;
  goal_type: ChallengeGoalType;
  start_date: string;
  end_date: string;
  duration_days: number;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_fiber_g: number | null;
  start_weight_kg: number | null;
  target_weight_kg: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateChallengeInput {
  name: string;
  goal_type: ChallengeGoalType;
  start_date: string;
  end_date: string;
  duration_days: number;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_fiber_g?: number;
  start_weight_kg?: number;
  target_weight_kg?: number;
  notes?: string;
}

export interface ChallengeDay {
  id: string;
  challenge_id: string;
  day_number: number;
  day_date: string;
  actual_calories: number | null;
  actual_protein_g: number | null;
  actual_carbs_g: number | null;
  actual_fat_g: number | null;
  calories_burned: number;
  weight_kg: number | null;
  completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateChallengeDayInput {
  actual_calories?: number;
  actual_protein_g?: number;
  actual_carbs_g?: number;
  actual_fat_g?: number;
  calories_burned?: number;
  weight_kg?: number | null;
  completed?: boolean;
  notes?: string;
}
