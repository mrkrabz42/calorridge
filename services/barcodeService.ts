import { supabase } from './supabase';
import { BarcodeLookupResult, BarcodeProduct } from '../types/barcode';

export const barcodeService = {
  async lookup(barcode: string): Promise<BarcodeLookupResult> {
    // 1. Check cache
    const { data: cached } = await supabase
      .from('barcode_cache')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (cached) {
      const per100g = cached.nutrition_per_100g as BarcodeProduct['nutrition_per_100g'];
      return {
        found: true,
        product: {
          name: cached.product_name ?? 'Unknown',
          brand: cached.brand ?? '',
          serving_size: cached.serving_size ?? '100g',
          nutrition_per_100g: per100g,
          nutrition_per_serving: per100g, // Default to per 100g
        },
        source: 'cache',
      };
    }

    // 2. Try Open Food Facts
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
      );
      const json = await response.json();

      if (json.status === 1 && json.product) {
        const p = json.product;
        const nutriments = p.nutriments ?? {};
        const servingSize = p.serving_size ?? '100g';

        const per100g = {
          calories: Math.round(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? 0),
          protein_g: Math.round((nutriments.proteins_100g ?? 0) * 10) / 10,
          carbs_g: Math.round((nutriments.carbohydrates_100g ?? 0) * 10) / 10,
          fat_g: Math.round((nutriments.fat_100g ?? 0) * 10) / 10,
          fiber_g: Math.round((nutriments.fiber_100g ?? 0) * 10) / 10,
          sugar_g: Math.round((nutriments.sugars_100g ?? 0) * 10) / 10,
          sodium_mg: Math.round((nutriments.sodium_100g ?? 0) * 1000),
        };

        // Calculate per serving if serving quantity available
        const servingGrams = parseFloat(p.serving_quantity) || 100;
        const factor = servingGrams / 100;
        const perServing = {
          calories: Math.round(per100g.calories * factor),
          protein_g: Math.round(per100g.protein_g * factor * 10) / 10,
          carbs_g: Math.round(per100g.carbs_g * factor * 10) / 10,
          fat_g: Math.round(per100g.fat_g * factor * 10) / 10,
          fiber_g: Math.round(per100g.fiber_g * factor * 10) / 10,
          sugar_g: Math.round(per100g.sugar_g * factor * 10) / 10,
          sodium_mg: Math.round(per100g.sodium_mg * factor),
        };

        // Cache it
        await supabase.from('barcode_cache').upsert({
          barcode,
          product_name: p.product_name ?? p.product_name_en ?? 'Unknown',
          brand: p.brands ?? '',
          nutrition_per_100g: per100g,
          serving_size: servingSize,
          source: 'openfoodfacts',
        });

        return {
          found: true,
          product: {
            name: p.product_name ?? p.product_name_en ?? 'Unknown Product',
            brand: p.brands ?? '',
            serving_size: servingSize,
            nutrition_per_100g: per100g,
            nutrition_per_serving: perServing,
          },
          source: 'openfoodfacts',
        };
      }
    } catch {
      // OFF failed, fall through
    }

    return { found: false };
  },
};
