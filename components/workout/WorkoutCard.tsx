import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { EXERCISE_CATEGORIES } from '../../constants/exercises';
import { Workout } from '../../types/workout';
import { ExerciseCategory } from '../../types/workout';
import { formatTime } from '../../utils/macroUtils';

interface Props {
  workout: Workout;
}

export function WorkoutCard({ workout }: Props) {
  const catConfig = EXERCISE_CATEGORIES[workout.category as ExerciseCategory] ??
    EXERCISE_CATEGORIES.other;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/workout/detail/${workout.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{catConfig.icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{workout.exercise_name}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.categoryBadge, { backgroundColor: catConfig.color + '20' }]}>
            <Text style={[styles.categoryText, { color: catConfig.color }]}>
              {catConfig.label}
            </Text>
          </View>
          <Text style={styles.meta}>{workout.duration_mins} min</Text>
          <Text style={styles.time}>{formatTime(workout.created_at)}</Text>
        </View>
      </View>
      <View style={styles.calsContainer}>
        <Text style={styles.cals}>-{workout.calories_burned}</Text>
        <Text style={styles.calsLabel}>kcal</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  meta: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  time: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  calsContainer: {
    alignItems: 'flex-end',
  },
  cals: {
    color: Colors.workout.burned,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  calsLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
});
