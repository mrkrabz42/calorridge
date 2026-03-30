import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { Workout } from '../../types/workout';

interface Props {
  workouts: Workout[];
  totalBurned: number;
}

export function WorkoutSummary({ workouts, totalBurned }: Props) {
  if (workouts.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>Burn</Text>
        <Text style={styles.headerTitle}>Workouts</Text>
        <Text style={styles.headerBurned}>{totalBurned} kcal burned</Text>
      </View>
      {workouts.map((w) => (
        <TouchableOpacity
          key={w.id}
          style={styles.workoutRow}
          onPress={() => router.push(`/workout/detail/${w.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutName}>{w.exercise_name}</Text>
            <Text style={styles.workoutMeta}>
              {w.duration_mins} min
            </Text>
          </View>
          <Text style={styles.workoutCals}>-{w.calories_burned}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  headerIcon: { fontSize: 12, color: Colors.workout.burned, fontWeight: Typography.weights.bold },
  headerTitle: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  headerBurned: {
    color: Colors.workout.burned,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  workoutInfo: {
    flex: 1,
    gap: 2,
  },
  workoutName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  workoutMeta: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  workoutCals: {
    color: Colors.workout.burned,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
