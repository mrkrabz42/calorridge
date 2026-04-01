import { create } from 'zustand';
import { MealType } from '../types/meal';

export interface PlateItem {
  id: string;
  food_name: string;
  brand?: string;
  servings: number;
  serving_size: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  fiber_per_serving?: number;
  source: 'manual' | 'search' | 'saved' | 'custom' | 'ai_photo' | 'recipe' | 'barcode';
  source_id?: string;
}

function genId(): string {
  return Math.random().toString(36).substring(2, 10);
}

interface PlateBuildState {
  items: PlateItem[];
  mealType: MealType;
  mealName: string;
  setMealType: (type: MealType) => void;
  setMealName: (name: string) => void;
  addItem: (item: Omit<PlateItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateServings: (id: string, servings: number) => void;
  clearPlate: () => void;
  loadItems: (items: PlateItem[], mealType?: MealType, mealName?: string) => void;
  getTotals: () => { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number };
}

function guessMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}

export const usePlateBuildStore = create<PlateBuildState>()((set, get) => ({
  items: [],
  mealType: guessMealType(),
  mealName: '',
  setMealType: (type) => set({ mealType: type }),
  setMealName: (name) => set({ mealName: name }),
  addItem: (item) => set((s) => ({ items: [...s.items, { ...item, id: genId() }] })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  updateServings: (id, servings) => set((s) => ({
    items: s.items.map((i) => i.id === id ? { ...i, servings } : i),
  })),
  clearPlate: () => set({ items: [], mealType: guessMealType(), mealName: '' }),
  loadItems: (items, mealType, mealName) => set({
    items: items.map((i) => ({ ...i, id: i.id || genId() })),
    mealType: mealType ?? guessMealType(),
    mealName: mealName ?? '',
  }),
  getTotals: () => {
    const items = get().items;
    return items.reduce((acc, i) => ({
      calories: acc.calories + Math.round(i.calories_per_serving * i.servings),
      protein_g: acc.protein_g + Math.round(i.protein_per_serving * i.servings * 10) / 10,
      carbs_g: acc.carbs_g + Math.round(i.carbs_per_serving * i.servings * 10) / 10,
      fat_g: acc.fat_g + Math.round(i.fat_per_serving * i.servings * 10) / 10,
      fiber_g: acc.fiber_g + Math.round((i.fiber_per_serving ?? 0) * i.servings * 10) / 10,
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 });
  },
}));
