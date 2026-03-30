export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type GoalType = 'cut' | 'bulk' | 'maintain';

export interface UserProfile {
  id: string;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  sex: Sex | null;
  activity_level: ActivityLevel | null;
  goal_type: GoalType | null;
  updated_at: string;
}

export interface UpdateProfileInput {
  weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  sex?: Sex | null;
  activity_level?: ActivityLevel | null;
  goal_type?: GoalType | null;
}
