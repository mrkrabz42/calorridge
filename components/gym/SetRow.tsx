import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { ExerciseSet, SetType } from '../../types/gym';
import { Colors, Typography, Spacing, Radius } from '../../constants';

const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: '',
  warmup: 'W',
  drop_set: 'D',
  failure: 'F',
  rest_pause: 'RP',
};

interface Props {
  set: ExerciseSet;
  previousSet: ExerciseSet | null;
  onUpdate: (data: { weight_kg?: number | null; reps?: number | null; rpe?: number | null }) => void;
  onComplete: () => void;
  onDelete: () => void;
}

export function SetRow({ set, previousSet, onUpdate, onComplete, onDelete }: Props) {
  const isCompleted = set.is_completed;

  const [weightText, setWeightText] = useState(
    set.weight_kg != null ? String(set.weight_kg) : ''
  );
  const [repsText, setRepsText] = useState(
    set.reps != null ? String(set.reps) : ''
  );
  const [rpeText, setRpeText] = useState(
    set.rpe != null ? String(set.rpe) : ''
  );

  // Sync local state when the set prop changes (e.g. after completeSet updates the store)
  useEffect(() => {
    if (set.weight_kg != null) setWeightText(String(set.weight_kg));
    if (set.reps != null) setRepsText(String(set.reps));
    if (set.rpe != null) setRpeText(String(set.rpe));
  }, [set.weight_kg, set.reps, set.rpe]);

  const typeLabel = SET_TYPE_LABELS[set.set_type];

  const handleWeightBlur = () => {
    const val = weightText.trim() ? parseFloat(weightText) : null;
    onUpdate({ weight_kg: isNaN(val as number) ? null : val });
  };

  const handleRepsBlur = () => {
    const val = repsText.trim() ? parseInt(repsText, 10) : null;
    onUpdate({ reps: isNaN(val as number) ? null : val });
  };

  const handleRpeBlur = () => {
    const val = rpeText.trim() ? parseFloat(rpeText) : null;
    onUpdate({ rpe: isNaN(val as number) ? null : val });
  };

  const handleGo = () => {
    if (isCompleted) return;

    const weight = weightText.trim() ? parseFloat(weightText) : null;
    const reps = repsText.trim() ? parseInt(repsText, 10) : null;

    if (weight == null || isNaN(weight) || reps == null || isNaN(reps)) {
      Alert.alert('Missing data', 'Enter weight and reps first.');
      return;
    }

    // Save current values before completing
    const rpe = rpeText.trim() ? parseFloat(rpeText) : null;
    onUpdate({ weight_kg: weight, reps, rpe: isNaN(rpe as number) ? null : rpe });

    // Small delay to let the update propagate, then complete
    setTimeout(() => {
      onComplete();
    }, 50);
  };

  const handleDelete = () => {
    Alert.alert('Delete Set', 'Remove this set?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  // Build the "prev" label: "80kg x 8"
  const handlePrevTap = () => {
    if (isCompleted || !previousSet) return;
    if (previousSet.weight_kg != null) {
      setWeightText(String(previousSet.weight_kg));
    }
    if (previousSet.reps != null) {
      setRepsText(String(previousSet.reps));
    }
    onUpdate({
      weight_kg: previousSet.weight_kg ?? null,
      reps: previousSet.reps ?? null,
    });
  };

  const prevLabel =
    previousSet && previousSet.weight_kg != null && previousSet.reps != null
      ? `${previousSet.weight_kg}kg x ${previousSet.reps}`
      : '-';

  return (
    <View style={[styles.row, isCompleted && styles.rowCompleted]}>
      {/* Set number */}
      <View style={styles.setNumContainer}>
        <Text style={styles.setNum}>{set.set_number}</Text>
        {typeLabel !== '' && (
          <Text style={styles.setType}>{typeLabel}</Text>
        )}
      </View>

      {/* Previous set — tappable to auto-fill */}
      <TouchableOpacity
        style={styles.prevContainer}
        onPress={handlePrevTap}
        disabled={isCompleted || !previousSet}
        activeOpacity={0.6}
      >
        <Text
          style={[
            styles.prevText,
            previousSet && !isCompleted && styles.prevTextTappable,
          ]}
          numberOfLines={1}
        >
          {prevLabel}
        </Text>
      </TouchableOpacity>

      {/* Weight input */}
      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, isCompleted && styles.inputCompleted]}
          value={weightText}
          onChangeText={setWeightText}
          onBlur={handleWeightBlur}
          placeholder="-"
          placeholderTextColor={Colors.text.muted}
          keyboardType="decimal-pad"
          editable={!isCompleted}
          selectTextOnFocus
        />
        <Text style={styles.unitLabel}>kg</Text>
      </View>

      {/* Reps input */}
      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, isCompleted && styles.inputCompleted]}
          value={repsText}
          onChangeText={setRepsText}
          onBlur={handleRepsBlur}
          placeholder="-"
          placeholderTextColor={Colors.text.muted}
          keyboardType="number-pad"
          editable={!isCompleted}
          selectTextOnFocus
        />
      </View>

      {/* RPE input */}
      <View style={styles.rpeGroup}>
        <TextInput
          style={[styles.rpeInput, isCompleted && styles.inputCompleted]}
          value={rpeText}
          onChangeText={setRpeText}
          onBlur={handleRpeBlur}
          placeholder="-"
          placeholderTextColor={Colors.text.muted}
          keyboardType="decimal-pad"
          editable={!isCompleted}
          selectTextOnFocus
        />
      </View>

      {/* PR badge */}
      {set.is_pr && (
        <View style={styles.prBadge}>
          <Text style={styles.prText}>PR</Text>
        </View>
      )}

      {/* Go / Done button */}
      <TouchableOpacity
        style={[styles.completeBtn, isCompleted && styles.completeBtnDone]}
        onPress={handleGo}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnLabel, isCompleted && styles.btnLabelDone]}>
          {isCompleted ? 'Done' : 'Go'}
        </Text>
      </TouchableOpacity>

      {/* Delete button — always visible */}
      {!isCompleted && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={styles.deleteBtnText}>X</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    gap: 6,
    borderRadius: Radius.sm,
  },
  rowCompleted: {
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
  },
  setNumContainer: {
    width: 24,
    alignItems: 'center',
  },
  setNum: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  setType: {
    color: Colors.brand.accent,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  prevContainer: {
    width: 72,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  prevText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  prevTextTappable: {
    color: Colors.text.secondary,
    textDecorationLine: 'underline',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
    minWidth: 44,
  },
  inputCompleted: {
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    borderColor: Colors.brand.primary,
  },
  unitLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    width: 18,
  },
  rpeGroup: {
    width: 40,
  },
  rpeInput: {
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 4,
    paddingVertical: 6,
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  prBadge: {
    backgroundColor: Colors.status.warning,
    borderRadius: Radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  prText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  completeBtn: {
    width: 40,
    height: 30,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtnDone: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  btnLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  btnLabelDone: {
    color: Colors.text.inverse,
  },
  deleteBtn: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  deleteBtnText: {
    color: Colors.status.error,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
});
