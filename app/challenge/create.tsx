import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useChallengeStore } from '../../store/challengeStore';
import { useProfileStore } from '../../store/profileStore';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { ChallengeGoalType } from '../../types/challenge';
import { calculateTDEE, calculateGoalMacros, GOAL_TYPE_LABELS } from '../../utils/tdeeUtils';
import { GoalType } from '../../types/profile';

export default function CreateChallengeScreen() {
  const { createChallenge } = useChallengeStore();
  const { profile } = useProfileStore();

  const [name, setName] = useState('');
  const [goalType, setGoalType] = useState<ChallengeGoalType>('cut');
  const [duration, setDuration] = useState('30');
  const [targetCalories, setTargetCalories] = useState('');
  const [targetProtein, setTargetProtein] = useState('');
  const [targetCarbs, setTargetCarbs] = useState('');
  const [targetFat, setTargetFat] = useState('');
  const [startWeight, setStartWeight] = useState(profile?.weight_kg?.toString() ?? '');
  const [targetWeight, setTargetWeight] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-calc from profile
  const autoMacros = useMemo(() => {
    if (!profile?.weight_kg || !profile?.height_cm || !profile?.age || !profile?.sex || !profile?.activity_level) {
      return null;
    }
    const tdee = calculateTDEE(
      Number(profile.weight_kg),
      Number(profile.height_cm),
      profile.age,
      profile.sex,
      profile.activity_level
    );
    const gt = goalType === 'custom' ? 'maintain' : goalType;
    return calculateGoalMacros(tdee, Number(profile.weight_kg), gt as GoalType);
  }, [profile, goalType]);

  // Pre-fill from auto macros
  const cals = targetCalories || autoMacros?.calories.toString() || '';
  const prot = targetProtein || autoMacros?.protein_g.toString() || '';
  const carbs = targetCarbs || autoMacros?.carbs_g.toString() || '';
  const fat = targetFat || autoMacros?.fat_g.toString() || '';

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Missing', 'Give your challenge a name.');
      return;
    }

    const durationDays = parseInt(duration) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Start tomorrow
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays - 1);

    setIsSaving(true);
    try {
      const challenge = await createChallenge({
        name: name.trim(),
        goal_type: goalType,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        duration_days: durationDays,
        target_calories: parseInt(cals) || 2000,
        target_protein_g: parseInt(prot) || 150,
        target_carbs_g: parseInt(carbs) || 200,
        target_fat_g: parseInt(fat) || 65,
        start_weight_kg: startWeight ? parseFloat(startWeight) : undefined,
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/challenge/${challenge.id}`);
    } catch {
      Alert.alert('Error', 'Failed to create challenge.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Challenge</Text>

      {/* Name */}
      <View style={styles.card}>
        <Text style={styles.label}>Challenge Name</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g. April Cut, Summer Bulk"
          placeholderTextColor={Colors.text.muted}
        />
      </View>

      {/* Goal type */}
      <View style={styles.card}>
        <Text style={styles.label}>Goal Type</Text>
        <View style={styles.goalRow}>
          {(['cut', 'bulk', 'maintain', 'custom'] as ChallengeGoalType[]).map((gt) => (
            <TouchableOpacity
              key={gt}
              style={[styles.goalChip, goalType === gt && styles.goalChipActive]}
              onPress={() => {
                setGoalType(gt);
                setTargetCalories('');
                setTargetProtein('');
                setTargetCarbs('');
                setTargetFat('');
              }}
            >
              <Text style={[styles.goalText, goalType === gt && styles.goalTextActive]}>
                {gt === 'custom' ? 'Custom' : GOAL_TYPE_LABELS[gt as GoalType]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Duration */}
      <View style={styles.card}>
        <Text style={styles.label}>Duration</Text>
        <View style={styles.durationRow}>
          {['7', '14', '21', '30', '60'].map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.durChip, duration === d && styles.durChipActive]}
              onPress={() => setDuration(d)}
            >
              <Text style={[styles.durText, duration === d && styles.durTextActive]}>
                {d} days
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Macro targets */}
      <View style={styles.card}>
        <Text style={styles.label}>Daily Targets</Text>
        {autoMacros && goalType !== 'custom' && (
          <Text style={styles.hint}>Auto-calculated from your profile</Text>
        )}
        <View style={styles.macroGrid}>
          <MacroInput label="Calories" value={cals} unit="kcal" color={Colors.macro.calories} onChange={setTargetCalories} />
          <MacroInput label="Protein" value={prot} unit="g" color={Colors.macro.protein} onChange={setTargetProtein} />
          <MacroInput label="Carbs" value={carbs} unit="g" color={Colors.macro.carbs} onChange={setTargetCarbs} />
          <MacroInput label="Fat" value={fat} unit="g" color={Colors.macro.fat} onChange={setTargetFat} />
        </View>
      </View>

      {/* Weight tracking */}
      <View style={styles.card}>
        <Text style={styles.label}>Weight (optional)</Text>
        <View style={styles.weightRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subLabel}>Start</Text>
            <TextInput
              style={styles.textInput}
              value={startWeight}
              onChangeText={setStartWeight}
              keyboardType="decimal-pad"
              placeholder="kg"
              placeholderTextColor={Colors.text.muted}
            />
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.subLabel}>Target</Text>
            <TextInput
              style={styles.textInput}
              value={targetWeight}
              onChangeText={setTargetWeight}
              keyboardType="decimal-pad"
              placeholder="kg"
              placeholderTextColor={Colors.text.muted}
            />
          </View>
        </View>
      </View>

      {/* Create */}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={handleCreate}
        disabled={isSaving}
        activeOpacity={0.85}
      >
        <Text style={styles.createText}>
          {isSaving ? 'Creating...' : 'Start Challenge'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MacroInput({
  label, value, unit, color, onChange,
}: {
  label: string; value: string; unit: string; color: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.macroInputContainer}>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
      <View style={styles.macroInputRow}>
        <TextInput
          style={styles.macroInput}
          value={value}
          onChangeText={onChange}
          keyboardType="number-pad"
          placeholderTextColor={Colors.text.muted}
        />
        <Text style={styles.macroUnit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
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
  subLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    marginBottom: 4,
  },
  hint: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    fontStyle: 'italic',
    marginTop: -4,
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
  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  goalChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  goalChipActive: {
    backgroundColor: Colors.brand.primary + '20',
    borderColor: Colors.brand.primary,
  },
  goalText: { color: Colors.text.secondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium },
  goalTextActive: { color: Colors.brand.primary },
  durationRow: { flexDirection: 'row', gap: Spacing.xs },
  durChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
  },
  durChipActive: {
    backgroundColor: Colors.brand.primary + '20',
    borderColor: Colors.brand.primary,
  },
  durText: { color: Colors.text.secondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium },
  durTextActive: { color: Colors.brand.primary },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  macroInputContainer: {
    width: '47%',
    gap: 4,
  },
  macroLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  macroInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroInput: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  macroUnit: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  arrow: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xl,
    marginBottom: Spacing.sm,
  },
  createBtn: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
  },
  createText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
