export const MACRO_CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

export const DEFAULT_GOALS = {
  calories: 2000,
  protein_g: 150,
  carbs_g: 200,
  fat_g: 65,
  fiber_g: 25,
} as const;

export const MAX_CALORIES_PER_MEAL = 8000;
export const LOW_CONFIDENCE_THRESHOLD = 0.5;
export const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500KB
export const IMAGE_COMPRESSION_QUALITY = 0.7;
export const CACHE_TTL_DAYS = 7;
