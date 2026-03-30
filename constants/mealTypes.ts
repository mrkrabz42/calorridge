import { MealType } from '../types';

export interface MealTypeConfig {
  label: string;
  icon: string;
  defaultTime: string;
  color: string;
}

export const MEAL_TYPES: Record<MealType, MealTypeConfig> = {
  breakfast: {
    label: 'Breakfast',
    icon: '🌅',
    defaultTime: '08:00',
    color: '#FACC15',
  },
  lunch: {
    label: 'Lunch',
    icon: '☀️',
    defaultTime: '12:30',
    color: '#4ADE80',
  },
  dinner: {
    label: 'Dinner',
    icon: '🌙',
    defaultTime: '19:00',
    color: '#818CF8',
  },
  snack: {
    label: 'Snack',
    icon: '🍎',
    defaultTime: '15:00',
    color: '#FB923C',
  },
};

export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
