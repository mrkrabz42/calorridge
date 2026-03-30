export interface BarcodeProduct {
  name: string;
  brand: string;
  serving_size: string;
  nutrition_per_100g: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  };
  nutrition_per_serving: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  };
}

export interface BarcodeLookupResult {
  found: boolean;
  product?: BarcodeProduct;
  source?: 'cache' | 'openfoodfacts' | 'perplexity';
}
