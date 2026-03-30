import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography, Spacing, Radius } from '../../constants';

interface Props {
  remaining: number;
  total: number;
  onSkip: () => void;
}

export function RestTimerOverlay({ remaining, total, onSkip }: Props) {
  const size = 100;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? remaining / total : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.label}>Rest Timer</Text>

        <View style={styles.ringContainer}>
          <Svg width={size} height={size}>
            {/* Background ring */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={Colors.border.default}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress ring */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={Colors.brand.primary}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          <View style={styles.timeOverlay}>
            <Text style={styles.time}>{timeStr}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bg.overlay,
    paddingBottom: 40,
    paddingTop: Spacing.md,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    borderColor: Colors.border.default,
  },
  container: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ringContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    color: Colors.text.primary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
  skipBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  skipText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
