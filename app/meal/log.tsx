import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlateBuildStore, PlateItem } from '../../store/plateBuildStore';
import { useMealsStore } from '../../store/mealsStore';
import { useSavedMealsStore } from '../../store/savedMealsStore';
import { mealsService } from '../../services/mealsService';
import { foodDiaryService } from '../../services/foodDiaryService';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { MEAL_TYPE_ORDER, MEAL_TYPES } from '../../constants/mealTypes';
import { MealType } from '../../types';
import { getTodayDateString } from '../../utils/macroUtils';

function PlateItemRow({
  item,
  onRemove,
  onUpdateServings,
}: {
  item: PlateItem;
  onRemove: () => void;
  onUpdateServings: (servings: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [servingsText, setServingsText] = useState(String(item.servings));

  const totalCal = Math.round(item.calories_per_serving * item.servings);
  const totalP = Math.round(item.protein_per_serving * item.servings * 10) / 10;
  const totalC = Math.round(item.carbs_per_serving * item.servings * 10) / 10;
  const totalF = Math.round(item.fat_per_serving * item.servings * 10) / 10;

  const commitServings = () => {
    const val = parseFloat(servingsText);
    if (!isNaN(val) && val > 0) {
      onUpdateServings(val);
    } else {
      setServingsText(String(item.servings));
    }
    setEditing(false);
  };

  return (
    <View style={rowStyles.container}>
      <TouchableOpacity
        style={rowStyles.mainArea}
        onPress={() => setEditing(!editing)}
        activeOpacity={0.7}
      >
        <View style={rowStyles.info}>
          <Text style={rowStyles.name} numberOfLines={1}>
            {item.food_name}
          </Text>
          <Text style={rowStyles.servingInfo}>
            {item.servings} x {item.serving_size}
          </Text>
        </View>
        <View style={rowStyles.macros}>
          <Text style={rowStyles.cal}>{totalCal} kcal</Text>
          <Text style={rowStyles.macroDetail}>
            P {totalP}g  C {totalC}g  F {totalF}g
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={rowStyles.deleteBtn} onPress={onRemove}>
        <Text style={rowStyles.deleteText}>X</Text>
      </TouchableOpacity>
      {editing && (
        <View style={rowStyles.editRow}>
          <Text style={rowStyles.editLabel}>Servings</Text>
          <TouchableOpacity
            style={rowStyles.stepBtn}
            onPress={() => {
              const next = Math.max(0.5, item.servings - 0.5);
              onUpdateServings(next);
              setServingsText(String(next));
            }}
          >
            <Text style={rowStyles.stepText}>-</Text>
          </TouchableOpacity>
          <TextInput
            style={rowStyles.servingsInput}
            value={servingsText}
            onChangeText={setServingsText}
            onBlur={commitServings}
            onSubmitEditing={commitServings}
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectTextOnFocus
          />
          <TouchableOpacity
            style={rowStyles.stepBtn}
            onPress={() => {
              const next = item.servings + 0.5;
              onUpdateServings(next);
              setServingsText(String(next));
            }}
          >
            <Text style={rowStyles.stepText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  mainArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  servingInfo: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  macros: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  cal: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  macroDetail: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  deleteBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.status.error + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: Colors.status.error,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border.default,
    paddingTop: Spacing.sm,
  },
  editLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    marginRight: Spacing.xs,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand.primary + '25',
    borderWidth: 1,
    borderColor: Colors.brand.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  servingsInput: {
    width: 60,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
});

export default function PlateBuilderScreen() {
  const insets = useSafeAreaInsets();
  const {
    items,
    mealType,
    mealName,
    setMealType,
    setMealName,
    removeItem,
    updateServings,
    clearPlate,
    getTotals,
  } = usePlateBuildStore();

  const addMealOptimistic = useMealsStore((s) => s.addMealOptimistic);
  const saveMeal = useSavedMealsStore((s) => s.saveMeal);

  const [saveToFavourites, setSaveToFavourites] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  const totals = getTotals();
  const hasItems = items.length > 0;

  const handleLogMeal = async () => {
    if (!hasItems) return;
    setIsLogging(true);

    try {
      const today = getTodayDateString();
      const foodName = mealName.trim() || items.map((i) => i.food_name).join(', ');

      // 1. Create meal in meals table
      const meal = await mealsService.createMeal({
        meal_type: mealType,
        meal_date: today,
        food_name: foodName,
        calories: totals.calories,
        protein_g: totals.protein_g,
        carbs_g: totals.carbs_g,
        fat_g: totals.fat_g,
        fiber_g: totals.fiber_g,
        food_items: items.map((i) => ({
          name: i.food_name,
          estimated_quantity: `${i.servings} x ${i.serving_size}`,
          calories: Math.round(i.calories_per_serving * i.servings),
          protein_g: Math.round(i.protein_per_serving * i.servings * 10) / 10,
          carbs_g: Math.round(i.carbs_per_serving * i.servings * 10) / 10,
          fat_g: Math.round(i.fat_per_serving * i.servings * 10) / 10,
        })),
      });

      // 2. Create food_log_entries
      await foodDiaryService.createFoodLogEntries(
        meal.id,
        items.map((i) => ({
          food_name: i.food_name,
          brand: i.brand,
          servings: i.servings,
          serving_size: i.serving_size,
          calories: Math.round(i.calories_per_serving * i.servings),
          protein_g: Math.round(i.protein_per_serving * i.servings * 10) / 10,
          carbs_g: Math.round(i.carbs_per_serving * i.servings * 10) / 10,
          fat_g: Math.round(i.fat_per_serving * i.servings * 10) / 10,
          fiber_g: i.fiber_per_serving ? Math.round(i.fiber_per_serving * i.servings * 10) / 10 : undefined,
          source: i.source,
        }))
      );

      // 3. Increment use counts for custom foods
      for (const item of items) {
        if (item.source === 'custom' && item.source_id) {
          foodDiaryService.incrementUseCount(item.source_id).catch(() => {});
        }
      }

      // 4. Save to favourites if toggled
      if (saveToFavourites && foodName) {
        try {
          await saveMeal({
            name: foodName,
            meal_type: mealType,
            calories: totals.calories,
            protein_g: totals.protein_g,
            carbs_g: totals.carbs_g,
            fat_g: totals.fat_g,
            fiber_g: totals.fiber_g,
          });
        } catch {
          // non-critical
        }
      }

      // 5. Add to local store
      addMealOptimistic(meal);

      // 6. Clear and navigate
      clearPlate();
      if (router.canDismiss()) {
        router.dismissAll();
      } else {
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to log meal. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Meal type chips */}
        <View style={styles.mealTypeRow}>
          {MEAL_TYPE_ORDER.map((type) => {
            const config = MEAL_TYPES[type];
            const isActive = mealType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.mealTypeChip,
                  isActive && {
                    backgroundColor: config.color + '25',
                    borderColor: config.color,
                  },
                ]}
                onPress={() => setMealType(type)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    isActive && { color: config.color },
                  ]}
                >
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Running totals card */}
        <View style={styles.totalsCard}>
          <View style={styles.totalMain}>
            <Text style={styles.totalCalValue}>{totals.calories}</Text>
            <Text style={styles.totalCalLabel}>kcal</Text>
          </View>
          <View style={styles.totalMacros}>
            <View style={styles.totalMacroCol}>
              <Text style={[styles.totalMacroValue, { color: Colors.macro.protein }]}>
                {totals.protein_g.toFixed(1)}g
              </Text>
              <Text style={styles.totalMacroLabel}>Protein</Text>
            </View>
            <View style={styles.totalMacroCol}>
              <Text style={[styles.totalMacroValue, { color: Colors.macro.carbs }]}>
                {totals.carbs_g.toFixed(1)}g
              </Text>
              <Text style={styles.totalMacroLabel}>Carbs</Text>
            </View>
            <View style={styles.totalMacroCol}>
              <Text style={[styles.totalMacroValue, { color: Colors.macro.fat }]}>
                {totals.fat_g.toFixed(1)}g
              </Text>
              <Text style={styles.totalMacroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Items list */}
        {!hasItems ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap below to add your first food item
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {items.map((item) => (
              <PlateItemRow
                key={item.id}
                item={item}
                onRemove={() => removeItem(item.id)}
                onUpdateServings={(s) => updateServings(item.id, s)}
              />
            ))}
          </View>
        )}

        {/* Add Food button */}
        <TouchableOpacity
          style={styles.addFoodBtn}
          onPress={() => router.push('/meal/add-food')}
          activeOpacity={0.8}
        >
          <Text style={styles.addFoodBtnText}>+ Add Food</Text>
        </TouchableOpacity>

        {/* Meal name input */}
        <View style={styles.section}>
          <Text style={styles.label}>Meal name (optional)</Text>
          <TextInput
            style={styles.nameInput}
            value={mealName}
            onChangeText={setMealName}
            placeholder="e.g. Post-workout shake"
            placeholderTextColor={Colors.text.muted}
          />
        </View>

        {/* Save to favourites toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Save to favourites</Text>
          <Switch
            value={saveToFavourites}
            onValueChange={setSaveToFavourites}
            trackColor={{ false: Colors.border.default, true: Colors.brand.primary + '60' }}
            thumbColor={saveToFavourites ? Colors.brand.primary : Colors.text.muted}
          />
        </View>

        {/* Log Meal button */}
        <TouchableOpacity
          style={[styles.logBtn, !hasItems && styles.logBtnDisabled]}
          onPress={handleLogMeal}
          disabled={!hasItems || isLogging}
          activeOpacity={0.85}
        >
          {isLogging ? (
            <ActivityIndicator color={Colors.text.inverse} size="small" />
          ) : (
            <Text style={styles.logBtnText}>Log Meal</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  mealTypeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
  },
  mealTypeText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  totalsCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.md,
  },
  totalMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  totalCalValue: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
  },
  totalCalLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
  },
  totalMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalMacroCol: {
    alignItems: 'center',
    gap: 2,
  },
  totalMacroValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  totalMacroLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  emptySubtitle: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  itemsList: {
    gap: 0,
  },
  addFoodBtn: {
    backgroundColor: Colors.brand.primary + '20',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '50',
    borderStyle: 'dashed',
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  addFoodBtnText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.card,
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
  logBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  logBtnDisabled: {
    opacity: 0.4,
  },
  logBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
});
