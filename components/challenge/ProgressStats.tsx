import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { Challenge, ChallengeDay } from '../../types/challenge';

interface Props {
  challenge: Challenge;
  days: ChallengeDay[];
}

export function ProgressStats({ challenge, days }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const pastDays = days.filter((d) => d.day_date <= today);
  const daysWithData = pastDays.filter((d) => d.actual_calories !== null);
  const completedDays = pastDays.filter((d) => d.completed).length;

  const avgCalories = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + (d.actual_calories ?? 0), 0) / daysWithData.length)
    : 0;

  const avgProtein = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + (d.actual_protein_g ?? 0), 0) / daysWithData.length)
    : 0;

  // Hit rate: days within 10% of calorie target
  const hitDays = daysWithData.filter((d) => {
    const diff = Math.abs((d.actual_calories ?? 0) - challenge.target_calories);
    return diff <= challenge.target_calories * 0.1;
  }).length;
  const hitRate = daysWithData.length > 0
    ? Math.round((hitDays / daysWithData.length) * 100)
    : 0;

  // Weight trend
  const weighIns = days.filter((d) => d.weight_kg !== null).sort(
    (a, b) => a.day_number - b.day_number
  );
  const firstWeight = weighIns.length > 0 ? weighIns[0].weight_kg : challenge.start_weight_kg;
  const lastWeight = weighIns.length > 0 ? weighIns[weighIns.length - 1].weight_kg : null;

  const stats = [
    { label: 'Days Logged', value: `${daysWithData.length}/${pastDays.length}` },
    { label: 'Completed', value: `${completedDays}` },
    { label: 'Hit Rate', value: `${hitRate}%`, color: hitRate >= 70 ? Colors.challenge.hit : hitRate >= 40 ? Colors.challenge.close : Colors.challenge.missed },
    { label: 'Avg Calories', value: `${avgCalories}`, sub: `/ ${challenge.target_calories}` },
    { label: 'Avg Protein', value: `${avgProtein}g`, sub: `/ ${Math.round(challenge.target_protein_g)}g` },
  ];

  if (firstWeight && lastWeight) {
    const diff = Number(lastWeight) - Number(firstWeight);
    stats.push({
      label: 'Weight Change',
      value: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`,
      sub: `${firstWeight} → ${lastWeight}`,
      color: undefined,
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress</Text>
      <View style={styles.grid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={[styles.statValue, stat.color ? { color: stat.color } : undefined]}>
              {stat.value}
            </Text>
            {stat.sub && <Text style={styles.statSub}>{stat.sub}</Text>}
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    width: '30%',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: 2,
  },
  statValue: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  statSub: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  statLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
});
