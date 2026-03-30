import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mealsService } from '../../services/mealsService';
import { useMealsStore } from '../../store/mealsStore';
import { useSavedMealsStore } from '../../store/savedMealsStore';
import { MealTypeSelector } from '../../components/meal/MealTypeSelector';
import { LoadingOverlay } from '../../components/shared/LoadingOverlay';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { MealType } from '../../types';
import { getTodayDateString } from '../../utils/macroUtils';

export default function QuickLogScreen() {
  const params = useLocalSearchParams<{ saveOnly?: string }>();
  const saveOnlyMode = params.saveOnly === '1';
  const insets = useSafeAreaInsets();
  const addMealOptimistic = useMealsStore((s) => s.addMealOptimistic);
  const { saveMeal } = useSavedMealsStore();

  const [mealType, setMealType] = useState<MealType>('lunch');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saveToFavourites, setSaveToFavourites] = useState(saveOnlyMode);
  const [isSaving, setIsSaving] = useState(false);

  const handleLog = async () => {
    if (!foodName.trim()) {
      Alert.alert('Required', 'Please enter a meal name.');
      return;
    }
    if (!calories.trim() || parseInt(calories) <= 0) {
      Alert.alert('Required', 'Please enter the calories.');
      return;
    }

    setIsSaving(true);
    try {
      const mealData = {
        name: foodName.trim(),
        meal_type: mealType,
        calories: parseInt(calories) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
      };

      // Save to favourites if toggled
      if (saveToFavourites) {
        await saveMeal(mealData);
      }

      // Log as a meal entry (unless saveOnly mode)
      if (!saveOnlyMode) {
        const meal = await mealsService.createMeal({
          meal_type: mealType,
          meal_date: getTodayDateString(),
          food_name: foodName.trim(),
          calories: parseInt(calories) || 0,
          protein_g: parseFloat(protein) || 0,
          carbs_g: parseFloat(carbs) || 0,
          fat_g: parseFloat(fat) || 0,
        });
        addMealOptimistic(meal);
      }

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/meals');
      }
    } catch (err) {
      Alert.alert('Error', (err as Error).message ?? 'Failed to save.');
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>
          {saveOnlyMode ? 'Save New Meal' : 'Quick Entry'}
        </Text>
        <Text style={styles.subtitle}>
          {saveOnlyMode
            ? 'Save a meal to your favourites for quick logging later.'
            : 'Log a meal quickly with basic nutritional information.'}
        </Text>

        {/* Meal type */}
        {!saveOnlyMode && (
          <View style={styles.section}>
            <Text style={styles.label}>Meal Type</Text>
            <MealTypeSelector value={mealType} onChange={setMealType} />
          </View>
        )}

        {/* Food name */}
        <View style={styles.section}>
          <Text style={styles.label}>Meal Name</Text>
          <TextInput
            style={styles.nameInput}
            value={foodName}
            onChangeText={setFoodName}
            placeholder="e.g. Chicken and rice"
            placeholderTextColor={Colors.text.muted}
            returnKeyType="next"
          />
        </View>

        {/* Calories (big) */}
        <View style={styles.section}>
          <Text style={styles.label}>Calories</Text>
          <View style={styles.calRow}>
            <TextInput
              style={styles.calInput}
              value={calories}
              onChangeText={setCalories}
              placeholder="0"
              placeholderTextColor={Colors.text.muted}
              keyboardType="number-pad"
              returnKeyType="next"
              selectTextOnFocus
            />
            <Text style={styles.calUnit}>kcal</Text>
          </View>
        </View>

        {/* Macros row */}
        <View style={styles.section}>
          <Text style={styles.label}>Macros</Text>
          <View style={styles.macroRow}>
            <MacroField
              label="Protein"
              value={protein}
              onChange={setProtein}
              color={Colors.macro.protein}
            />
            <MacroField
              label="Carbs"
              value={carbs}
              onChange={setCarbs}
              color={Colors.macro.carbs}
            />
            <MacroField
              label="Fat"
              value={fat}
              onChange={setFat}
              color={Colors.macro.fat}
            />
          </View>
        </View>

        {/* Save to favourites toggle */}
        {!saveOnlyMode && (
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Save to Favourites</Text>
              <Text style={styles.toggleHint}>Quick-log this meal again later</Text>
            </View>
            <Switch
              value={saveToFavourites}
              onValueChange={setSaveToFavourites}
              trackColor={{ false: Colors.border.default, true: Colors.brand.primary + '60' }}
              thumbColor={saveToFavourites ? Colors.brand.primary : Colors.text.muted}
            />
          </View>
        )}
      </ScrollView>

      {/* Save button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleLog}
          disabled={isSaving}
        >
          <Text style={styles.saveBtnText}>
            {saveOnlyMode ? 'Save to Favourites' : 'Log Meal'}
          </Text>
        </TouchableOpacity>
      </View>

      <LoadingOverlay visible={isSaving} message="Saving..." />
    </KeyboardAvoidingView>
  );
}

function MacroField({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  color: string;
}) {
  return (
    <View style={styles.macroField}>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
      <View style={styles.macroInputWrap}>
        <TextInput
          style={styles.macroInput}
          value={value}
          onChangeText={onChange}
          placeholder="0"
          placeholderTextColor={Colors.text.muted}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Text style={styles.macroUnit}>g</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { gap: Spacing.lg, paddingTop: Spacing.lg },
  heading: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    paddingHorizontal: Spacing.md,
  },
  subtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    paddingHorizontal: Spacing.md,
    marginTop: -Spacing.sm,
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
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  calInput: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.macro.calories + '40',
    padding: Spacing.md,
    color: Colors.macro.calories,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  calUnit: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  macroField: {
    flex: 1,
    gap: 4,
  },
  macroLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  macroInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing.sm,
  },
  macroInput: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  macroUnit: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.bg.card,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  toggleLabel: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  toggleHint: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
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
