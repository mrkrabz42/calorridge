import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MealType } from '../../types';
import { MEAL_TYPES, MEAL_TYPE_ORDER } from '../../constants/mealTypes';
import { Colors, Typography, Spacing } from '../../constants';

interface Props {
  value: MealType;
  onChange: (type: MealType) => void;
}

export function MealTypeSelector({ value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.container}>
        {MEAL_TYPE_ORDER.map((type) => {
          const config = MEAL_TYPES[type];
          const selected = value === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.chip,
                selected && { backgroundColor: config.color + '22', borderColor: config.color },
              ]}
              onPress={() => onChange(type)}
            >
              <Text style={styles.icon}>{config.icon}</Text>
              <Text style={[styles.label, selected && { color: config.color }]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
  },
  icon: { fontSize: 16 },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});
