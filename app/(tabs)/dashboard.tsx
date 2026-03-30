import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Pressable,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useMealsStore } from '../../store/mealsStore';
import { useWorkoutsStore } from '../../store/workoutsStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useDailyStats } from '../../hooks/useDailyStats';
import { CalorieRing } from '../../components/dashboard/CalorieRing';
import { MacroBar } from '../../components/dashboard/MacroBar';
import { MealCard } from '../../components/meal/MealCard';
import { WorkoutSummary } from '../../components/dashboard/WorkoutSummary';
import { ChallengeBanner } from '../../components/dashboard/ChallengeBanner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { MEAL_TYPE_ORDER, MEAL_TYPES } from '../../constants/mealTypes';
import { Meal } from '../../types';
import { formatDate, getTodayDateString } from '../../utils/macroUtils';
import { useAdaptiveStore } from '../../store/adaptiveStore';

export default function DashboardScreen() {
  const { fetchTodayMeals, isLoadingToday, todayMeals } = useMealsStore();
  const { fetchTodayWorkouts } = useWorkoutsStore();
  const { activeChallenge, challengeDays, fetchActiveChallenge, syncDay } = useChallengeStore();
  const { nutrition, progress, goals, todayBurned, todayWorkouts, netCalories } = useDailyStats();
  const { latestWeight, logWeighIn, fetchLatest } = useAdaptiveStore();

  const [weightInput, setWeightInput] = useState('');
  const [weightLogged, setWeightLogged] = useState(false);

  useEffect(() => {
    fetchLatest();
  }, []);

  // Check if today already has a weigh-in
  const todayStr = getTodayDateString();
  const todayHasWeight = latestWeight?.weigh_in_date === todayStr;

  const handleLogWeight = async () => {
    const value = parseFloat(weightInput);
    if (isNaN(value) || value < 20 || value > 300) return;
    await logWeighIn(todayStr, value);
    setWeightInput('');
    setWeightLogged(true);
  };

  const onRefresh = useCallback(() => {
    fetchTodayMeals();
    fetchTodayWorkouts();
    fetchActiveChallenge();
  }, [fetchTodayMeals, fetchTodayWorkouts, fetchActiveChallenge]);

  // Sync challenge day when data changes
  const syncChallengeIfActive = useCallback(() => {
    if (activeChallenge) {
      syncDay(
        getTodayDateString(),
        {
          calories: nutrition.total_calories,
          protein_g: nutrition.total_protein_g,
          carbs_g: nutrition.total_carbs_g,
          fat_g: nutrition.total_fat_g,
        },
        todayBurned
      );
    }
  }, [activeChallenge, nutrition, todayBurned, syncDay]);

  // Sync on data change
  React.useEffect(() => {
    syncChallengeIfActive();
  }, [nutrition.total_calories, todayBurned]);

  const mealsByType = MEAL_TYPE_ORDER.reduce(
    (acc, type) => {
      acc[type] = todayMeals.filter((m) => m.meal_type === type);
      return acc;
    },
    {} as Record<string, Meal[]>
  );

  const [showFabMenu, setShowFabMenu] = useState(false);

  const showAddOptions = () => {
    setShowFabMenu(!showFabMenu);
  };

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

        {/* Challenge banner */}
        {activeChallenge && (
          <ChallengeBanner challenge={activeChallenge} days={challengeDays} />
        )}

        {/* Quick weigh-in card */}
        {!todayHasWeight && !weightLogged && (
          <View style={styles.weighInCard}>
            <Text style={styles.weighInLabel}>Log weight</Text>
            <TextInput
              style={styles.weighInInput}
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder={latestWeight ? String(Number(latestWeight.weight_kg)) : '75.0'}
              placeholderTextColor={Colors.text.muted}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleLogWeight}
            />
            <Text style={styles.weighInUnit}>kg</Text>
            <TouchableOpacity style={styles.weighInBtn} onPress={handleLogWeight}>
              <Text style={styles.weighInBtnText}>Log</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Calorie ring — shows net calories */}
        <View style={styles.ringContainer}>
          <CalorieRing progress={progress.caloriesNet} size={210} />
          {todayBurned > 0 && (
            <View style={styles.netInfo}>
              <Text style={styles.netLabel}>
                Eaten {Math.round(nutrition.total_calories)} · Burned {todayBurned} · Net {Math.round(netCalories)}
              </Text>
            </View>
          )}
        </View>

        {/* Macro bars */}
        <View style={styles.card}>
          <MacroBar label="Protein" unit="g" progress={progress.protein} color={Colors.macro.protein} />
          <MacroBar label="Carbs" unit="g" progress={progress.carbs} color={Colors.macro.carbs} />
          <MacroBar label="Fat" unit="g" progress={progress.fat} color={Colors.macro.fat} />
          <MacroBar label="Fibre" unit="g" progress={progress.fiber} color={Colors.macro.fiber} />
        </View>

        {/* Workouts */}
        <WorkoutSummary workouts={todayWorkouts} totalBurned={todayBurned} />

        {/* Meals by type */}
        {todayMeals.length === 0 && todayWorkouts.length === 0 ? (
          <EmptyState
            icon=""
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

        {/* Quick actions */}
        {!activeChallenge && (
          <TouchableOpacity
            style={styles.challengePrompt}
            onPress={() => router.push('/challenge/create')}
            activeOpacity={0.8}
          >
            <Text style={styles.challengePromptIcon}>Target</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengePromptTitle}>Start a Challenge</Text>
              <Text style={styles.challengePromptSub}>Set a 30-day goal and track your progress</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB menu overlay */}
      {showFabMenu && (
        <Pressable style={styles.fabOverlay} onPress={() => setShowFabMenu(false)}>
          <View style={styles.fabMenu}>
            <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setShowFabMenu(false); router.push('/meal/capture'); }}>
              <Text style={styles.fabMenuIcon}>Photo</Text>
              <Text style={styles.fabMenuLabel}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setShowFabMenu(false); router.push('/meal/barcode'); }}>
              <Text style={styles.fabMenuIcon}>Scan</Text>
              <Text style={styles.fabMenuLabel}>Barcode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setShowFabMenu(false); router.push('/meal/search'); }}>
              <Text style={styles.fabMenuIcon}>Find</Text>
              <Text style={styles.fabMenuLabel}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setShowFabMenu(false); router.push('/meal/confirm'); }}>
              <Text style={styles.fabMenuIcon}>Edit</Text>
              <Text style={styles.fabMenuLabel}>Manual</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setShowFabMenu(false); router.push('/workout/log'); }}>
              <Text style={styles.fabMenuIcon}>Gym</Text>
              <Text style={styles.fabMenuLabel}>Workout</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={showAddOptions}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>{showFabMenu ? '✕' : '+'}</Text>
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
  netInfo: {
    marginTop: Spacing.sm,
  },
  netLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
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
  challengePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '30',
    borderStyle: 'dashed',
  },
  challengePromptIcon: { fontSize: 14, color: Colors.brand.primary, fontWeight: Typography.weights.bold },
  challengePromptTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  challengePromptSub: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
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
  fabMenuIcon: { fontSize: 11, color: Colors.brand.primary, fontWeight: Typography.weights.bold },
  fabMenuLabel: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  fab: {
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
  weighInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '40',
    gap: Spacing.xs,
  },
  weighInLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
  weighInInput: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  weighInUnit: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  weighInBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  weighInBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
