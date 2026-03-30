import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useWorkoutsStore } from '../../store/workoutsStore';
import { useProfileStore } from '../../store/profileStore';
import { ExercisePicker } from '../../components/workout/ExercisePicker';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { Exercise } from '../../types/workout';
import { calculateCaloriesBurned, calculateCaloriesBurnedDefault } from '../../utils/tdeeUtils';
import { getTodayDateString } from '../../utils/macroUtils';

type Step = 'pick' | 'details';

export default function LogWorkoutScreen() {
  const { exercises, fetchExercises, addWorkout } = useWorkoutsStore();
  const { profile } = useProfileStore();

  const [step, setStep] = useState<Step>('pick');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('other');
  const [durationStr, setDurationStr] = useState('30');
  const [caloriesStr, setCaloriesStr] = useState('');
  const [notes, setNotes] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  // Auto-calculate calories when exercise or duration changes
  const autoCalories = useMemo(() => {
    const duration = parseInt(durationStr) || 0;
    if (!selectedExercise || duration === 0) return 0;

    const weightKg = profile?.weight_kg ? Number(profile.weight_kg) : null;
    const met = selectedExercise.met_value ? Number(selectedExercise.met_value) : null;
    const calsPerMin = selectedExercise.cals_per_min_default
      ? Number(selectedExercise.cals_per_min_default)
      : null;

    if (met && weightKg) {
      return calculateCaloriesBurned(met, weightKg, duration);
    } else if (calsPerMin) {
      return calculateCaloriesBurnedDefault(calsPerMin, duration);
    }
    return 0;
  }, [selectedExercise, durationStr, profile]);

  useEffect(() => {
    if (autoCalories > 0 && !caloriesStr) {
      setCaloriesStr(autoCalories.toString());
    }
  }, [autoCalories]);

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setCustomName('');
    setShowCustomForm(false);
    setStep('details');
    // Recalculate with new exercise
    setCaloriesStr('');
  };

  const handleCustom = () => {
    setSelectedExercise(null);
    setShowCustomForm(true);
    setStep('details');
  };

  const handleSave = async () => {
    const duration = parseInt(durationStr);
    const calories = parseInt(caloriesStr) || autoCalories;
    const name = selectedExercise?.name ?? customName.trim();

    if (!name) {
      Alert.alert('Missing', 'Please enter an exercise name.');
      return;
    }
    if (!duration || duration <= 0) {
      Alert.alert('Missing', 'Please enter a valid duration.');
      return;
    }

    setIsSaving(true);
    try {
      await addWorkout({
        exercise_id: selectedExercise?.id,
        exercise_name: selectedExercise?.name ?? customName.trim(),
        category: selectedExercise?.category ?? customCategory,
        workout_date: getTodayDateString(),
        duration_mins: duration,
        calories_burned: calories || 0,
        notes: notes.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save workout.');
    } finally {
      setIsSaving(false);
    }
  };

  if (step === 'pick') {
    return (
      <View style={styles.root}>
        <ExercisePicker
          exercises={exercises}
          onSelect={handleSelectExercise}
          onCustom={handleCustom}
        />
      </View>
    );
  }

  const exerciseName = selectedExercise?.name ?? customName;
  const displayCalories = caloriesStr || autoCalories.toString();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Back to picker */}
        <TouchableOpacity onPress={() => setStep('pick')} style={styles.backBtn}>
          <Text style={styles.backText}>← Change exercise</Text>
        </TouchableOpacity>

        {/* Exercise name */}
        {showCustomForm ? (
          <View style={styles.card}>
            <Text style={styles.label}>Exercise Name</Text>
            <TextInput
              style={styles.textInput}
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g. Mountain Biking"
              placeholderTextColor={Colors.text.muted}
            />
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryRow}>
              {['cardio', 'strength', 'flexibility', 'sports', 'other'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    customCategory === cat && styles.catChipActive,
                  ]}
                  onPress={() => setCustomCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      customCategory === cat && styles.catChipTextActive,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.selectedHeader}>
            <Text style={styles.selectedName}>{exerciseName}</Text>
            <Text style={styles.selectedCategory}>
              {selectedExercise?.category}
            </Text>
          </View>
        )}

        {/* Duration */}
        <View style={styles.card}>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.durationRow}>
            {['15', '30', '45', '60', '90'].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.durationChip,
                  durationStr === mins && styles.durationChipActive,
                ]}
                onPress={() => {
                  setDurationStr(mins);
                  setCaloriesStr('');
                }}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    durationStr === mins && styles.durationChipTextActive,
                  ]}
                >
                  {mins}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              value={durationStr}
              onChangeText={(v) => {
                setDurationStr(v);
                setCaloriesStr('');
              }}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={Colors.text.muted}
            />
            <Text style={styles.inputUnit}>minutes</Text>
          </View>
        </View>

        {/* Calories burned */}
        <View style={styles.card}>
          <Text style={styles.label}>Calories Burned</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              value={displayCalories}
              onChangeText={setCaloriesStr}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={Colors.text.muted}
            />
            <Text style={styles.inputUnit}>kcal</Text>
          </View>
          {autoCalories > 0 && (
            <Text style={styles.hint}>
              Auto-calculated{profile?.weight_kg ? ` for ${profile.weight_kg}kg` : ' (set weight in profile for accuracy)'}
            </Text>
          )}
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="How did it feel?"
            placeholderTextColor={Colors.text.muted}
            multiline
          />
        </View>

        {/* Save */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveText}>
            {isSaving ? 'Saving...' : 'Log Workout'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  backBtn: { marginBottom: -Spacing.sm },
  backText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  selectedHeader: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  selectedName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  selectedCategory: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  textInput: {
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputUnit: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  durationChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  durationChipActive: {
    backgroundColor: Colors.brand.primary + '20',
    borderColor: Colors.brand.primary,
  },
  durationChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  durationChipTextActive: {
    color: Colors.brand.primary,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  catChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  catChipActive: {
    backgroundColor: Colors.brand.primary + '20',
    borderColor: Colors.brand.primary,
  },
  catChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  catChipTextActive: {
    color: Colors.brand.primary,
  },
  hint: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    fontStyle: 'italic',
  },
  saveBtn: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
  },
  saveText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
