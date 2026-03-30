import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mealsService } from '../../../services/mealsService';
import { useMealsStore } from '../../../store/mealsStore';
import { NutrientRow } from '../../../components/meal/NutrientRow';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { Colors, Typography, Spacing, Radius } from '../../../constants';
import { MEAL_TYPES } from '../../../constants/mealTypes';
import { Meal } from '../../../types';
import { formatDate, formatTime } from '../../../utils/macroUtils';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const deleteMeal = useMealsStore((s) => s.deleteMeal);

  const [meal, setMeal] = useState<Meal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    mealsService.getMealById(id).then((m) => {
      setMeal(m);
      setIsLoading(false);
    });
  }, [id]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setShowDeleteDialog(true)} style={{ paddingRight: 4 }}>
          <Text style={{ color: Colors.status.error, fontSize: Typography.sizes.base }}>
            Delete
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteMeal(id);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to delete meal. Please try again.');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.brand.primary} size="large" />
      </View>
    );
  }

  if (!meal) {
    return (
      <View style={styles.loading}>
        <Text style={styles.notFound}>Meal not found.</Text>
      </View>
    );
  }

  const config = MEAL_TYPES[meal.meal_type as keyof typeof MEAL_TYPES];

  return (
    <>
      <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Photo */}
        {meal.photo_url ? (
          <Image source={{ uri: meal.photo_url }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: config.color + '22' }]}>
            <Text style={styles.placeholderIcon}>{config.icon}</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.tagRow}>
            <View style={[styles.typeTag, { backgroundColor: config.color + '22' }]}>
              <Text style={[styles.typeText, { color: config.color }]}>
                {config.icon} {config.label}
              </Text>
            </View>
            {meal.confidence !== undefined && meal.confidence < 0.5 && (
              <View style={styles.lowConfTag}>
                <Text style={styles.lowConfText}>Low confidence</Text>
              </View>
            )}
          </View>
          <Text style={styles.foodName}>{meal.food_name}</Text>
          <Text style={styles.timestamp}>
            {formatDate(meal.meal_date)} · {formatTime(meal.logged_at)}
          </Text>
          {meal.notes && (
            <Text style={styles.notes}>📝 {meal.notes}</Text>
          )}
        </View>

        {/* Calories highlight */}
        <View style={styles.calorieCard}>
          <Text style={styles.calorieValue}>{meal.calories}</Text>
          <Text style={styles.calorieLabel}>kilocalories</Text>
        </View>

        {/* Macros */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Macronutrients</Text>
          <NutrientRow
            label="Protein"
            value={meal.protein_g}
            unit="g"
            color={Colors.macro.protein}
            bold
          />
          <NutrientRow
            label="Carbohydrates"
            value={meal.carbs_g}
            unit="g"
            color={Colors.macro.carbs}
            bold
          />
          <NutrientRow
            label="Fat"
            value={meal.fat_g}
            unit="g"
            color={Colors.macro.fat}
            bold
          />
          {meal.fiber_g != null && (
            <NutrientRow label="Fiber" value={meal.fiber_g} unit="g" color={Colors.macro.fiber} />
          )}
          {meal.sugar_g != null && (
            <NutrientRow label="Sugar" value={meal.sugar_g} unit="g" />
          )}
          {meal.sodium_mg != null && (
            <NutrientRow label="Sodium" value={meal.sodium_mg} unit="mg" />
          )}
        </View>

        {/* Food items */}
        {meal.food_items && Array.isArray(meal.food_items) && meal.food_items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ingredients</Text>
            {(meal.food_items as any[]).map((item, i) => (
              <View key={i} style={styles.ingredient}>
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <Text style={styles.ingredientQty}>{item.estimated_quantity}</Text>
                </View>
                <View style={styles.ingredientMacros}>
                  <Text style={styles.ingredientCal}>{item.calories} kcal</Text>
                  <Text style={styles.ingredientDetail}>
                    P:{item.protein_g}g C:{item.carbs_g}g F:{item.fat_g}g
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {meal.confidence !== undefined && (
          <Text style={styles.confidence}>
            AI confidence: {Math.round(meal.confidence * 100)}%
          </Text>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Meal"
        message={`Remove "${meal.food_name}" from your log?`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: Colors.text.secondary, fontSize: Typography.sizes.base },
  photo: { width: '100%', height: 280 },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: { fontSize: 64 },
  header: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  tagRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  typeTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  typeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  lowConfTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(250,204,21,0.15)',
  },
  lowConfText: {
    color: Colors.status.warning,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  foodName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
  timestamp: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  notes: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontStyle: 'italic',
  },
  calorieCard: {
    backgroundColor: Colors.bg.card,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  calorieValue: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes['4xl'],
    fontWeight: Typography.weights.extrabold,
  },
  calorieLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  ingredient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.subtle,
  },
  ingredientInfo: { flex: 1 },
  ingredientName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  ingredientQty: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  ingredientMacros: { alignItems: 'flex-end' },
  ingredientCal: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  ingredientDetail: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  confidence: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
});
