export type PantryCategory =
  | 'protein' | 'carb' | 'fat' | 'dairy' | 'vegetable'
  | 'fruit' | 'grain' | 'spice' | 'sauce' | 'other';

export interface PantryItem {
  id: string;
  name: string;
  category: PantryCategory | null;
  quantity: string | null;
  is_staple: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePantryInput {
  name: string;
  category?: PantryCategory;
  quantity?: string;
  is_staple?: boolean;
  expires_at?: string;
}
