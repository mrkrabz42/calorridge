import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSavedMealsStore } from '../../store/savedMealsStore';
import { useMealsStore } from '../../store/mealsStore';
import { MealCard } from '../../components/meal/MealCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { MEAL_TYPE_ORDER, MEAL_TYPES } from '../../constants/mealTypes';
import { SavedMeal, Meal, MealType } from '../../types';

export default function MealsScreen() {
  const { savedMeals, isLoading: savedLoading, fetchSavedMeals, logSavedMeal, deleteSavedMeal } =
    useSavedMealsStore();
  const { todayMeals, isLoadingToday, fetchTodayMeals, addMealOptimistic } = useMealsStore();

  const [showFabMenu, setShowFabMenu] = useState(false);
  const [mealTypePicker, setMealTypePicker] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedMeals();
  }, []);

  const onRefresh = useCallback(() => {
    fetchSavedMeals();
    fetchTodayMeals();
  }, [fetchSavedMeals, fetchTodayMeals]);

  const handleLogSaved = (savedMeal: SavedMeal) => {
    setMealTypePicker(savedMeal.id);
  };

  const confirmLogSaved = async (savedMealId: string, mealType: MealType) => {
    setMealTypePicker(null);
    try {
      const meal = await logSavedMeal(savedMealId, mealType);
      addMealOptimistic(meal);
    } catch (err) {
      Alert.alert('Error', (err as Error).message ?? 'Failed to log meal.');
    }
  };

  const handleDeleteSaved = (id: string, name: string) => {
    Alert.alert('Delete Saved Meal', `Remove "${name}" from your saved meals?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteSavedMeal(id).catch(() => {}),
      },
    ]);
  };

  const mealsByType = MEAL_TYPE_ORDER.reduce(
    (acc, type) => {
      acc[type] = todayMeals.filter((m) => m.meal_type === type);
      return acc;
    },
    {} as Record<string, Meal[]>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingToday || savedLoading}
            onRefresh={onRefresh}
            tintColor={Colors.brand.primary}
          />
        }
      >
        {/* Saved Meals Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Saved Meals</Text>
            <TouchableOpacity
              style={styles.addSavedBtn}
              onPress={() => router.push('/meal/quick-log?saveOnly=1')}
            >
              <Text style={styles.addSavedBtnText}>+ Save New</Text>
            </TouchableOpacity>
          </View>

          {savedMeals.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No saved meals yet. Save your frequently eaten meals for quick logging.
              </Text>
            </View>
          ) : (
            savedMeals.map((sm) => (
              <View key={sm.id}>
                <TouchableOpacity
                  style={styles.savedCard}
                  onPress={() => handleLogSaved(sm)}
                  onLongPress={() => handleDeleteSaved(sm.id, sm.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.savedCardLeft}>
                    <Text style={styles.savedName} numberOfLines={1}>{sm.name}</Text>
                    <View style={styles.savedMacros}>
                      <Text style={styles.savedCal}>{sm.calories} kcal</Text>
                      <Text style={styles.savedDot}> · </Text>
                      <Text style={[styles.savedMacro, { color: Colors.macro.protein }]}>
                        P {Number(sm.protein_g).toFixed(0)}g
                      </Text>
                      <Text style={styles.savedDot}> · </Text>
                      <Text style={[styles.savedMacro, { color: Colors.macro.carbs }]}>
                        C {Number(sm.carbs_g).toFixed(0)}g
                      </Text>
                      <Text style={styles.savedDot}> · </Text>
                      <Text style={[styles.savedMacro, { color: Colors.macro.fat }]}>
                        F {Number(sm.fat_g).toFixed(0)}g
                      </Text>
                    </View>
                  </View>
                  <View style={styles.savedCardRight}>
                    <Text style={styles.useCount}>{sm.use_count}x</Text>
                  </View>
                </TouchableOpacity>

                {/* Meal type picker inline */}
                {mealTypePicker === sm.id && (
                  <View style={styles.mealTypePicker}>
                    <Text style={styles.pickerLabel}>Log as:</Text>
                    {MEAL_TYPE_ORDER.map((type) => {
                      const config = MEAL_TYPES[type];
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[styles.pickerChip, { borderColor: config.color }]}
                          onPress={() => confirmLogSaved(sm.id, type)}
                        >
                          <Text style={[styles.pickerChipText, { color: config.color }]}>
                            {config.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={styles.pickerCancel}
                      onPress={() => setMealTypePicker(null)}
                    >
                      <Text style={styles.pickerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Today's Meals Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>

          {todayMeals.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No meals logged today. Tap + to add your first meal.
              </Text>
            </View>
          ) : (
            MEAL_TYPE_ORDER.filter((type) => mealsByType[type].length > 0).map((type) => {
              const config = MEAL_TYPES[type];
              return (
                <View key={type} style={styles.mealGroup}>
                  <View style={styles.mealGroupHeader}>
                    <Text style={[styles.mealGroupLabel, { color: config.color }]}>
                      {config.label}
                    </Text>
                    <Text style={styles.mealGroupCal}>
                      {mealsByType[type].reduce((s, m) => s + m.calories, 0)} kcal
                    </Text>
                  </View>
                  {mealsByType[type].map((meal) => (
                    <MealCard key={meal.id} meal={meal} />
                  ))}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB menu overlay */}
      {showFabMenu && (
        <Pressable style={styles.fabOverlay} onPress={() => setShowFabMenu(false)}>
          <View style={styles.fabMenu}>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                router.push('/meal/quick-log');
              }}
            >
              <Text style={styles.fabMenuIcon}>Edit</Text>
              <Text style={styles.fabMenuLabel}>Quick Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                router.push('/meal/search');
              }}
            >
              <Text style={styles.fabMenuIcon}>Find</Text>
              <Text style={styles.fabMenuLabel}>Search Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setShowFabMenu(false);
                router.push('/meal/confirm');
              }}
            >
              <Text style={styles.fabMenuIcon}>Form</Text>
              <Text style={styles.fabMenuLabel}>Full Entry</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowFabMenu(!showFabMenu)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>{showFabMenu ? 'X' : '+'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { flex: 1 },
  content: { paddingTop: Spacing.md },
  sectionContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  addSavedBtn: {
    backgroundColor: Colors.brand.primary + '20',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '40',
    marginBottom: Spacing.sm,
  },
  addSavedBtnText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  emptyCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  emptyText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  savedCardLeft: {
    flex: 1,
    gap: 4,
  },
  savedName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  savedMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  savedCal: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  savedDot: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  savedMacro: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  savedCardRight: {
    marginLeft: Spacing.sm,
    alignItems: 'center',
  },
  useCount: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  mealTypePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  pickerLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginRight: Spacing.xs,
  },
  pickerChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: Colors.bg.card,
  },
  pickerChipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  pickerCancel: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  pickerCancelText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  mealGroup: {
    marginBottom: Spacing.sm,
  },
  mealGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mealGroupLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  mealGroupCal: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: Spacing.lg,
    paddingBottom: 100,
  },
  fabMenu: {
    gap: Spacing.sm,
    alignItems: 'flex-end',
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bg.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  fabMenuIcon: {
    fontSize: 11,
    color: Colors.brand.primary,
    fontWeight: Typography.weights.bold,
  },
  fabMenuLabel: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    color: Colors.text.inverse,
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    marginTop: -2,
  },
});
