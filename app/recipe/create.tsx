import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { useRecipeStore } from '../../store/recipeStore';

interface IngredientDraft {
  id: string;
  food_name: string;
  amount_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
}

export default function CreateRecipeScreen() {
  const insets = useSafeAreaInsets();
  const createRecipe = useRecipeStore((s) => s.createRecipe);

  const [name, setName] = useState('');
  const [servingsCount, setServingsCount] = useState('1');
  const [cookedWeight, setCookedWeight] = useState('');
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Inline ingredient form state
  const [showIngForm, setShowIngForm] = useState(false);
  const [ingName, setIngName] = useState('');
  const [ingGrams, setIngGrams] = useState('');
  const [ingCal, setIngCal] = useState('');
  const [ingProtein, setIngProtein] = useState('');
  const [ingCarbs, setIngCarbs] = useState('');
  const [ingFat, setIngFat] = useState('');
  const [ingFiber, setIngFiber] = useState('');

  const servings = Math.max(1, parseInt(servingsCount, 10) || 1);

  // Compute totals and per-serving
  const totalCal = ingredients.reduce((s, i) => s + i.calories, 0);
  const totalProtein = ingredients.reduce((s, i) => s + i.protein_g, 0);
  const totalCarbs = ingredients.reduce((s, i) => s + i.carbs_g, 0);
  const totalFat = ingredients.reduce((s, i) => s + i.fat_g, 0);

  const perServingCal = Math.round(totalCal / servings);
  const perServingProtein = Math.round((totalProtein / servings) * 10) / 10;
  const perServingCarbs = Math.round((totalCarbs / servings) * 10) / 10;
  const perServingFat = Math.round((totalFat / servings) * 10) / 10;

  const resetIngForm = () => {
    setIngName('');
    setIngGrams('');
    setIngCal('');
    setIngProtein('');
    setIngCarbs('');
    setIngFat('');
    setIngFiber('');
    setShowIngForm(false);
  };

  const handleAddIngredient = () => {
    const trimmedName = ingName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Ingredient name is required.');
      return;
    }
    const grams = parseFloat(ingGrams);
    const cal = parseFloat(ingCal);
    if (isNaN(grams) || grams <= 0 || isNaN(cal) || cal < 0) {
      Alert.alert('Error', 'Grams and calories are required.');
      return;
    }

    const newIng: IngredientDraft = {
      id: Date.now().toString(),
      food_name: trimmedName,
      amount_g: grams,
      calories: Math.round(cal),
      protein_g: parseFloat(ingProtein) || 0,
      carbs_g: parseFloat(ingCarbs) || 0,
      fat_g: parseFloat(ingFat) || 0,
      fiber_g: parseFloat(ingFiber) || undefined,
    };

    setIngredients((prev) => [...prev, newIng]);
    resetIngForm();
  };

  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Recipe name is required.');
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert('Error', 'Add at least one ingredient.');
      return;
    }

    setIsSaving(true);
    try {
      const parsedWeight = parseFloat(cookedWeight);
      await createRecipe({
        name: trimmedName,
        servings_count: servings,
        total_weight_cooked_g: !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined,
        ingredients: ingredients.map((i) => ({
          food_name: i.food_name,
          amount_g: i.amount_g,
          calories: i.calories,
          protein_g: i.protein_g,
          carbs_g: i.carbs_g,
          fat_g: i.fat_g,
          fiber_g: i.fiber_g,
        })),
      });

      if (router.canGoBack()) {
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save recipe.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Per-serving totals card */}
        <View style={styles.totalsCard}>
          <Text style={styles.totalsTitle}>Per Serving</Text>
          <View style={styles.totalMain}>
            <Text style={styles.totalCalValue}>{perServingCal}</Text>
            <Text style={styles.totalCalLabel}>kcal</Text>
          </View>
          <View style={styles.totalMacros}>
            <View style={styles.totalMacroCol}>
              <Text style={[styles.totalMacroValue, { color: Colors.macro.protein }]}>
                {perServingProtein.toFixed(1)}g
              </Text>
              <Text style={styles.totalMacroLabel}>Protein</Text>
            </View>
            <View style={styles.totalMacroCol}>
              <Text style={[styles.totalMacroValue, { color: Colors.macro.carbs }]}>
                {perServingCarbs.toFixed(1)}g
              </Text>
              <Text style={styles.totalMacroLabel}>Carbs</Text>
            </View>
            <View style={styles.totalMacroCol}>
              <Text style={[styles.totalMacroValue, { color: Colors.macro.fat }]}>
                {perServingFat.toFixed(1)}g
              </Text>
              <Text style={styles.totalMacroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Recipe name */}
        <View style={styles.section}>
          <Text style={styles.label}>Recipe Name</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Chicken Stir Fry"
            placeholderTextColor={Colors.text.muted}
          />
        </View>

        {/* Servings + Cooked weight row */}
        <View style={styles.row}>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.label}>Servings</Text>
            <TextInput
              style={styles.textInput}
              value={servingsCount}
              onChangeText={setServingsCount}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={Colors.text.muted}
            />
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.label}>Cooked Weight (g)</Text>
            <TextInput
              style={styles.textInput}
              value={cookedWeight}
              onChangeText={setCookedWeight}
              keyboardType="decimal-pad"
              placeholder="Optional"
              placeholderTextColor={Colors.text.muted}
            />
          </View>
        </View>

        {/* Ingredients list */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Ingredients ({ingredients.length})
          </Text>
          {ingredients.length === 0 && (
            <Text style={styles.emptyText}>No ingredients added yet</Text>
          )}
          {ingredients.map((ing) => (
            <View key={ing.id} style={styles.ingCard}>
              <View style={styles.ingInfo}>
                <Text style={styles.ingName} numberOfLines={1}>
                  {ing.food_name}
                </Text>
                <Text style={styles.ingDetail}>
                  {ing.amount_g}g  |  {ing.calories} kcal  |  P {ing.protein_g}g  C {ing.carbs_g}g  F {ing.fat_g}g
                </Text>
              </View>
              <TouchableOpacity
                style={styles.ingDeleteBtn}
                onPress={() => removeIngredient(ing.id)}
              >
                <Text style={styles.ingDeleteText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Inline add ingredient form */}
        {showIngForm ? (
          <View style={styles.ingFormCard}>
            <Text style={styles.ingFormTitle}>Add Ingredient</Text>
            <TextInput
              style={styles.textInput}
              value={ingName}
              onChangeText={setIngName}
              placeholder="Ingredient name"
              placeholderTextColor={Colors.text.muted}
            />
            <View style={styles.row}>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.smallLabel}>Grams</Text>
                <TextInput
                  style={styles.textInput}
                  value={ingGrams}
                  onChangeText={setIngGrams}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.text.muted}
                />
              </View>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.smallLabel}>Calories</Text>
                <TextInput
                  style={styles.textInput}
                  value={ingCal}
                  onChangeText={setIngCal}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.text.muted}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.smallLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.textInput}
                  value={ingProtein}
                  onChangeText={setIngProtein}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.text.muted}
                />
              </View>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.smallLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.textInput}
                  value={ingCarbs}
                  onChangeText={setIngCarbs}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.text.muted}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.smallLabel}>Fat (g)</Text>
                <TextInput
                  style={styles.textInput}
                  value={ingFat}
                  onChangeText={setIngFat}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.text.muted}
                />
              </View>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.smallLabel}>Fiber (g)</Text>
                <TextInput
                  style={styles.textInput}
                  value={ingFiber}
                  onChangeText={setIngFiber}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.text.muted}
                />
              </View>
            </View>
            <View style={styles.ingFormActions}>
              <TouchableOpacity
                style={styles.ingFormCancelBtn}
                onPress={resetIngForm}
              >
                <Text style={styles.ingFormCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ingFormAddBtn}
                onPress={handleAddIngredient}
              >
                <Text style={styles.ingFormAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addIngBtn}
            onPress={() => setShowIngForm(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addIngBtnText}>+ Add Ingredient</Text>
          </TouchableOpacity>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            (ingredients.length === 0 || !name.trim()) && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={ingredients.length === 0 || !name.trim() || isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.text.inverse} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Recipe</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  totalsCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.sm,
  },
  totalsTitle: {
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
  section: {
    gap: Spacing.sm,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  smallLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  textInput: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.md,
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
  ingDeleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.status.error + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  ingDeleteText: {
    color: Colors.status.error,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  addIngBtn: {
    backgroundColor: Colors.brand.primary + '20',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '50',
    borderStyle: 'dashed',
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  addIngBtnText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  ingFormCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '50',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  ingFormTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  ingFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  ingFormCancelBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  ingFormCancelText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  ingFormAddBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand.primary,
  },
  ingFormAddText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  saveBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
});
