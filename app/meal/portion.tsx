import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMealsStore } from '../../store/mealsStore';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { BarcodeProduct } from '../../types/barcode';
import { MealType } from '../../types/meal';
import { getTodayDateString } from '../../utils/macroUtils';
import { mealsService } from '../../services/mealsService';
import { MealTypeSelector } from '../../components/meal/MealTypeSelector';

const PORTION_PRESETS = [
  { label: '0.5x', multiplier: 0.5 },
  { label: '1x', multiplier: 1 },
  { label: '1.5x', multiplier: 1.5 },
  { label: '2x', multiplier: 2 },
];

export default function PortionScreen() {
  const { productJson } = useLocalSearchParams<{ productJson: string }>();
  const { addMealOptimistic } = useMealsStore();

  const product: BarcodeProduct | null = useMemo(() => {
    try {
      return JSON.parse(productJson ?? '');
    } catch {
      return null;
    }
  }, [productJson]);

  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [customGrams, setCustomGrams] = useState('');
  const [mealType, setMealType] = useState<MealType>('snack');
  const [isSaving, setIsSaving] = useState(false);

  if (!product) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.errorText}>Invalid product data</Text>
      </View>
    );
  }

  // Calculate macros based on portion
  const macros = useMemo(() => {
    const per100g = product.nutrition_per_100g;
    let factor: number;

    if (customGrams) {
      const grams = parseFloat(customGrams);
      factor = grams > 0 ? grams / 100 : 1;
    } else {
      // Use serving-based multiplier
      const perServing = product.nutrition_per_serving;
      return {
        calories: Math.round(perServing.calories * portionMultiplier),
        protein_g: Math.round(perServing.protein_g * portionMultiplier * 10) / 10,
        carbs_g: Math.round(perServing.carbs_g * portionMultiplier * 10) / 10,
        fat_g: Math.round(perServing.fat_g * portionMultiplier * 10) / 10,
        fiber_g: Math.round(perServing.fiber_g * portionMultiplier * 10) / 10,
        sugar_g: Math.round(perServing.sugar_g * portionMultiplier * 10) / 10,
        sodium_mg: Math.round(perServing.sodium_mg * portionMultiplier),
      };
    }

    return {
      calories: Math.round(per100g.calories * factor),
      protein_g: Math.round(per100g.protein_g * factor * 10) / 10,
      carbs_g: Math.round(per100g.carbs_g * factor * 10) / 10,
      fat_g: Math.round(per100g.fat_g * factor * 10) / 10,
      fiber_g: Math.round(per100g.fiber_g * factor * 10) / 10,
      sugar_g: Math.round(per100g.sugar_g * factor * 10) / 10,
      sodium_mg: Math.round(per100g.sodium_mg * factor),
    };
  }, [product, portionMultiplier, customGrams]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const meal = await mealsService.createMeal({
        meal_type: mealType,
        meal_date: getTodayDateString(),
        food_name: `${product.brand ? product.brand + ' ' : ''}${product.name}`,
        calories: macros.calories,
        protein_g: macros.protein_g,
        carbs_g: macros.carbs_g,
        fat_g: macros.fat_g,
        fiber_g: macros.fiber_g,
        sugar_g: macros.sugar_g,
        sodium_mg: macros.sodium_mg,
        confidence: 0.95,
      });
      addMealOptimistic(meal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } catch {
      Alert.alert('Error', 'Failed to log meal.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Product info */}
      <View style={styles.productHeader}>
        {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.serving}>Serving: {product.serving_size}</Text>
      </View>

      {/* Meal type */}
      <MealTypeSelector value={mealType} onChange={setMealType} />

      {/* Portion selector */}
      <View style={styles.card}>
        <Text style={styles.label}>Portion Size</Text>
        <View style={styles.presetRow}>
          {PORTION_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.label}
              style={[
                styles.presetChip,
                !customGrams && portionMultiplier === p.multiplier && styles.presetChipActive,
              ]}
              onPress={() => { setPortionMultiplier(p.multiplier); setCustomGrams(''); }}
            >
              <Text style={[
                styles.presetText,
                !customGrams && portionMultiplier === p.multiplier && styles.presetTextActive,
              ]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.orText}>or enter custom amount</Text>
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={customGrams}
            onChangeText={setCustomGrams}
            keyboardType="number-pad"
            placeholder="Custom grams"
            placeholderTextColor={Colors.text.muted}
          />
          <Text style={styles.unit}>g</Text>
        </View>
      </View>

      {/* Live macro preview */}
      <View style={styles.macroCard}>
        <Text style={styles.macroTitle}>Nutrition</Text>
        <View style={styles.macroGrid}>
          <MacroDisplay label="Calories" value={macros.calories} unit="kcal" color={Colors.macro.calories} />
          <MacroDisplay label="Protein" value={macros.protein_g} unit="g" color={Colors.macro.protein} />
          <MacroDisplay label="Carbs" value={macros.carbs_g} unit="g" color={Colors.macro.carbs} />
          <MacroDisplay label="Fat" value={macros.fat_g} unit="g" color={Colors.macro.fat} />
          <MacroDisplay label="Fibre" value={macros.fiber_g} unit="g" color={Colors.macro.fiber} />
          <MacroDisplay label="Sugar" value={macros.sugar_g} unit="g" color={Colors.status.warning} />
        </View>
      </View>

      {/* Save */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSave}
        disabled={isSaving}
        activeOpacity={0.85}
      >
        <Text style={styles.saveText}>
          {isSaving ? 'Saving...' : `Log ${macros.calories} kcal`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MacroDisplay({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.macroItem}>
      <Text style={[styles.macroValue, { color }]}>{Math.round(value * 10) / 10}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.status.error, fontSize: Typography.sizes.base },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  productHeader: { alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  brand: { color: Colors.text.muted, fontSize: Typography.sizes.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  productName: { color: Colors.text.primary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, textAlign: 'center' },
  serving: { color: Colors.text.secondary, fontSize: Typography.sizes.sm },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  label: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  presetRow: { flexDirection: 'row', gap: Spacing.sm },
  presetChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
  },
  presetChipActive: { backgroundColor: Colors.brand.primary + '20', borderColor: Colors.brand.primary },
  presetText: { color: Colors.text.secondary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
  presetTextActive: { color: Colors.brand.primary },
  orText: { color: Colors.text.muted, fontSize: Typography.sizes.xs, textAlign: 'center' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  customInput: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  unit: { color: Colors.text.muted, fontSize: Typography.sizes.sm },
  macroCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '30',
  },
  macroTitle: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: Spacing.sm },
  macroItem: { alignItems: 'center', width: '28%', gap: 2 },
  macroValue: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  macroUnit: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  macroLabel: { color: Colors.text.secondary, fontSize: Typography.sizes.xs },
  saveBtn: { padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.brand.primary, alignItems: 'center' },
  saveText: { color: Colors.text.inverse, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
});
