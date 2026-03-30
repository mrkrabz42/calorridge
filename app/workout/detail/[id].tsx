import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../../constants';
import { EXERCISE_CATEGORIES } from '../../../constants/exercises';
import { Workout, ExerciseCategory } from '../../../types/workout';
import { workoutsService } from '../../../services/workoutsService';
import { useWorkoutsStore } from '../../../store/workoutsStore';
import { formatDate, formatTime } from '../../../utils/macroUtils';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const { deleteWorkout } = useWorkoutsStore();

  useEffect(() => {
    if (id) {
      workoutsService.getWorkoutById(id).then((w) => {
        setWorkout(w);
        setLoading(false);
      });
    }
  }, [id]);

  const handleDelete = async () => {
    if (!workout) return;
    try {
      await deleteWorkout(workout.id);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to delete workout.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.loadingText}>Workout not found</Text>
      </View>
    );
  }

  const catConfig = EXERCISE_CATEGORIES[workout.category as ExerciseCategory] ??
    EXERCISE_CATEGORIES.other;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>{catConfig.icon}</Text>
          <Text style={styles.name}>{workout.exercise_name}</Text>
          <View style={[styles.badge, { backgroundColor: catConfig.color + '20' }]}>
            <Text style={[styles.badgeText, { color: catConfig.color }]}>
              {catConfig.label}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{workout.duration_mins} min</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Calories Burned</Text>
            <Text style={[styles.statValue, { color: Colors.workout.burned }]}>
              {workout.calories_burned} kcal
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Date</Text>
            <Text style={styles.statValue}>{formatDate(workout.workout_date)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Logged at</Text>
            <Text style={styles.statValue}>{formatTime(workout.created_at)}</Text>
          </View>
        </View>

        {/* Notes */}
        {workout.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{workout.notes}</Text>
          </View>
        )}

        {/* Delete */}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDelete(true)}>
          <Text style={styles.deleteText}>Delete Workout</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmDialog
        visible={showDelete}
        title="Delete Workout"
        message="Are you sure you want to delete this workout?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.text.secondary, fontSize: Typography.sizes.base },
  content: { padding: Spacing.md, gap: Spacing.md },
  header: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  icon: { fontSize: 48 },
  name: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  badgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  statsCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  statLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
  },
  statValue: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.default,
  },
  notesCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  notesLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  notesText: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    lineHeight: 22,
  },
  deleteBtn: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.status.error + '15',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.status.error + '30',
  },
  deleteText: {
    color: Colors.status.error,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
});
