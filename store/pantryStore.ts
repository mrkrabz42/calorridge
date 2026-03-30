import { create } from 'zustand';
import { PantryItem, CreatePantryInput } from '../types/pantry';
import { pantryService } from '../services/pantryService';

interface PantryState {
  items: PantryItem[];
  isLoading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  addItem: (input: CreatePantryInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  getItemNames: () => string[];
  clearError: () => void;
}

export const usePantryStore = create<PantryState>()((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await pantryService.getItems();
      set({ items, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addItem: async (input: CreatePantryInput) => {
    try {
      const item = await pantryService.addItem(input);
      set((state) => ({ items: [...state.items, item] }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  removeItem: async (id: string) => {
    const prev = get().items;
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
    try {
      await pantryService.removeItem(id);
    } catch (err) {
      set({ items: prev, error: (err as Error).message });
    }
  },

  getItemNames: () => get().items.map((i) => i.name),

  clearError: () => set({ error: null }),
}));
