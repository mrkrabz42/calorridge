import React, { useState, useEffect, useMemo } from 'react';
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
import { useProfileStore } from '../store/profileStore';
import { useGoalsStore } from '../store/goalsStore';
import { Colors, Typography, Spacing, Radius } from '../constants';
import { ActivityLevel, GoalType, Sex } from '../types/profile';
import {
  calculateTDEE,
  calculateGoalMacros,
  ACTIVITY_LEVEL_LABELS,
  GOAL_TYPE_LABELS,
} from '../utils/tdeeUtils';

function OptionPicker<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T | null;
  options: T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.option, value === opt && styles.optionActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.optionText, value === opt && styles.optionTextActive]}>
              {labels[opt]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function NumberField({
  label,
  value,
  unit,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.numberInput}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={Colors.text.muted}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { profile, fetchProfile, updateProfile } = useProfileStore();
  const { updateGoals } = useGoalsStore();

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setWeight(profile.weight_kg?.toString() ?? '');
      setHeight(profile.height_cm?.toString() ?? '');
      setAge(profile.age?.toString() ?? '');
      setSex(profile.sex);
      setActivityLevel(profile.activity_level);
      setGoalType(profile.goal_type);
    }
  }, [profile]);

  const tdee = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (!w || !h || !a || !sex || !activityLevel) return null;
    return calculateTDEE(w, h, a, sex, activityLevel);
  }, [weight, height, age, sex, activityLevel]);

  const suggestedMacros = useMemo(() => {
    if (!tdee || !goalType) return null;
    return calculateGoalMacros(tdee, parseFloat(weight), goalType);
  }, [tdee, goalType, weight]);

  const handleSave = async () => {
    try {
      await updateProfile({
        weight_kg: weight ? parseFloat(weight) : null,
        height_cm: height ? parseFloat(height) : null,
        age: age ? parseInt(age) : null,
        sex,
        activity_level: activityLevel,
        goal_type: goalType,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Alert.alert('Error', 'Failed to save profile.');
    }
  };

  const handleApplyGoals = async () => {
    if (!suggestedMacros) return;
    try {
      await updateGoals(suggestedMacros);
      Alert.alert('Goals Updated', 'Your daily goals have been set from your profile.');
    } catch {
      Alert.alert('Error', 'Failed to update goals.');
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your Profile</Text>
      <Text style={styles.subtitle}>
        Used to calculate your TDEE and recommended macros
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <NumberField label="Weight" value={weight} unit="kg" onChange={setWeight} placeholder="75" />
          </View>
          <View style={{ flex: 1 }}>
            <NumberField label="Height" value={height} unit="cm" onChange={setHeight} placeholder="178" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <NumberField label="Age" value={age} unit="yrs" onChange={setAge} placeholder="25" />
          </View>
          <View style={{ flex: 1 }}>
            <OptionPicker
              label="Sex"
              value={sex}
              options={['male', 'female'] as Sex[]}
              labels={{ male: 'Male', female: 'Female' }}
              onChange={setSex}
            />
          </View>
        </View>

        <OptionPicker
          label="Activity Level"
          value={activityLevel}
          options={['sedentary', 'light', 'moderate', 'active', 'very_active'] as ActivityLevel[]}
          labels={ACTIVITY_LEVEL_LABELS}
          onChange={setActivityLevel}
        />

        <OptionPicker
          label="Goal"
          value={goalType}
          options={['cut', 'bulk', 'maintain'] as GoalType[]}
          labels={GOAL_TYPE_LABELS}
          onChange={setGoalType}
        />
      </View>

      {/* TDEE Display */}
      {tdee && (
        <View style={styles.tdeeCard}>
          <Text style={styles.tdeeLabel}>Your estimated TDEE</Text>
          <Text style={styles.tdeeValue}>{tdee} kcal/day</Text>
          {suggestedMacros && (
            <>
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: Colors.macro.calories }]}>
                    {suggestedMacros.calories}
                  </Text>
                  <Text style={styles.macroLabel}>kcal</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: Colors.macro.protein }]}>
                    {suggestedMacros.protein_g}g
                  </Text>
                  <Text style={styles.macroLabel}>protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: Colors.macro.carbs }]}>
                    {suggestedMacros.carbs_g}g
                  </Text>
                  <Text style={styles.macroLabel}>carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: Colors.macro.fat }]}>
                    {suggestedMacros.fat_g}g
                  </Text>
                  <Text style={styles.macroLabel}>fat</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.applyBtn} onPress={handleApplyGoals}>
                <Text style={styles.applyText}>Apply as Daily Goals</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, saved && styles.savedBtn]}
        onPress={handleSave}
      >
        <Text style={styles.saveText}>{saved ? '✓ Saved!' : 'Save Profile'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.photoGoalBtn}
        onPress={() => router.push('/profile-photo')}
      >
        <Text style={styles.photoGoalText}>Upload Photo and Set Goal</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    marginTop: -Spacing.sm,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  field: { gap: 6 },
  fieldLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  numberInput: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  unit: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  option: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  optionActive: {
    backgroundColor: Colors.brand.primary + '20',
    borderColor: Colors.brand.primary,
  },
  optionText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  optionTextActive: {
    color: Colors.brand.primary,
  },
  tdeeCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '40',
  },
  tdeeLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  tdeeValue: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: Spacing.xs,
  },
  macroItem: { alignItems: 'center', gap: 2 },
  macroValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  macroLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  applyBtn: {
    backgroundColor: Colors.brand.primary + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  applyText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  saveBtn: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
  },
  savedBtn: { backgroundColor: Colors.status.success },
  saveText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  photoGoalBtn: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '40',
    alignItems: 'center',
  },
  photoGoalText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
});
