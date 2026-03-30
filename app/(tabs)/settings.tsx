import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { useGoalsStore } from '../../store/goalsStore';
import { useProfileStore } from '../../store/profileStore';
import { useChallengeStore } from '../../store/challengeStore';
import { useActiveProfileStore } from '../../store/activeProfileStore';
import { Colors, Typography, Spacing, Radius } from '../../constants';

interface GoalSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  onChange: (v: number) => void;
}

function GoalSlider({ label, value, min, max, step, unit, color, onChange }: GoalSliderProps) {
  return (
    <View style={styles.sliderSection}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={[styles.sliderValue, { color }]}>
          {Math.round(value)} {unit}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={color}
        maximumTrackTintColor={Colors.border.default}
        thumbTintColor={color}
      />
      <View style={styles.sliderRange}>
        <Text style={styles.rangeLabel}>{min}</Text>
        <Text style={styles.rangeLabel}>{max}</Text>
      </View>
    </View>
  );
}

function LinkRow({ icon, label, sublabel, onPress }: { icon: string; label: string; sublabel?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.linkIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkLabel}>{label}</Text>
        {sublabel && <Text style={styles.linkSub}>{sublabel}</Text>}
      </View>
      <Text style={styles.linkArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { goals, updateGoals, isLoading } = useGoalsStore();
  const { profile } = useProfileStore();
  const { activeChallenge } = useChallengeStore();
  const switchProfile = useActiveProfileStore((s) => s.switchProfile);
  const [local, setLocal] = useState({ ...goals });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await updateGoals(local);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Alert.alert('Error', 'Failed to save goals. Please try again.');
    }
  };

  const handleReset = () => {
    Alert.alert('Reset Goals', 'Reset to default values?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () =>
          setLocal({ id: goals.id, calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65, fiber_g: 25 }),
      },
    ]);
  };

  const profileSummary = profile?.weight_kg
    ? `${profile.weight_kg}kg · ${profile.goal_type ?? 'No goal set'}`
    : 'Not set up yet';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Quick links */}
      <View style={styles.linksCard}>
        <LinkRow
          icon="P"
          label="Profile"
          sublabel={profileSummary}
          onPress={() => router.push('/profile')}
        />
        <View style={styles.divider} />
        <LinkRow
          icon="I"
          label="Pantry"
          sublabel="Ingredients for meal suggestions"
          onPress={() => router.push('/pantry')}
        />
        <View style={styles.divider} />
        <LinkRow
          icon="C"
          label="Challenge"
          sublabel={activeChallenge ? `${activeChallenge.name} (active)` : 'No active challenge'}
          onPress={() => activeChallenge
            ? router.push(`/challenge/${activeChallenge.id}`)
            : router.push('/challenge/create')
          }
        />
        <View style={styles.divider} />
        <LinkRow
          icon="W"
          label="Weight Log"
          sublabel="Track weight and adaptive calories"
          onPress={() => router.push('/weight-log')}
        />
        <View style={styles.divider} />
        <LinkRow
          icon="A"
          label="Analytics"
          sublabel="Measurements, streaks, achievements"
          onPress={() => router.push('/analytics')}
        />
        <View style={styles.divider} />
        <LinkRow
          icon="G"
          label="Photo and Goals"
          sublabel="Upload photo, get AI body plan"
          onPress={() => router.push('/profile-photo')}
        />
      </View>

      <Text style={styles.sectionTitle}>Daily Nutrition Goals</Text>
      <Text style={styles.sectionSubtitle}>
        Adjust your targets to match your diet plan
      </Text>

      <View style={styles.card}>
        <GoalSlider
          label="Calories"
          value={local.calories}
          min={1000}
          max={4000}
          step={50}
          unit="kcal"
          color={Colors.macro.calories}
          onChange={(v) => setLocal((p) => ({ ...p, calories: v }))}
        />
        <GoalSlider
          label="Protein"
          value={local.protein_g}
          min={50}
          max={300}
          step={5}
          unit="g"
          color={Colors.macro.protein}
          onChange={(v) => setLocal((p) => ({ ...p, protein_g: v }))}
        />
        <GoalSlider
          label="Carbohydrates"
          value={local.carbs_g}
          min={50}
          max={500}
          step={5}
          unit="g"
          color={Colors.macro.carbs}
          onChange={(v) => setLocal((p) => ({ ...p, carbs_g: v }))}
        />
        <GoalSlider
          label="Fat"
          value={local.fat_g}
          min={20}
          max={200}
          step={5}
          unit="g"
          color={Colors.macro.fat}
          onChange={(v) => setLocal((p) => ({ ...p, fat_g: v }))}
        />
        <GoalSlider
          label="Fibre"
          value={local.fiber_g}
          min={10}
          max={60}
          step={1}
          unit="g"
          color={Colors.macro.fiber}
          onChange={(v) => setLocal((p) => ({ ...p, fiber_g: v }))}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetText}>Reset Defaults</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.savedBtn]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveText}>{saved ? '✓ Saved!' : 'Save Goals'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>About CalorRidge</Text>
        <Text style={styles.infoText}>
          AI-powered nutrition tracking, workout logging, and personalised challenges.
          Snap meals, scan barcodes, log workouts, and get meal suggestions to hit your goals.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.switchProfileBtn}
        onPress={() => {
          switchProfile();
          router.replace('/profile-picker');
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.switchProfileText}>Switch Profile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.md, gap: Spacing.lg },
  linksCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  linkIcon: { fontSize: 16, color: Colors.brand.primary, fontWeight: Typography.weights.bold, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brand.primary + '20', textAlign: 'center', lineHeight: 28 },
  linkLabel: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  linkSub: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  linkArrow: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xl,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.default,
    marginHorizontal: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  sectionSubtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
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
  sliderSection: { gap: 4 },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  sliderValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  slider: { width: '100%', height: 36 },
  sliderRange: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeLabel: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  resetBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
  },
  resetText: {
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
    fontSize: Typography.sizes.base,
  },
  saveBtn: {
    flex: 2,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
  },
  savedBtn: { backgroundColor: Colors.status.success },
  saveText: {
    color: Colors.text.inverse,
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.base,
  },
  infoCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  infoTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  infoText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  switchProfileBtn: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    alignItems: 'center',
  },
  switchProfileText: {
    color: Colors.status.warning,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
});
