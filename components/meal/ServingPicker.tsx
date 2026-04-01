import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants';

interface ServingUnit {
  label: string;
  grams: number;
}

interface FoodData {
  name: string;
  serving_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
  serving_units?: ServingUnit[];
  calories_per_100g?: number | null;
  protein_per_100g?: number | null;
  carbs_per_100g?: number | null;
  fat_per_100g?: number | null;
  fiber_per_100g?: number | null;
}

interface ServingPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (
    servings: number,
    servingSize: string,
    caloriesPerServing: number,
    proteinPerServing: number,
    carbsPerServing: number,
    fatPerServing: number,
    fiberPerServing?: number
  ) => void;
  food: FoodData;
}

function computeNutrition(
  grams: number,
  food: FoodData
): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | undefined;
} {
  if (
    food.calories_per_100g != null &&
    food.protein_per_100g != null &&
    food.carbs_per_100g != null &&
    food.fat_per_100g != null
  ) {
    const factor = grams / 100;
    return {
      calories: Math.round(food.calories_per_100g * factor),
      protein_g: Math.round(food.protein_per_100g * factor * 10) / 10,
      carbs_g: Math.round(food.carbs_per_100g * factor * 10) / 10,
      fat_g: Math.round(food.fat_per_100g * factor * 10) / 10,
      fiber_g:
        food.fiber_per_100g != null
          ? Math.round(food.fiber_per_100g * factor * 10) / 10
          : undefined,
    };
  }

  // Fallback: use per-serving values as-is (1 serving)
  return {
    calories: food.calories,
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    fat_g: food.fat_g,
    fiber_g: food.fiber_g != null ? food.fiber_g : undefined,
  };
}

export function ServingPicker({
  visible,
  onClose,
  onSelect,
  food,
}: ServingPickerProps) {
  const [selectedUnit, setSelectedUnit] = useState<ServingUnit | null>(null);
  const [customGrams, setCustomGrams] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const has100g =
    food.calories_per_100g != null &&
    food.protein_per_100g != null &&
    food.carbs_per_100g != null &&
    food.fat_per_100g != null;

  const units = food.serving_units ?? [];

  const activeGrams = useMemo(() => {
    if (useCustom) {
      const parsed = parseFloat(customGrams);
      return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
    }
    if (selectedUnit) return selectedUnit.grams;
    return 0;
  }, [useCustom, customGrams, selectedUnit]);

  const preview = useMemo(() => {
    if (activeGrams <= 0 && !selectedUnit && !useCustom) {
      // Show per-serving as default
      return {
        calories: food.calories,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        fiber_g: food.fiber_g != null ? food.fiber_g : undefined,
      };
    }
    if (activeGrams <= 0) {
      return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: undefined };
    }
    return computeNutrition(activeGrams, food);
  }, [activeGrams, food, selectedUnit, useCustom]);

  const servingLabel = useMemo(() => {
    if (useCustom && activeGrams > 0) return `${activeGrams}g`;
    if (selectedUnit) return selectedUnit.label;
    return food.serving_size;
  }, [useCustom, activeGrams, selectedUnit, food.serving_size]);

  const canAdd =
    (useCustom && activeGrams > 0) ||
    (!useCustom && selectedUnit !== null) ||
    (!useCustom && !has100g);

  const handleAdd = () => {
    onSelect(
      1,
      servingLabel,
      preview.calories,
      preview.protein_g,
      preview.carbs_g,
      preview.fat_g,
      preview.fiber_g
    );
    // Reset state
    setSelectedUnit(null);
    setCustomGrams('');
    setUseCustom(false);
  };

  const handleClose = () => {
    setSelectedUnit(null);
    setCustomGrams('');
    setUseCustom(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.foodName} numberOfLines={2}>
            {food.name}
          </Text>
          <Text style={styles.servingInfo}>
            Per serving ({food.serving_size}): {food.calories} kcal
          </Text>

          {/* Serving unit pills */}
          {units.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pillScroll}
              contentContainerStyle={styles.pillContainer}
            >
              {units.map((unit) => {
                const isActive = !useCustom && selectedUnit?.label === unit.label;
                return (
                  <TouchableOpacity
                    key={unit.label}
                    style={[styles.pill, isActive && styles.pillActive]}
                    onPress={() => {
                      setSelectedUnit(unit);
                      setUseCustom(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                      {unit.label}
                    </Text>
                    <Text style={[styles.pillGrams, isActive && styles.pillGramsActive]}>
                      {unit.grams}g
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Custom grams input */}
          {has100g && (
            <View style={styles.customRow}>
              <TouchableOpacity
                style={[styles.customToggle, useCustom && styles.customToggleActive]}
                onPress={() => {
                  setUseCustom(true);
                  setSelectedUnit(null);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.customToggleText,
                    useCustom && styles.customToggleTextActive,
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
              <TextInput
                style={styles.customInput}
                value={customGrams}
                onChangeText={(t) => {
                  setCustomGrams(t);
                  setUseCustom(true);
                  setSelectedUnit(null);
                }}
                placeholder="grams"
                placeholderTextColor={Colors.text.muted}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <Text style={styles.customUnit}>g</Text>
            </View>
          )}

          {/* Nutrition preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Nutrition</Text>
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: Colors.macro.calories }]}>
                Calories
              </Text>
              <Text style={styles.previewValue}>
                {Math.round(preview.calories)} kcal
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: Colors.macro.protein }]}>
                Protein
              </Text>
              <Text style={styles.previewValue}>
                {preview.protein_g.toFixed(1)}g
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: Colors.macro.carbs }]}>
                Carbs
              </Text>
              <Text style={styles.previewValue}>
                {preview.carbs_g.toFixed(1)}g
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: Colors.macro.fat }]}>
                Fat
              </Text>
              <Text style={styles.previewValue}>
                {preview.fat_g.toFixed(1)}g
              </Text>
            </View>
            {preview.fiber_g !== undefined && (
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: Colors.macro.fiber }]}>
                  Fibre
                </Text>
                <Text style={styles.previewValue}>
                  {preview.fiber_g.toFixed(1)}g
                </Text>
              </View>
            )}
          </View>

          {/* Add button */}
          <TouchableOpacity
            style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={!canAdd}
            activeOpacity={0.8}
          >
            <Text style={[styles.addButtonText, !canAdd && styles.addButtonTextDisabled]}>
              Add
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: Colors.bg.overlay,
  },
  sheet: {
    backgroundColor: Colors.bg.secondary,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.sm,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.text.muted,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  foodName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  servingInfo: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.md,
  },
  pillScroll: {
    marginBottom: Spacing.md,
    maxHeight: 44,
  },
  pillContainer: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  pillActive: {
    backgroundColor: Colors.brand.primary + '20',
    borderColor: Colors.brand.primary,
  },
  pillText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  pillTextActive: {
    color: Colors.brand.primary,
  },
  pillGrams: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  pillGramsActive: {
    color: Colors.brand.primary,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  customToggle: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  customToggleActive: {
    backgroundColor: Colors.brand.primary + '20',
    borderColor: Colors.brand.primary,
  },
  customToggleText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  customToggleTextActive: {
    color: Colors.brand.primary,
  },
  customInput: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  customUnit: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  previewCard: {
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.xs,
  },
  previewTitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  previewValue: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  addButton: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  addButtonDisabled: {
    backgroundColor: Colors.text.muted,
    opacity: 0.5,
  },
  addButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  addButtonTextDisabled: {
    color: Colors.text.secondary,
  },
});
