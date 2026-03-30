import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useDailyStats } from '../../hooks/useDailyStats';
import { usePantryStore } from '../../store/pantryStore';
import { useMealsStore } from '../../store/mealsStore';
import { suggestionsService } from '../../services/suggestionsService';
import { mealsService } from '../../services/mealsService';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { MealType } from '../../types/meal';
import { MealSuggestion, SuggestMealsResponse } from '../../types/chat';
import { getTodayDateString } from '../../utils/macroUtils';

export default function SuggestionsScreen() {
  const { nutrition, goals, progress } = useDailyStats();
  const { getItemNames } = usePantryStore();
  const { addMealOptimistic, todayMeals } = useMealsStore();

  const [mealType, setMealType] = useState<MealType>('dinner');
  const [suggestions, setSuggestions] = useState<SuggestMealsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const remaining = {
    calories: Math.max(goals.calories - nutrition.total_calories, 0),
    protein_g: Math.max(goals.protein_g - nutrition.total_protein_g, 0),
    carbs_g: Math.max(goals.carbs_g - nutrition.total_carbs_g, 0),
    fat_g: Math.max(goals.fat_g - nutrition.total_fat_g, 0),
  };

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await suggestionsService.getSuggestions({
        todayMeals: todayMeals.map((m) => ({
          food_name: m.food_name,
          calories: m.calories,
          protein_g: m.protein_g,
          carbs_g: m.carbs_g,
          fat_g: m.fat_g,
        })),
        goals: {
          calories: goals.calories,
          protein_g: goals.protein_g,
          carbs_g: goals.carbs_g,
          fat_g: goals.fat_g,
          fiber_g: goals.fiber_g,
        },
        remaining,
        pantryItems: getItemNames(),
        mealType,
      });
      setSuggestions(result);
    } catch {
      setError('Failed to get suggestions. Check your API keys.');
    } finally {
      setLoading(false);
    }
  }, [todayMeals, goals, remaining, mealType, getItemNames]);

  const logSuggestion = async (suggestion: MealSuggestion) => {
    try {
      const meal = await mealsService.createMeal({
        meal_type: mealType,
        meal_date: getTodayDateString(),
        food_name: suggestion.name,
        calories: suggestion.macros.calories,
        protein_g: suggestion.macros.protein_g,
        carbs_g: suggestion.macros.carbs_g,
        fat_g: suggestion.macros.fat_g,
        fiber_g: suggestion.macros.fiber_g,
        food_items: suggestion.ingredients.map((ing) => ({
          name: ing,
          estimated_quantity: '',
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
        })),
      });
      addMealOptimistic(meal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Logged', `${suggestion.name} has been added to your meals.`);
    } catch {
      Alert.alert('Error', 'Failed to log meal.');
    }
  };

  const mealTypes: { key: MealType; label: string }[] = [
    { key: 'breakfast', label: 'Breakfast' },
    { key: 'lunch', label: 'Lunch' },
    { key: 'dinner', label: 'Dinner' },
    { key: 'snack', label: 'Snack' },
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={fetchSuggestions}
          tintColor={Colors.brand.primary}
        />
      }
    >
      {/* Header */}
      <Text style={styles.title}>What should I eat?</Text>

      {/* Meal type selector */}
      <View style={styles.typeRow}>
        {mealTypes.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.typeChip, mealType === t.key && styles.typeChipActive]}
            onPress={() => { setMealType(t.key); setSuggestions(null); }}
          >
            <Text style={[styles.typeText, mealType === t.key && styles.typeTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Remaining macros banner */}
      <View style={styles.remainingBanner}>
        <Text style={styles.remainingTitle}>You still need:</Text>
        <View style={styles.remainingRow}>
          <RemainingPill label="Cal" value={remaining.calories} color={Colors.macro.calories} />
          <RemainingPill label="P" value={remaining.protein_g} unit="g" color={Colors.macro.protein} />
          <RemainingPill label="C" value={remaining.carbs_g} unit="g" color={Colors.macro.carbs} />
          <RemainingPill label="F" value={remaining.fat_g} unit="g" color={Colors.macro.fat} />
        </View>
      </View>

      {/* Get suggestions button */}
      {!suggestions && !loading && (
        <TouchableOpacity style={styles.generateBtn} onPress={fetchSuggestions}>
          <Text style={styles.generateIcon}>AI</Text>
          <Text style={styles.generateText}>Get AI Suggestions</Text>
        </TouchableOpacity>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.brand.primary} size="large" />
          <Text style={styles.loadingText}>CalorRidge is thinking...</Text>
        </View>
      )}

      {/* Error */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Suggestion cards */}
      {suggestions?.suggestions.map((s, i) => (
        <View key={i} style={styles.suggestionCard}>
          <View style={styles.suggestionHeader}>
            <Text style={styles.suggestionName}>{s.name}</Text>
            <Text style={styles.prepTime}>{s.prep_time_mins} min</Text>
          </View>
          <Text style={styles.suggestionDesc}>{s.description}</Text>

          {/* Macros */}
          <View style={styles.macroRow}>
            <MacroPill label="Cal" value={s.macros.calories} color={Colors.macro.calories} />
            <MacroPill label="P" value={s.macros.protein_g} unit="g" color={Colors.macro.protein} />
            <MacroPill label="C" value={s.macros.carbs_g} unit="g" color={Colors.macro.carbs} />
            <MacroPill label="F" value={s.macros.fat_g} unit="g" color={Colors.macro.fat} />
          </View>

          {/* Ingredients */}
          <Text style={styles.ingredientsLabel}>Ingredients:</Text>
          <Text style={styles.ingredientsList}>
            {s.ingredients.join(' · ')}
          </Text>

          {/* Pantry items used */}
          {s.uses_pantry_items?.length > 0 && (
            <Text style={styles.pantryNote}>
              Uses from pantry: {s.uses_pantry_items.join(', ')}
            </Text>
          )}

          {/* Log button */}
          <TouchableOpacity
            style={styles.logBtn}
            onPress={() => logSuggestion(s)}
            activeOpacity={0.8}
          >
            <Text style={styles.logBtnText}>Log This Meal</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Shopping tip */}
      {suggestions?.shopping_tip && (
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>Tip</Text>
          <Text style={styles.tipText}>{suggestions.shopping_tip}</Text>
        </View>
      )}

      {/* Regenerate */}
      {suggestions && !loading && (
        <TouchableOpacity style={styles.regenBtn} onPress={fetchSuggestions}>
          <Text style={styles.regenText}>Regenerate Suggestions</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function RemainingPill({ label, value, unit, color }: { label: string; value: number; unit?: string; color: string }) {
  return (
    <View style={styles.remainingPill}>
      <Text style={[styles.remainingValue, { color }]}>{Math.round(value)}{unit ?? ''}</Text>
      <Text style={styles.remainingLabel}>{label}</Text>
    </View>
  );
}

function MacroPill({ label, value, unit, color }: { label: string; value: number; unit?: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color + '40' }]}>
      <Text style={[styles.pillValue, { color }]}>{Math.round(value)}{unit ?? ''}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: { color: Colors.text.primary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  typeRow: { flexDirection: 'row', gap: Spacing.sm },
  typeChip: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md,
    backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.default, alignItems: 'center',
  },
  typeChipActive: { backgroundColor: Colors.brand.primary + '20', borderColor: Colors.brand.primary },
  typeText: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  typeTextActive: { color: Colors.brand.primary },
  remainingBanner: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: Spacing.md,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border.default,
  },
  remainingTitle: { color: Colors.text.secondary, fontSize: Typography.sizes.sm },
  remainingRow: { flexDirection: 'row', justifyContent: 'space-around' },
  remainingPill: { alignItems: 'center', gap: 2 },
  remainingValue: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  remainingLabel: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.brand.primary,
  },
  generateIcon: { fontSize: 14, color: Colors.text.inverse, fontWeight: Typography.weights.bold },
  generateText: { color: Colors.text.inverse, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
  loadingContainer: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  loadingText: { color: Colors.text.secondary, fontSize: Typography.sizes.sm },
  error: { color: Colors.status.error, fontSize: Typography.sizes.sm, textAlign: 'center' },
  suggestionCard: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: Spacing.md,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border.default,
  },
  suggestionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  suggestionName: { flex: 1, color: Colors.text.primary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
  prepTime: {
    color: Colors.text.muted, fontSize: Typography.sizes.xs,
    backgroundColor: Colors.bg.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm,
  },
  suggestionDesc: { color: Colors.text.secondary, fontSize: Typography.sizes.sm },
  macroRow: { flexDirection: 'row', gap: Spacing.sm },
  pill: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, gap: 1 },
  pillValue: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  pillLabel: { color: Colors.text.muted, fontSize: 9 },
  ingredientsLabel: { color: Colors.text.secondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium },
  ingredientsList: { color: Colors.text.muted, fontSize: Typography.sizes.sm },
  pantryNote: { color: Colors.brand.primary, fontSize: Typography.sizes.xs, fontStyle: 'italic' },
  logBtn: {
    paddingVertical: Spacing.sm, borderRadius: Radius.md,
    backgroundColor: Colors.brand.primary + '15', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.brand.primary + '40',
  },
  logBtnText: { color: Colors.brand.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  tipCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.status.info + '15', borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.status.info + '30',
  },
  tipIcon: { fontSize: 14, color: Colors.status.info, fontWeight: Typography.weights.bold },
  tipText: { flex: 1, color: Colors.text.primary, fontSize: Typography.sizes.sm },
  regenBtn: {
    padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border.default, borderStyle: 'dashed',
  },
  regenText: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
});
