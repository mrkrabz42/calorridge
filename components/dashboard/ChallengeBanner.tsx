import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { Challenge, ChallengeDay } from '../../types/challenge';

interface Props {
  challenge: Challenge;
  days: ChallengeDay[];
}

export function ChallengeBanner({ challenge, days }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const todayDay = days.find((d) => d.day_date === today);
  const completedDays = days.filter((d) => d.completed).length;
  const daysWithData = days.filter((d) => d.actual_calories !== null).length;

  // Calculate current day number
  const startDate = new Date(challenge.start_date + 'T00:00:00');
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const currentDayNum = Math.max(1, Math.min(
    Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
    challenge.duration_days
  ));

  const progress = daysWithData / challenge.duration_days;

  // Calculate streak
  let streak = 0;
  const sortedDays = [...days].sort((a, b) => b.day_number - a.day_number);
  for (const day of sortedDays) {
    if (day.day_date > today) continue;
    if (day.actual_calories === null) break;
    const withinTarget = Math.abs(
      (day.actual_calories ?? 0) - challenge.target_calories
    ) <= challenge.target_calories * 0.1;
    if (withinTarget) streak++;
    else break;
  }

  const goalLabel = challenge.goal_type.charAt(0).toUpperCase() + challenge.goal_type.slice(1);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/challenge/${challenge.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{goalLabel}</Text>
        </View>
        <Text style={styles.name}>{challenge.name}</Text>
        <Text style={styles.dayCount}>
          Day {currentDayNum}/{challenge.duration_days}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{daysWithData}</Text>
          <Text style={styles.statLabel}>Logged</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{completedDays}</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, streak > 0 && { color: Colors.challenge.hit }]}>
            {streak}
          </Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{challenge.target_calories}</Text>
          <Text style={styles.statLabel}>Target</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '40',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.brand.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  name: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  dayCount: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border.default,
    borderRadius: 2,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.brand.primary,
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  statLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
});
