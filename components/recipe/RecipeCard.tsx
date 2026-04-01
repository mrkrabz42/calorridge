import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { Recipe } from '../../types';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
}

export function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {recipe.name}
        </Text>
        <View style={styles.badges}>
          <View style={styles.servingsBadge}>
            <Text style={styles.servingsBadgeText}>
              {recipe.servings_count} serving{recipe.servings_count !== 1 ? 's' : ''}
            </Text>
          </View>
          {recipe.use_count > 0 && (
            <Text style={styles.useCount}>
              Used {recipe.use_count}x
            </Text>
          )}
        </View>
      </View>

      <View style={styles.nutritionRow}>
        <View style={styles.calCol}>
          <Text style={styles.calValue}>{recipe.calories}</Text>
          <Text style={styles.calLabel}>kcal</Text>
        </View>

        <View style={styles.macrosRow}>
          <View style={styles.macroCol}>
            <Text style={[styles.macroValue, { color: Colors.macro.protein }]}>
              {Number(recipe.protein_g).toFixed(1)}g
            </Text>
            <Text style={styles.macroLabel}>P</Text>
          </View>
          <View style={styles.macroCol}>
            <Text style={[styles.macroValue, { color: Colors.macro.carbs }]}>
              {Number(recipe.carbs_g).toFixed(1)}g
            </Text>
            <Text style={styles.macroLabel}>C</Text>
          </View>
          <View style={styles.macroCol}>
            <Text style={[styles.macroValue, { color: Colors.macro.fat }]}>
              {Number(recipe.fat_g).toFixed(1)}g
            </Text>
            <Text style={styles.macroLabel}>F</Text>
          </View>
        </View>
      </View>

      <Text style={styles.perServing}>per serving</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  name: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  servingsBadge: {
    backgroundColor: Colors.brand.primary + '20',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  servingsBadgeText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  useCount: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  calCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  calValue: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  calLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  macrosRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  macroCol: {
    alignItems: 'center',
    gap: 1,
  },
  macroValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  macroLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  perServing: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    textAlign: 'right',
  },
});
