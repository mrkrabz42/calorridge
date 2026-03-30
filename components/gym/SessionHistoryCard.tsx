import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WorkoutSession } from '../../types/gym';
import { Colors, Typography, Spacing, Radius } from '../../constants';

interface Props {
  session: WorkoutSession;
}

function formatDuration(secs: number | null): string {
  if (!secs) return '--';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]}`;
}

export function SessionHistoryCard({ session }: Props) {
  const volume = session.total_volume_kg
    ? session.total_volume_kg >= 1000
      ? `${(session.total_volume_kg / 1000).toFixed(1)}t`
      : `${Math.round(session.total_volume_kg)}kg`
    : '--';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>
          {session.name || 'Workout'}
        </Text>
        <Text style={styles.date}>{formatDate(session.session_date)}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDuration(session.duration_secs)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{volume}</Text>
          <Text style={styles.statLabel}>Volume</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{session.total_sets ?? '--'}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, styles.caloriesValue]}>
            {session.calories_burned ? Math.round(session.calories_burned) : '--'}
          </Text>
          <Text style={styles.statLabel}>kcal</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    flex: 1,
  },
  date: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  caloriesValue: {
    color: Colors.workout.burned,
  },
  statLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border.default,
  },
});
