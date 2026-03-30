import React, { useState } from 'react';
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
  isCompleted: boolean;
}

export function SetRow({ set, previousSet, onUpdate, onComplete, onDelete, isCompleted }: Props) {
  const [weightText, setWeightText] = useState(
    set.weight_kg != null ? String(set.weight_kg) : ''
  );
  const [repsText, setRepsText] = useState(
    set.reps != null ? String(set.reps) : ''
  );
  const [rpeText, setRpeText] = useState(
    set.rpe != null ? String(set.rpe) : ''
  );

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

  const handleLongPress = () => {
    Alert.alert('Delete Set', 'Remove this set?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  const prevPlaceholderW = previousSet?.weight_kg != null ? String(previousSet.weight_kg) : '-';
  const prevPlaceholderR = previousSet?.reps != null ? String(previousSet.reps) : '-';

  return (
    <TouchableOpacity
      activeOpacity={1}
      onLongPress={handleLongPress}
      style={[styles.row, isCompleted && styles.rowCompleted]}
    >
      {/* Set number */}
      <View style={styles.setNumContainer}>
        <Text style={styles.setNum}>{set.set_number}</Text>
        {typeLabel !== '' && (
          <Text style={styles.setType}>{typeLabel}</Text>
        )}
      </View>

      {/* Weight input */}
      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, isCompleted && styles.inputCompleted]}
          value={weightText}
          onChangeText={setWeightText}
          onBlur={handleWeightBlur}
          placeholder={prevPlaceholderW}
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
          placeholder={prevPlaceholderR}
          placeholderTextColor={Colors.text.muted}
          keyboardType="number-pad"
          editable={!isCompleted}
          selectTextOnFocus
        />
      </View>

      {/* RPE input (small) */}
      <View style={styles.rpeGroup}>
        <TextInput
          style={[styles.rpeInput, isCompleted && styles.inputCompleted]}
          value={rpeText}
          onChangeText={setRpeText}
          onBlur={handleRpeBlur}
          placeholder="RPE"
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

      {/* Complete button */}
      <TouchableOpacity
        style={[styles.completeBtn, isCompleted && styles.completeBtnDone]}
        onPress={onComplete}
        disabled={isCompleted}
      >
        <Text style={[styles.checkmark, isCompleted && styles.checkmarkDone]}>
          {isCompleted ? 'Done' : 'Go'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
    borderRadius: Radius.sm,
  },
  rowCompleted: {
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
  },
  setNumContainer: {
    width: 28,
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
    minWidth: 50,
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
    width: 48,
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
    width: 44,
    height: 32,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtnDone: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  checkmark: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  checkmarkDone: {
    color: Colors.text.inverse,
  },
});
