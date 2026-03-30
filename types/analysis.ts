import { FoodItem } from './meal';

export interface AnalysisResult {
  meal_summary: string;
  food_items: FoodItem[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  };
  confidence: number;
  confidence_reason: string;
  portion_note_applied: boolean;
}

export interface AnalysisRequest {
  imageBase64: string;
  imageMediaType: string;
  portionNotes?: string;
  imageHash: string;
}

export interface AnalysisResponse {
  success: boolean;
  data?: AnalysisResult;
  cached?: boolean;
  error?: string;
  errorCode?: AnalysisErrorCode;
}

export type AnalysisErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_IMAGE'
  | 'CLAUDE_ERROR'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED';

export type AnalysisState =
  | 'idle'
  | 'compressing'
  | 'uploading'
  | 'analysing'
  | 'success'
  | 'error';
