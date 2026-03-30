export interface ChatConversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: ChatMessageMetadata | null;
  created_at: string;
}

export interface ChatMessageMetadata {
  type?: 'meal_suggestion' | 'workout_plan' | 'meal_log_prompt';
  logPrompt?: {
    food_name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

export interface MealSuggestion {
  name: string;
  description: string;
  prep_time_mins: number;
  ingredients: string[];
  macros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  uses_pantry_items: string[];
}

export interface SuggestMealsResponse {
  suggestions: MealSuggestion[];
  shopping_tip?: string;
}
