import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius } from '../../../constants';
import { ChallengeDay } from '../../../types/challenge';
import { useChallengeStore } from '../../../store/challengeStore';
import { supabase } from '../../../services/supabase';

export default function ChallengeDayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateDay, activeChallenge } = useChallengeStore();
  const [day, setDay] = useState<ChallengeDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [weightStr, setWeightStr] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      supabase
        .from('challenge_days')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          const d = data as ChallengeDay;
          setDay(d);
          setWeightStr(d?.weight_kg?.toString() ?? '');
          setNotes(d?.notes ?? '');
          setLoading(false);
        });
    }
  }, [id]);

  const handleSave = async () => {
    if (!day) return;
    setIsSaving(true);
    try {
      await updateDay(day.id, {
        weight_kg: weightStr ? parseFloat(weightStr) : null,
        notes: notes.trim() || undefined,
        completed: true,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !day) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.loadingText}>{loading ? 'Loading...' : 'Day not found'}</Text>
      </View>
    );
  }

  const hasData = day.actual_calories !== null;
  const targetCals = activeChallenge?.target_calories ?? 0;
  const calDiff = hasData ? (day.actual_calories! - targetCals) : 0;
  const onTrack = hasData && Math.abs(calDiff) <= targetCals * 0.1;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.dayTitle}>Day {day.day_number}</Text>
        <Text style={styles.dayDate}>{day.day_date}</Text>
        {day.completed && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}
      </View>

      {/* Nutrition summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nutrition</Text>
        {hasData ? (
          <View style={styles.nutritionGrid}>
            <NutritionStat
              label="Calories"
              actual={day.actual_calories!}
              target={targetCals}
              color={Colors.macro.calories}
            />
            <NutritionStat
              label="Protein"
              actual={day.actual_protein_g ?? 0}
              target={activeChallenge?.target_protein_g ?? 0}
              unit="g"
              color={Colors.macro.protein}
            />
            <NutritionStat
              label="Carbs"
              actual={day.actual_carbs_g ?? 0}
              target={activeChallenge?.target_carbs_g ?? 0}
              unit="g"
              color={Colors.macro.carbs}
            />
            <NutritionStat
              label="Fat"
              actual={day.actual_fat_g ?? 0}
              target={activeChallenge?.target_fat_g ?? 0}
              unit="g"
              color={Colors.macro.fat}
            />
          </View>
        ) : (
          <Text style={styles.noData}>
            No meals logged for this day. Log meals to see your progress here.
          </Text>
        )}

        {hasData && (
          <View style={[styles.statusBanner, onTrack ? styles.onTrack : styles.offTrack]}>
            <Text style={styles.statusText}>
              {onTrack
                ? 'On target!'
                : calDiff > 0
                ? `${calDiff} kcal over target`
                : `${Math.abs(calDiff)} kcal under target`}
            </Text>
          </View>
        )}
      </View>

      {/* Workout burns */}
      {(day.calories_burned ?? 0) > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workouts</Text>
          <Text style={styles.burnedValue}>-{day.calories_burned} kcal burned</Text>
        </View>
      )}

      {/* Weigh-in */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Weigh-in (optional)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            value={weightStr}
            onChangeText={setWeightStr}
            keyboardType="decimal-pad"
            placeholder="e.g. 78.5"
            placeholderTextColor={Colors.text.muted}
          />
          <Text style={styles.unit}>kg</Text>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notes</Text>
        <TextInput
          style={[styles.textInput, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="How did today go?"
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
          {isSaving ? 'Saving...' : day.completed ? 'Update Check-in' : 'Complete Day'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function NutritionStat({
  label, actual, target, unit = 'kcal', color,
}: {
  label: string; actual: number; target: number; unit?: string; color: string;
}) {
  const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
  return (
    <View style={styles.nutritionStat}>
      <Text style={[styles.nutritionValue, { color }]}>{Math.round(actual)}</Text>
      <Text style={styles.nutritionTarget}>/ {Math.round(target)} {unit}</Text>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={styles.nutritionPct}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.text.secondary, fontSize: Typography.sizes.base },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  header: { alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  dayTitle: { color: Colors.text.primary, fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.bold },
  dayDate: { color: Colors.text.secondary, fontSize: Typography.sizes.base },
  completedBadge: {
    backgroundColor: Colors.challenge.hit + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  completedText: { color: Colors.challenge.hit, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardTitle: { color: Colors.text.secondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  nutritionGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  nutritionStat: { alignItems: 'center', gap: 2 },
  nutritionValue: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  nutritionTarget: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  nutritionLabel: { color: Colors.text.secondary, fontSize: Typography.sizes.xs },
  nutritionPct: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  noData: { color: Colors.text.muted, fontSize: Typography.sizes.sm, textAlign: 'center', paddingVertical: Spacing.md },
  statusBanner: { padding: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  onTrack: { backgroundColor: Colors.challenge.hit + '20' },
  offTrack: { backgroundColor: Colors.challenge.missed + '15' },
  statusText: { color: Colors.text.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  burnedValue: { color: Colors.workout.burned, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  textInput: {
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  unit: { color: Colors.text.muted, fontSize: Typography.sizes.sm },
  saveBtn: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
  },
  saveText: { color: Colors.text.inverse, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
});
