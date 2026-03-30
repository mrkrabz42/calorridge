import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMealsStore } from '../../store/mealsStore';
import { useDailyStats } from '../../hooks/useDailyStats';
import { CalorieRing } from '../../components/dashboard/CalorieRing';
import { MacroBar } from '../../components/dashboard/MacroBar';
import { MealCard } from '../../components/meal/MealCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { MEAL_TYPE_ORDER, MEAL_TYPES } from '../../constants/mealTypes';
import { Meal } from '../../types';
import { formatDate, getTodayDateString } from '../../utils/macroUtils';

export default function DashboardScreen() {
  const { fetchTodayMeals, isLoadingToday, todayMeals } = useMealsStore();
  const { nutrition, progress, goals } = useDailyStats();

  const onRefresh = useCallback(() => {
    fetchTodayMeals();
  }, [fetchTodayMeals]);

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
            refreshing={isLoadingToday}
            onRefresh={onRefresh}
            tintColor={Colors.brand.primary}
          />
        }
      >
        {/* Date header */}
        <Text style={styles.date}>{formatDate(getTodayDateString())}</Text>

        {/* Calorie ring */}
        <View style={styles.ringContainer}>
          <CalorieRing progress={progress.calories} size={210} />
        </View>

        {/* Macro bars */}
        <View style={styles.card}>
          <MacroBar
            label="Protein"
            unit="g"
            progress={progress.protein}
            color={Colors.macro.protein}
          />
          <MacroBar
            label="Carbs"
            unit="g"
            progress={progress.carbs}
            color={Colors.macro.carbs}
          />
          <MacroBar
            label="Fat"
            unit="g"
            progress={progress.fat}
            color={Colors.macro.fat}
          />
          <MacroBar
            label="Fiber"
            unit="g"
            progress={progress.fiber}
            color={Colors.macro.fiber}
          />
        </View>

        {/* Meals by type */}
        {todayMeals.length === 0 ? (
          <EmptyState
            icon="📸"
            title="No meals logged yet"
            subtitle="Tap the + button to photograph your first meal"
          />
        ) : (
          MEAL_TYPE_ORDER.filter((type) => mealsByType[type].length > 0).map((type) => {
            const config = MEAL_TYPES[type];
            return (
              <View key={type} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>{config.icon}</Text>
                  <Text style={styles.sectionTitle}>{config.label}</Text>
                  <Text style={styles.sectionCount}>
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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/meal/capture')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { flex: 1 },
  content: { paddingTop: Spacing.md },
  date: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  ringContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  sectionIcon: { fontSize: 18 },
  sectionTitle: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  sectionCount: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 32,
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
