import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '../../constants';
import { MacroProgress } from '../../utils/macroUtils';

interface Props {
  label: string;
  unit: string;
  progress: MacroProgress;
  color: string;
}

export function MacroBar({ label, unit, progress, color }: Props) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${Math.min(progress.percentage, 100)}%`, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    }),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.values}>
          <Text style={[styles.current, { color }]}>{progress.value.toFixed(1)}</Text>
          <Text style={styles.divider}> / </Text>
          <Text style={styles.goal}>{progress.goal}{unit}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: color },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  values: {
    fontSize: Typography.sizes.sm,
  },
  current: {
    fontWeight: Typography.weights.semibold,
  },
  divider: {
    color: Colors.text.muted,
  },
  goal: {
    color: Colors.text.muted,
  },
  track: {
    height: 6,
    backgroundColor: Colors.border.default,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
