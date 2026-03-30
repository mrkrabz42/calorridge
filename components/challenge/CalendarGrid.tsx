import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { ChallengeDay } from '../../types/challenge';

interface Props {
  days: ChallengeDay[];
  targetCalories: number;
  onDayPress: (day: ChallengeDay) => void;
}

function getDayColor(day: ChallengeDay, targetCalories: number): string {
  const today = new Date().toISOString().split('T')[0];

  if (day.day_date > today) return Colors.challenge.future;
  if (day.actual_calories === null) return Colors.challenge.future;

  const diff = Math.abs(day.actual_calories - targetCalories);
  const pct = diff / targetCalories;

  if (pct <= 0.1) return Colors.challenge.hit;
  if (pct <= 0.2) return Colors.challenge.close;
  return Colors.challenge.missed;
}

export function CalendarGrid({ days, targetCalories, onDayPress }: Props) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <View style={styles.grid}>
      {days.map((day) => {
        const color = getDayColor(day, targetCalories);
        const isToday = day.day_date === today;

        return (
          <TouchableOpacity
            key={day.id}
            style={[
              styles.cell,
              { backgroundColor: color + '30' },
              isToday && styles.cellToday,
            ]}
            onPress={() => onDayPress(day)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayNum, { color }]}>
              {day.day_number}
            </Text>
            {day.actual_calories !== null && (
              <Text style={styles.dayCals}>{day.actual_calories}</Text>
            )}
            {day.completed && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  cell: {
    width: '14.5%',
    aspectRatio: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  cellToday: {
    borderWidth: 2,
    borderColor: Colors.challenge.today,
  },
  dayNum: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  dayCals: {
    color: Colors.text.muted,
    fontSize: 9,
  },
  check: {
    fontSize: 8,
    color: Colors.challenge.hit,
    position: 'absolute',
    top: 2,
    right: 4,
  },
});
