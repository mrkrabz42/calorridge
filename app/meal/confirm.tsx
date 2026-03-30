import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mealsService } from '../../services/mealsService';
import { useMealsStore } from '../../store/mealsStore';
import { MealTypeSelector } from '../../components/meal/MealTypeSelector';
import { NutrientRow } from '../../components/meal/NutrientRow';
import { ErrorBanner } from '../../components/shared/ErrorBanner';
import { LoadingOverlay } from '../../components/shared/LoadingOverlay';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { AnalysisResult, MealType } from '../../types';
import { getTodayDateString } from '../../utils/macroUtils';
import { LOW_CONFIDENCE_THRESHOLD } from '../../constants/macros';

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{
    result: string;
    photoUrl: string;
    photoUri: string;
    mealType: string;
    notes: string;
    manual: string;
  }>();

  const insets = useSafeAreaInsets();
  const addMealOptimistic = useMealsStore((s) => s.addMealOptimistic);
  const isManual = params.manual === '1';

  const parsedResult: AnalysisResult | null = params.result ? JSON.parse(params.result) : null;

  const [mealType, setMealType] = useState<MealType>(
    (params.mealType as MealType) ?? 'lunch'
  );
  const [foodName, setFoodName] = useState(parsedResult?.meal_summary ?? '');
  const [calories, setCalories] = useState(parsedResult?.totals.calories?.toString() ?? '0');
  const [protein, setProtein] = useState(parsedResult?.totals.protein_g?.toString() ?? '0');
  const [carbs, setCarbs] = useState(parsedResult?.totals.carbs_g?.toString() ?? '0');
  const [fat, setFat] = useState(parsedResult?.totals.fat_g?.toString() ?? '0');
  const [fiber, setFiber] = useState(parsedResult?.totals.fiber_g?.toString() ?? '0');
  const [sugar, setSugar] = useState(parsedResult?.totals.sugar_g?.toString() ?? '0');
  const [sodium, setSodium] = useState(parsedResult?.totals.sodium_mg?.toString() ?? '0');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isLowConfidence =
    parsedResult && parsedResult.confidence < LOW_CONFIDENCE_THRESHOLD;

  const handleSave = async () => {
    if (!foodName.trim()) {
      Alert.alert('Required', 'Please enter a meal name.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const meal = await mealsService.createMeal({
        meal_type: mealType,
        meal_date: getTodayDateString(),
        notes: params.notes || undefined,
        photo_url: params.photoUrl || undefined,
        food_name: foodName,
        food_items: parsedResult?.food_items,
        confidence: parsedResult?.confidence,
        calories: parseInt(calories) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
        fiber_g: parseFloat(fiber) || undefined,
        sugar_g: parseFloat(sugar) || undefined,
        sodium_mg: parseFloat(sodium) || undefined,
      });

      addMealOptimistic(meal);
      router.dismissAll();
    } catch (err) {
      setSaveError((err as Error).message ?? 'Failed to save meal. Please retry.');
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {/* Photo */}
        {params.photoUri ? (
          <Image source={{ uri: params.photoUri }} style={styles.photo} resizeMode="cover" />
        ) : null}

        {/* Low confidence banner */}
        {isLowConfidence && (
          <ErrorBanner
            message="Low confidence estimate — please verify and edit values below."
            type="warning"
          />
        )}

        {saveError && (
          <ErrorBanner message={saveError} onRetry={handleSave} />
        )}

        {isManual && (
          <ErrorBanner
            message="AI analysis failed. Please enter nutritional information manually."
            type="warning"
          />
        )}

        {/* Meal type */}
        <View style={styles.section}>
          <Text style={styles.label}>Meal Type</Text>
          <MealTypeSelector value={mealType} onChange={setMealType} />
        </View>

        {/* Food name */}
        <View style={styles.section}>
          <Text style={styles.label}>Meal Name</Text>
          <TextInput
            style={styles.nameInput}
            value={foodName}
            onChangeText={setFoodName}
            placeholder="e.g. Grilled chicken with rice"
            placeholderTextColor={Colors.text.muted}
            returnKeyType="done"
          />
        </View>

        {/* Macros */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nutritional Information</Text>
          <Text style={styles.cardHint}>Tap any value to edit</Text>

          <MacroInput
            label="Calories"
            value={calories}
            unit="kcal"
            onChange={setCalories}
            color={Colors.macro.calories}
          />
          <MacroInput
            label="Protein"
            value={protein}
            unit="g"
            onChange={setProtein}
            color={Colors.macro.protein}
          />
          <MacroInput
            label="Carbohydrates"
            value={carbs}
            unit="g"
            onChange={setCarbs}
            color={Colors.macro.carbs}
          />
          <MacroInput
            label="Fat"
            value={fat}
            unit="g"
            onChange={setFat}
            color={Colors.macro.fat}
          />
          <MacroInput
            label="Fiber"
            value={fiber}
            unit="g"
            onChange={setFiber}
            color={Colors.macro.fiber}
          />
          <MacroInput label="Sugar" value={sugar} unit="g" onChange={setSugar} />
          <MacroInput label="Sodium" value={sodium} unit="mg" onChange={setSodium} />
        </View>

        {/* Food items breakdown */}
        {parsedResult?.food_items && parsedResult.food_items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ingredients Detected</Text>
            {parsedResult.food_items.map((item, i) => (
              <View key={i} style={styles.foodItem}>
                <Text style={styles.foodItemName}>{item.name}</Text>
                <Text style={styles.foodItemQty}>{item.estimated_quantity}</Text>
                <Text style={styles.foodItemCal}>{item.calories} kcal</Text>
              </View>
            ))}
          </View>
        )}

        {/* Confidence */}
        {parsedResult?.confidence !== undefined && (
          <Text style={styles.confidence}>
            AI Confidence: {Math.round(parsedResult.confidence * 100)}% — {parsedResult.confidence_reason}
          </Text>
        )}
      </ScrollView>

      {/* Save button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveBtnText}>Save Meal</Text>
        </TouchableOpacity>
      </View>

      <LoadingOverlay visible={isSaving} message="Saving meal..." />
    </KeyboardAvoidingView>
  );
}

function MacroInput({
  label,
  value,
  unit,
  onChange,
  color = Colors.text.secondary,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (v: string) => void;
  color?: string;
}) {
  return (
    <View style={macroStyles.row}>
      <Text style={macroStyles.label}>{label}</Text>
      <View style={macroStyles.inputContainer}>
        <TextInput
          style={[macroStyles.input, { color }]}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Text style={macroStyles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.subtle,
  },
  label: { color: Colors.text.secondary, fontSize: Typography.sizes.base },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  input: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    textAlign: 'right',
    minWidth: 60,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Colors.bg.primary,
    borderRadius: 6,
  },
  unit: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    width: 30,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { gap: Spacing.md },
  photo: {
    width: '100%',
    height: 240,
  },
  section: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  label: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  nameInput: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: 4,
  },
  cardHint: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.sm,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.subtle,
  },
  foodItemName: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
  },
  foodItemQty: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  foodItemCal: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    width: 60,
    textAlign: 'right',
  },
  confidence: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: Colors.bg.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  saveBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.full,
    padding: Spacing.md,
    alignItems: 'center',
  },
  saveBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
