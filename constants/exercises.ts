import { ExerciseCategory } from '../types/workout';

export interface ExerciseCategoryConfig {
  label: string;
  icon: string;
  color: string;
}

export const EXERCISE_CATEGORIES: Record<ExerciseCategory, ExerciseCategoryConfig> = {
  cardio: { label: 'Cardio', icon: 'C', color: '#F87171' },
  strength: { label: 'Strength', icon: 'S', color: '#60A5FA' },
  flexibility: { label: 'Flexibility', icon: 'F', color: '#A78BFA' },
  sports: { label: 'Sports', icon: 'Sp', color: '#4ADE80' },
  other: { label: 'Other', icon: 'O', color: '#FACC15' },
};

export const EXERCISE_CATEGORY_ORDER: ExerciseCategory[] = [
  'cardio', 'strength', 'flexibility', 'sports', 'other',
];
