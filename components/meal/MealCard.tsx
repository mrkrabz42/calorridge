import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Meal } from '../../types';
import { MEAL_TYPES } from '../../constants/mealTypes';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { formatTime } from '../../utils/macroUtils';

interface Props {
  meal: Meal;
  onPress?: () => void;
}

export function MealCard({ meal, onPress }: Props) {
  const config = MEAL_TYPES[meal.meal_type as keyof typeof MEAL_TYPES];
  const handlePress = onPress ?? (() => router.push(`/meal/detail/${meal.id}`));

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      {meal.photo_url ? (
        <Image source={{ uri: meal.photo_url }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={[styles.photoPlaceholder, { backgroundColor: config.color + '22' }]}>
          <Text style={styles.placeholderIcon}>{config.icon}</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.foodName} numberOfLines={1}>{meal.food_name}</Text>
          <Text style={styles.calories}>{meal.calories} kcal</Text>
        </View>
        <View style={styles.macros}>
          <Text style={styles.macro}>
            <Text style={{ color: Colors.macro.protein }}>P </Text>
            <Text style={styles.macroValue}>{meal.protein_g.toFixed(0)}g</Text>
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.macro}>
            <Text style={{ color: Colors.macro.carbs }}>C </Text>
            <Text style={styles.macroValue}>{meal.carbs_g.toFixed(0)}g</Text>
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.macro}>
            <Text style={{ color: Colors.macro.fat }}>F </Text>
            <Text style={styles.macroValue}>{meal.fat_g.toFixed(0)}g</Text>
          </Text>
        </View>
        <Text style={styles.time}>{formatTime(meal.logged_at)}</Text>
      </View>

      <View style={[styles.typeTag, { backgroundColor: config.color + '22' }]}>
        <Text style={[styles.typeText, { color: config.color }]}>{config.icon}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
  },
  photo: {
    width: 72,
    height: 72,
  },
  photoPlaceholder: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: { fontSize: 28 },
  content: {
    flex: 1,
    padding: Spacing.sm,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foodName: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginRight: 8,
  },
  calories: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  macros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macro: {
    fontSize: Typography.sizes.xs,
  },
  macroValue: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  dot: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  time: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  typeTag: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  typeText: { fontSize: 18 },
});
