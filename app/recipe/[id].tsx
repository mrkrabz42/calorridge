import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { MEAL_TYPE_ORDER, MEAL_TYPES } from '../../constants/mealTypes';
import { MealType, Recipe } from '../../types';
import { useRecipeStore } from '../../store/recipeStore';
import { useMealsStore } from '../../store/mealsStore';
import { recipeService } from '../../services/recipeService';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const logRecipe = useRecipeStore((s) => s.logRecipe);
  const deleteRecipe = useRecipeStore((s) => s.deleteRecipe);
  const addMealOptimistic = useMealsStore((s) => s.addMealOptimistic);

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Log form state
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [servingsText, setServingsText] = useState('1');
  const [gramsText, setGramsText] = useState('');
  const [useGrams, setUseGrams] = useState(false);

  useEffect(() => {
    if (!id) return;
    recipeService.getRecipeById(id).then((r) => {
      setRecipe(r);
      setLoading(false);
      if (r?.total_weight_cooked_g) {
        setUseGrams(false); // default to servings, but enable option
      }
    });
  }, [id]);

  const handleLog = async () => {
    if (!recipe || !id) return;
    setIsLogging(true);
    try {
      const servings = parseFloat(servingsText) || 1;
      const grams = useGrams ? parseFloat(gramsText) || undefined : undefined;
      const meal = await logRecipe(id, mealType, servings, grams);
      addMealOptimistic(meal);
      Alert.alert('Logged', `${recipe.name} logged to ${MEAL_TYPES[mealType].label}.`);
      if (router.canGoBack()) {
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to log recipe.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('Delete Recipe', 'Are you sure you want to delete this recipe?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteRecipe(id);
            if (router.canGoBack()) {
              router.back();
            }
          } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Failed to delete recipe.');
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={Colors.brand.primary} size="large" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.emptyText}>Recipe not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Recipe header */}
        <Text style={styles.recipeName}>{recipe.name}</Text>

        {/* Per-serving nutrition card */}
        <View style={styles.nutritionCard}>
          <Text style={styles.cardTitle}>Per Serving</Text>
          <View style={styles.totalMain}>
            <Text style={styles.totalCalValue}>{recipe.calories}</Text>
            <Text style={styles.totalCalLabel}>kcal</Text>
          </View>
          <View style={styles.totalMacros}>
            <View style={styles.totalMacroCol}>
              <Text style={[styles.totalMacroValue, { color: Colors.macro.protein }]}>
                {Number(recipe.protein_g).toFixed(1)}g
              </Text>
              <Text style={styles.totalMacroLabel}>Protein</Text>
            </View>
            <View style={styles.totalMacroCol}>
              <Text style={[styles.totalMacroValue, { color: Colors.macro.carbs }]}>
                {Number(recipe.carbs_g).toFixed(1)}g
              </Text>
              <Text style={styles.totalMacroLabel}>Carbs</Text>
            </View>
            <View style={styles.totalMacroCol}>
              <Text style={[styles.totalMacroValue, { color: Colors.macro.fat }]}>
                {Number(recipe.fat_g).toFixed(1)}g
              </Text>
              <Text style={styles.totalMacroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{recipe.servings_count}</Text>
            <Text style={styles.infoLabel}>Servings</Text>
          </View>
          {recipe.total_weight_cooked_g != null && (
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{recipe.total_weight_cooked_g}g</Text>
              <Text style={styles.infoLabel}>Cooked Weight</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoValue}>{recipe.use_count}</Text>
            <Text style={styles.infoLabel}>Times Used</Text>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Ingredients ({recipe.ingredients?.length ?? 0})
          </Text>
          {(recipe.ingredients ?? []).map((ing) => (
            <View key={ing.id} style={styles.ingCard}>
              <View style={styles.ingInfo}>
                <Text style={styles.ingName} numberOfLines={1}>
                  {ing.food_name}
                </Text>
                <Text style={styles.ingDetail}>
                  {ing.amount_g}g  |  {ing.calories} kcal  |  P {Number(ing.protein_g).toFixed(1)}g  C {Number(ing.carbs_g).toFixed(1)}g  F {Number(ing.fat_g).toFixed(1)}g
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Log Recipe section */}
        <View style={styles.logSection}>
          <Text style={styles.sectionTitle}>Log Recipe</Text>

          {/* Meal type chips */}
          <View style={styles.mealTypeRow}>
            {MEAL_TYPE_ORDER.map((type) => {
              const config = MEAL_TYPES[type];
              const isActive = mealType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.mealTypeChip,
                    isActive && {
                      backgroundColor: config.color + '25',
                      borderColor: config.color,
                    },
                  ]}
                  onPress={() => setMealType(type)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.mealTypeText,
                      isActive && { color: config.color },
                    ]}
                  >
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Servings input */}
          <View style={styles.logInputRow}>
            <Text style={styles.logInputLabel}>Servings</Text>
            <TextInput
              style={styles.logInput}
              value={servingsText}
              onChangeText={setServingsText}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={Colors.text.muted}
            />
          </View>

          {/* Grams input (if recipe has cooked weight) */}
          {recipe.total_weight_cooked_g != null && (
            <>
              <TouchableOpacity
                style={styles.toggleGrams}
                onPress={() => setUseGrams(!useGrams)}
                activeOpacity={0.7}
              >
                <View style={[styles.toggleDot, useGrams && styles.toggleDotActive]} />
                <Text style={styles.toggleGramsText}>Log by weight instead</Text>
              </TouchableOpacity>
              {useGrams && (
                <View style={styles.logInputRow}>
                  <Text style={styles.logInputLabel}>Grams eaten</Text>
                  <TextInput
                    style={styles.logInput}
                    value={gramsText}
                    onChangeText={setGramsText}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.text.muted}
                  />
                </View>
              )}
            </>
          )}

          <TouchableOpacity
            style={styles.logBtn}
            onPress={handleLog}
            disabled={isLogging}
            activeOpacity={0.85}
          >
            {isLogging ? (
              <ActivityIndicator color={Colors.text.inverse} size="small" />
            ) : (
              <Text style={styles.logBtnText}>Log Recipe</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Edit / Delete buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push({ pathname: '/recipe/create', params: { editId: id } })}
            activeOpacity={0.7}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            {isDeleting ? (
              <ActivityIndicator color={Colors.status.error} size="small" />
            ) : (
              <Text style={styles.deleteBtnText}>Delete</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  recipeName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
  nutritionCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.sm,
  },
  cardTitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
  totalMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  totalCalValue: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
  },
  totalCalLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
  },
  totalMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalMacroCol: {
    alignItems: 'center',
    gap: 2,
  },
  totalMacroValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  totalMacroLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  infoItem: {
    alignItems: 'center',
    gap: 2,
  },
  infoValue: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  infoLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  ingCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ingInfo: {
    flex: 1,
    gap: 2,
  },
  ingName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  ingDetail: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  logSection: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.md,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  mealTypeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.primary,
  },
  mealTypeText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  logInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logInputLabel: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  logInput: {
    width: 80,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  toggleGrams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border.default,
  },
  toggleDotActive: {
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.brand.primary,
  },
  toggleGramsText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  logBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  logBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editBtn: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  editBtnText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  deleteBtn: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.status.error,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: Colors.status.error,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  emptyText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.base,
  },
});
