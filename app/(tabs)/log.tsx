import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useMealHistory } from '../../hooks/useMealHistory';
import { MealCard } from '../../components/meal/MealCard';
import { WorkoutCard } from '../../components/workout/WorkoutCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorBanner } from '../../components/shared/ErrorBanner';
import { Colors, Typography, Spacing } from '../../constants';
import { formatDate, getTodayDateString } from '../../utils/macroUtils';
import { router } from 'expo-router';
import { useWorkoutsStore } from '../../store/workoutsStore';
import { useMealsStore } from '../../store/mealsStore';
import { usePlateBuildStore } from '../../store/plateBuildStore';
import { copyService } from '../../services/copyService';
import { MealType } from '../../types/meal';

export default function LogScreen() {
  const { grouped, isLoading, isRefreshing, hasMore, error, loadMore, refresh } =
    useMealHistory();
  const { todayWorkouts } = useWorkoutsStore();
  const { fetchTodayMeals } = useMealsStore();

  const handleCopyMeal = useCallback(async (mealId: string, mealType: string, foodName: string) => {
    try {
      const plateItems = await copyService.copyMealToPlate(mealId);
      const store = usePlateBuildStore.getState();
      store.clearPlate();
      store.loadItems(plateItems, (mealType as MealType) ?? undefined, foodName);
      router.push('/meal/log');
    } catch {
      Alert.alert('Error', 'Failed to copy meal.');
    }
  }, []);

  const handleCopyDay = useCallback(async (sourceDate: string) => {
    try {
      const today = getTodayDateString();
      if (sourceDate === today) {
        Alert.alert('Same day', 'Cannot copy meals to the same day.');
        return;
      }
      await copyService.copyDayToDate(sourceDate, today);
      fetchTodayMeals();
      Alert.alert('Copied', `Meals from ${formatDate(sourceDate)} copied to today.`);
    } catch {
      Alert.alert('Error', 'Failed to copy day.');
    }
  }, [fetchTodayMeals]);

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={Colors.brand.primary} />
      </View>
    );
  };

  if (!isLoading && grouped.length === 0 && !error) {
    return (
      <EmptyState
        icon=""
        title="No meals logged yet"
        subtitle="Start by capturing your first meal"
        actionLabel="Log a Meal"
        onAction={() => router.push('/meal/capture')}
      />
    );
  }

  return (
    <View style={styles.root}>
      {error && <ErrorBanner message={error} onRetry={refresh} />}
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.date}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={Colors.brand.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => {
          const isToday = item.date === new Date().toISOString().split('T')[0];
          const workoutsForDay = isToday ? todayWorkouts : [];

          return (
            <View style={styles.group}>
              <View style={styles.dateRow}>
                <Text style={styles.dateHeader}>{formatDate(item.date)}</Text>
                {!isToday && (
                  <TouchableOpacity
                    style={styles.copyDayBtn}
                    onPress={() => handleCopyDay(item.date)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.copyDayText}>Copy Day</Text>
                  </TouchableOpacity>
                )}
              </View>
              {workoutsForDay.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
              {item.meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onCopy={(m) => handleCopyMeal(m.id, m.meal_type, m.food_name)}
                />
              ))}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.md },
  group: { marginBottom: Spacing.lg },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  dateHeader: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  copyDayBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '50',
  },
  copyDayText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  footer: { padding: Spacing.lg, alignItems: 'center' },
});
