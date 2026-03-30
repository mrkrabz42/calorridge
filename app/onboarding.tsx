import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveProfileStore } from '../store/activeProfileStore';
import { supabase } from '../services/supabase';
import { calculateTDEE, calculateGoalMacros } from '../utils/tdeeUtils';
import { Colors, Typography, Spacing, Radius } from '../constants';
import type { Sex, ActivityLevel, GoalType } from '../types/profile';

const PROFILE_COLOURS = [
  { label: 'Cyan', value: '#22D3EE' },
  { label: 'Red', value: '#F87171' },
  { label: 'Green', value: '#4ADE80' },
  { label: 'Violet', value: '#A78BFA' },
  { label: 'Orange', value: '#FB923C' },
  { label: 'Yellow', value: '#FACC15' },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Desk job, little exercise' },
  { value: 'light', label: 'Light', description: '1-3 days per week' },
  { value: 'moderate', label: 'Moderate', description: '3-5 days per week' },
  { value: 'active', label: 'Active', description: '6-7 days per week' },
  { value: 'very_active', label: 'Very Active', description: 'Training twice daily' },
];

const GOAL_OPTIONS: { value: GoalType; label: string; description: string }[] = [
  { value: 'cut', label: 'Cut', description: 'Lose fat, preserve muscle' },
  { value: 'bulk', label: 'Bulk', description: 'Build muscle, calorie surplus' },
  { value: 'maintain', label: 'Maintain', description: 'Stay at current weight' },
];

