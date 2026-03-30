import { supabase } from './supabase';
import { profileManager } from './profileManager';
import { PantryItem, CreatePantryInput } from '../types/pantry';

export const pantryService = {
  async getItems(): Promise<PantryItem[]> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('profile_id', profileId)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw new Error(`Failed to fetch pantry: ${error.message}`);
    return (data ?? []) as PantryItem[];
  },

  async addItem(input: CreatePantryInput): Promise<PantryItem> {
    const profileId = profileManager.getActiveProfileIdSync();
    const { data, error } = await supabase
      .from('pantry_items')
      .insert({ ...input, profile_id: profileId })
      .select()
      .single();

    if (error) throw new Error(`Failed to add pantry item: ${error.message}`);
    return data as PantryItem;
  },

  async updateItem(id: string, input: Partial<CreatePantryInput>): Promise<PantryItem> {
    const { data, error } = await supabase
      .from('pantry_items')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update pantry item: ${error.message}`);
    return data as PantryItem;
  },

  async removeItem(id: string): Promise<void> {
    const { error } = await supabase.from('pantry_items').delete().eq('id', id);
    if (error) throw new Error(`Failed to remove pantry item: ${error.message}`);
  },
};
