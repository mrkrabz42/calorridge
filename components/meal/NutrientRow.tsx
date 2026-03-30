import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants';

interface Props {
  label: string;
  value: number;
  unit: string;
  color?: string;
  bold?: boolean;
}

export function NutrientRow({ label, value, unit, color = Colors.text.secondary, bold = false }: Props) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.value, { color }, bold && styles.bold]}>
        {value % 1 === 0 ? value.toString() : value.toFixed(1)}
        <Text style={styles.unit}> {unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.subtle,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
  },
  value: {
    fontSize: Typography.sizes.base,
  },
  unit: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  bold: {
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },
});