export default function OnboardingScreen() {
  const { createProfile } = useActiveProfileStore();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goalType, setGoalType] = useState<GoalType>('maintain');
  const [colour, setColour] = useState(PROFILE_COLOURS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCalculateTDEE =
    weight.trim() !== '' &&
    height.trim() !== '' &&
    age.trim() !== '';

  const tdee = canCalculateTDEE
    ? calculateTDEE(
        parseFloat(weight),
        parseFloat(height),
        parseInt(age, 10),
        sex,
        activityLevel,
      )
    : null;

  const macros =
    tdee !== null && weight.trim() !== ''
      ? calculateGoalMacros(tdee, parseFloat(weight), goalType)
      : null;

  const handleGetStarted = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const profile = await createProfile(name.trim(), colour);

      // Update user_profile with body stats if provided
      const profileUpdates: Record<string, unknown> = {};
      if (weight.trim()) profileUpdates.weight_kg = parseFloat(weight);
      if (height.trim()) profileUpdates.height_cm = parseFloat(height);
      if (age.trim()) profileUpdates.age = parseInt(age, 10);
      profileUpdates.sex = sex;
      profileUpdates.activity_level = activityLevel;
      profileUpdates.goal_type = goalType;

      if (Object.keys(profileUpdates).length > 0) {
        await supabase
          .from('user_profile')
          .update(profileUpdates)
          .eq('profile_id', profile.id);
      }

      // Update daily goals with calculated macros if available
      if (macros) {
        await supabase
          .from('daily_goals')
          .update({
            calories: macros.calories,
            protein_g: macros.protein_g,
            carbs_g: macros.carbs_g,
            fat_g: macros.fat_g,
            fiber_g: macros.fiber_g,
          })
          .eq('profile_id', profile.id);
      }

      router.replace('/(tabs)/dashboard');
    } catch (err) {
      console.error('Failed to create profile:', err);
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i === step && styles.stepDotActive,
            i < step && styles.stepDotDone,
          ]}
        />
      ))}
    </View>
  );

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's your name?</Text>
      <Text style={styles.stepSubtitle}>
        This is how you will appear on the profile picker.
      </Text>
      <TextInput
        style={styles.textInput}
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
        placeholderTextColor={Colors.text.muted}
        autoFocus
        maxLength={20}
      />
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Body Stats</Text>
      <Text style={styles.stepSubtitle}>
        Optional, but helps us calculate your targets.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Weight (kg)</Text>
        <TextInput
          style={styles.textInput}
          value={weight}
          onChangeText={setWeight}
          placeholder="e.g. 75"
          placeholderTextColor={Colors.text.muted}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Height (cm)</Text>
        <TextInput
          style={styles.textInput}
          value={height}
          onChangeText={setHeight}
          placeholder="e.g. 178"
          placeholderTextColor={Colors.text.muted}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Age</Text>
        <TextInput
          style={styles.textInput}
          value={age}
          onChangeText={setAge}
          placeholder="e.g. 25"
          placeholderTextColor={Colors.text.muted}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Sex</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, sex === 'male' && styles.toggleActive]}
            onPress={() => setSex('male')}
          >
            <Text
              style={[
                styles.toggleText,
                sex === 'male' && styles.toggleTextActive,
              ]}
            >
              Male
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, sex === 'female' && styles.toggleActive]}
            onPress={() => setSex('female')}
          >
            <Text
              style={[
                styles.toggleText,
                sex === 'female' && styles.toggleTextActive,
              ]}
            >
              Female
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Activity Level</Text>
      <Text style={styles.stepSubtitle}>
        How active are you on a typical week?
      </Text>
      {ACTIVITY_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.optionCard,
            activityLevel === opt.value && styles.optionCardActive,
          ]}
          onPress={() => setActivityLevel(opt.value)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.optionLabel,
              activityLevel === opt.value && styles.optionLabelActive,
            ]}
          >
            {opt.label}
          </Text>
          <Text style={styles.optionDesc}>{opt.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your Goal</Text>
      <Text style={styles.stepSubtitle}>
        What are you training towards?
      </Text>
      {GOAL_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.optionCard,
            goalType === opt.value && styles.optionCardActive,
          ]}
          onPress={() => setGoalType(opt.value)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.optionLabel,
              goalType === opt.value && styles.optionLabelActive,
            ]}
          >
            {opt.label}
          </Text>
          <Text style={styles.optionDesc}>{opt.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Summary</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name</Text>
          <Text style={styles.summaryValue}>{name}</Text>
        </View>
        {canCalculateTDEE && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated TDEE</Text>
              <Text style={styles.summaryValue}>{tdee} kcal</Text>
            </View>
          </>
        )}
        {macros && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Suggested Calories</Text>
              <Text style={styles.summaryValue}>{macros.calories} kcal</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Protein</Text>
              <Text style={styles.summaryValue}>{macros.protein_g}g</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Carbs</Text>
              <Text style={styles.summaryValue}>{macros.carbs_g}g</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fat</Text>
              <Text style={styles.summaryValue}>{macros.fat_g}g</Text>
            </View>
          </>
        )}
        {!canCalculateTDEE && (
          <>
            <View style={styles.summaryDivider} />
            <Text style={styles.summaryNote}>
              Default macro targets will be used. You can adjust them later in Settings.
            </Text>
          </>
        )}
      </View>

      <Text style={styles.colourTitle}>Pick a colour</Text>
      <View style={styles.colourRow}>
        {PROFILE_COLOURS.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[
              styles.colourSwatch,
              { backgroundColor: c.value },
              colour === c.value && styles.colourSwatchActive,
            ]}
            onPress={() => setColour(c.value)}
          />
        ))}
      </View>
    </View>
  );

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderStepIndicator()}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {steps[step]()}
        </ScrollView>

        <View style={styles.nav}>
          {step > 0 ? (
            <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}

          {step < 4 ? (
            <TouchableOpacity
              style={[styles.nextBtn, !name.trim() && step === 0 && styles.btnDisabled]}
              onPress={nextStep}
              disabled={!name.trim() && step === 0}
            >
              <Text style={styles.nextBtnText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleGetStarted}
              disabled={isSubmitting}
            >
              <Text style={styles.nextBtnText}>
                {isSubmitting ? 'Setting up...' : 'Get Started'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  flex: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border.default,
  },
  stepDotActive: {
    backgroundColor: Colors.brand.primary,
    width: 24,
  },
  stepDotDone: {
    backgroundColor: Colors.brand.primary,
  },
  stepContent: {
    gap: Spacing.md,
  },
  stepTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
  stepSubtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    padding: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    alignItems: 'center',
  },
  toggleActive: {
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.brand.primary + '15',
  },
  toggleText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  toggleTextActive: {
    color: Colors.brand.primary,
  },
  optionCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    gap: 2,
  },
  optionCardActive: {
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.brand.primary + '15',
  },
  optionLabel: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  optionLabelActive: {
    color: Colors.brand.primary,
  },
  optionDesc: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  summaryCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  summaryLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
  },
  summaryValue: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border.default,
    marginVertical: Spacing.xs,
  },
  summaryNote: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    paddingVertical: Spacing.xs,
  },
  colourTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginTop: Spacing.sm,
  },
  colourRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  colourSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colourSwatchActive: {
    borderColor: Colors.text.primary,
    borderWidth: 3,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
  },
  backBtnText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  nextBtn: {
    flex: 2,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
  },
  nextBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
