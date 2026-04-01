import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DiaryCompletion } from '../../types/meal';
import { Colors, Typography, Spacing, Radius } from '../../constants';

interface DiarySummaryCardProps {
  completion: DiaryCompletion;
}

const GRADE_COLORS: Record<string, string> = {
  A: Colors.status.success,
  B: Colors.brand.primary,
  C: Colors.status.warning,
  D: Colors.macro.calories,
  F: Colors.status.error,
};

function MacroRow({
  label,
  actual,
  goal,
  unit,
  color,
}: {
  label: string;
  actual: number;
  goal: number | null;
  unit: string;
  color: string;
}) {
  const pct = goal && goal > 0 ? Math.round((actual / goal) * 100) : null;
  return (
    <View style={styles.macroRow}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {Math.round(actual)}{unit}
      </Text>
      {goal !== null && goal > 0 && (
        <Text style={styles.macroGoal}>
          / {Math.round(goal)}{unit} ({pct}%)
        </Text>
      )}
    </View>
  );
}

export function DiarySummaryCard({ completion }: DiarySummaryCardProps) {
  const gradeColor = GRADE_COLORS[completion.grade ?? 'F'] ?? Colors.text.muted;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.gradeContainer}>
          <Text style={[styles.grade, { color: gradeColor }]}>
            {completion.grade ?? '-'}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Diary Complete</Text>
          <Text style={styles.subtitle}>
            {completion.completion_date}
          </Text>
        </View>
      </View>

      <View style={styles.macros}>
        <MacroRow
          label="Calories"
          actual={completion.total_calories}
          goal={completion.goal_calories}
          unit=" kcal"
          color={Colors.macro.calories}
        />
        <MacroRow
          label="Protein"
          actual={completion.total_protein_g}
          goal={completion.goal_protein_g}
          unit="g"
          color={Colors.macro.protein}
        />
        <MacroRow
          label="Carbs"
          actual={completion.total_carbs_g}
          goal={completion.goal_carbs_g}
          unit="g"
          color={Colors.macro.carbs}
        />
        <MacroRow
          label="Fat"
          actual={completion.total_fat_g}
          goal={completion.goal_fat_g}
          unit="g"
          color={Colors.macro.fat}
        />
        {completion.total_fiber_g !== null && completion.total_fiber_g !== undefined && (
          <MacroRow
            label="Fibre"
            actual={completion.total_fiber_g}
            goal={null}
            unit="g"
            color={Colors.macro.fiber}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  gradeContainer: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  grade: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  subtitle: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  macros: {
    gap: Spacing.sm,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    width: 60,
  },
  macroValue: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  macroGoal: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
});
