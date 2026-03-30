import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SessionExerciseWithSets, ExerciseSet } from '../../types/gym';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { SetRow } from './SetRow';

const REST_OPTIONS = [30, 60, 90, 120, 180];

interface Props {
  exercise: SessionExerciseWithSets;
  onAddSet: (workoutExerciseId: string) => void;
  onUpdateSet: (setId: string, data: { weight_kg?: number | null; reps?: number | null; rpe?: number | null }) => void;
  onCompleteSet: (setId: string, exerciseId: string) => void;
  onDeleteSet: (setId: string) => void;
  onRemoveExercise: (workoutExerciseId: string) => void;
  onRestTimerStart?: (seconds: number) => void;
}

function formatBestPrevious(previousSets: ExerciseSet[][] | null): string {
  if (!previousSets || previousSets.length === 0) return 'No previous data';
  const lastSession = previousSets[0];
  if (!lastSession || lastSession.length === 0) return 'No previous data';

  // Find the set with the highest volume
  let best: ExerciseSet | null = null;
  let bestVol = 0;
  for (const s of lastSession) {
    const vol = (s.weight_kg ?? 0) * (s.reps ?? 0);
    if (vol > bestVol) {
      bestVol = vol;
      best = s;
    }
  }
  if (!best) return 'No previous data';
  return `${best.weight_kg ?? 0}kg x ${best.reps ?? 0} reps`;
}

export function ExerciseCard({
  exercise,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  onDeleteSet,
  onRemoveExercise,
  onRestTimerStart,
}: Props) {
  const [selectedRest, setSelectedRest] = useState(exercise.rest_secs || 90);

  const handleRemove = () => {
    Alert.alert(
      'Remove Exercise',
      `Remove ${exercise.exercise?.name ?? 'this exercise'} from the session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemoveExercise(exercise.id),
        },
      ]
    );
  };

  const categoryLabel = exercise.exercise?.category
    ? exercise.exercise.category.replace('_', ' ')
    : '';

  const previousLabel = formatBestPrevious(exercise.previousSets);

  // Get the previous session's sets for per-set placeholders
  const prevSets = exercise.previousSets?.[0] ?? [];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.exerciseName}>{exercise.exercise?.name ?? 'Unknown'}</Text>
          {categoryLabel !== '' && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{categoryLabel}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleRemove} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.removeBtn}>X</Text>
        </TouchableOpacity>
      </View>

      {/* Previous best */}
      <Text style={styles.previousLabel}>Previous: {previousLabel}</Text>

      {/* Column headers */}
      <View style={styles.columnHeaders}>
        <Text style={[styles.colHeader, { width: 28 }]}>Set</Text>
        <Text style={[styles.colHeader, { flex: 1 }]}>Weight</Text>
        <Text style={[styles.colHeader, { flex: 1 }]}>Reps</Text>
        <Text style={[styles.colHeader, { width: 48 }]}>RPE</Text>
        <Text style={[styles.colHeader, { width: 44, textAlign: 'center' }]}> </Text>
      </View>

      {/* Sets */}
      {exercise.sets.map((s, index) => (
        <SetRow
          key={s.id}
          set={s}
          previousSet={prevSets[index] ?? null}
          onUpdate={(data) => onUpdateSet(s.id, data)}
          onComplete={() => {
            onCompleteSet(s.id, exercise.exercise_id);
            if (onRestTimerStart) {
              onRestTimerStart(selectedRest);
            }
          }}
          onDelete={() => onDeleteSet(s.id)}
          isCompleted={s.is_completed}
        />
      ))}

      {/* Add Set button */}
      <TouchableOpacity
        style={styles.addSetBtn}
        onPress={() => onAddSet(exercise.id)}
        activeOpacity={0.7}
      >
        <Text style={styles.addSetText}>+ Add Set</Text>
      </TouchableOpacity>

      {/* Rest timer chips */}
      <View style={styles.restRow}>
        <Text style={styles.restLabel}>Rest:</Text>
        {REST_OPTIONS.map((secs) => (
          <TouchableOpacity
            key={secs}
            style={[
              styles.restChip,
              selectedRest === secs && styles.restChipActive,
            ]}
            onPress={() => setSelectedRest(secs)}
          >
            <Text
              style={[
                styles.restChipText,
                selectedRest === secs && styles.restChipTextActive,
              ]}
            >
              {secs >= 60 ? `${secs / 60}m` : `${secs}s`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  exerciseName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  categoryBadge: {
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  categoryText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    textTransform: 'capitalize',
  },
  removeBtn: {
    color: Colors.status.error,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    paddingHorizontal: Spacing.xs,
  },
  previousLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.xs,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
    marginBottom: 2,
  },
  colHeader: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  addSetBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderStyle: 'dashed',
    marginTop: Spacing.xs,
  },
  addSetText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  restLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  restChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  restChipActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  restChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  restChipTextActive: {
    color: Colors.text.inverse,
  },
});
