export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      meals: {
        Row: {
          id: string;
          meal_type: string;
          logged_at: string;
          meal_date: string;
          notes: string | null;
          photo_url: string | null;
          food_name: string;
          food_items: Json | null;
          confidence: number | null;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number | null;
          sugar_g: number | null;
          sodium_mg: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meal_type: string;
          logged_at?: string;
          meal_date: string;
          notes?: string | null;
          photo_url?: string | null;
          food_name: string;
          food_items?: Json | null;
          confidence?: number | null;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g?: number | null;
          sugar_g?: number | null;
          sodium_mg?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meal_type?: string;
          logged_at?: string;
          meal_date?: string;
          notes?: string | null;
          photo_url?: string | null;
          food_name?: string;
          food_items?: Json | null;
          confidence?: number | null;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          fiber_g?: number | null;
          sugar_g?: number | null;
          sodium_mg?: number | null;
        };
      };
      daily_goals: {
        Row: {
          id: string;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number;
        };
        Insert: {
          id?: string;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g?: number;
        };
        Update: {
          id?: string;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          fiber_g?: number;
        };
      };
      food_cache: {
        Row: {
          id: string;
          image_hash: string;
          claude_response: Json;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          image_hash: string;
          claude_response: Json;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          image_hash?: string;
          claude_response?: Json;
          expires_at?: string;
        };
      };
    };
    Views: {
      daily_nutrition: {
        Row: {
          meal_date: string;
          meal_count: number;
          total_calories: number;
          total_protein_g: number;
          total_carbs_g: number;
          total_fat_g: number;
          total_fiber_g: number;
        };
      };
    };
  };
}
