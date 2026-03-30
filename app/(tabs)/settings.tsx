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
import { useGoalsStore } from '../../store/goalsStore';
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

export default function SettingsScreen() {
  const { goals, updateGoals, isLoading } = useGoalsStore();
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

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
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
          label="Fiber"
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
        <Text style={styles.infoTitle}>💡 About CalorRidge</Text>
        <Text style={styles.infoText}>
          CalorRidge uses Claude AI vision to analyze your meal photos and estimate macronutrients.
          Add portion notes on the capture screen for more accurate results.
        </Text>
        <Text style={styles.infoCost}>Estimated cost: ~$1–2/year</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.md, gap: Spacing.lg },
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
  infoCost: {
    color: Colors.macro.fiber,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});
