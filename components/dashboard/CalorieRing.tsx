import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, Typography } from '../../constants';
import { MacroProgress } from '../../utils/macroUtils';

interface Props {
  progress: MacroProgress;
  size?: number;
}

export function CalorieRing({ progress, size = 200 }: Props) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillRatio = Math.min(progress.percentage / 100, 1);
  const strokeDashoffset = circumference * (1 - fillRatio);
  const isOver = progress.isOver;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={Colors.macro.calories} />
            <Stop offset="100%" stopColor={Colors.brand.secondary} />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.border.default}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isOver ? Colors.status.error : 'url(#ringGrad)'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.value}>{Math.round(progress.value)}</Text>
        <Text style={styles.label}>kcal</Text>
        <Text style={styles.remaining}>
          {isOver
            ? `+${Math.round(progress.value - progress.goal)} over`
            : `${Math.round(progress.remaining)} left`}
        </Text>
        <Text style={styles.goal}>of {progress.goal}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    gap: 2,
  },
  value: {
    color: Colors.text.primary,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    lineHeight: 38,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  remaining: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginTop: 4,
  },
  goal: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
});
