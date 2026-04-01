import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants';

interface StreakCounterProps {
  currentStreak: number;
}

export function StreakCounter({ currentStreak }: StreakCounterProps) {
  return (
    <View style={styles.container}>
      {currentStreak > 0 ? (
        <>
          <Text style={styles.flame}>{'\uD83D\uDD25'}</Text>
          <Text style={styles.count}>{currentStreak}</Text>
          <Text style={styles.label}>day streak</Text>
        </>
      ) : (
        <Text style={styles.emptyLabel}>Start your streak!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  flame: {
    fontSize: 16,
  },
  count: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  emptyLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});
