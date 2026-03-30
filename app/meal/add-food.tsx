import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { foodDiaryService } from '../../services/foodDiaryService';
import { usePlateBuildStore } from '../../store/plateBuildStore';
import { CustomFood } from '../../types/meal';
import { Colors, Typography, Spacing, Radius } from '../../constants';

type TabKey = 'search' | 'recent' | 'myFoods';

interface SearchResult {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  serving_size: string;
}

// ---------------------------------------------------------------------------
// Search Tab
// ---------------------------------------------------------------------------
function SearchTab() {
  const addItem = usePlateBuildStore((s) => s.addItem);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [servingsText, setServingsText] = useState('1');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    setExpandedIdx(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-food', {
        body: { query: q.trim() },
      });
      if (error) throw error;
      setResults((data?.results ?? []) as SearchResult[]);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 600);
  };

  const handleAdd = (result: SearchResult) => {
    const servings = parseFloat(servingsText) || 1;
    addItem({
      food_name: result.name,
      servings,
      serving_size: result.serving_size,
      calories_per_serving: result.calories,
      protein_per_serving: result.protein_g,
      carbs_per_serving: result.carbs_g,
      fat_per_serving: result.fat_g,
      fiber_per_serving: result.fiber_g,
      source: 'search',
    });
    router.back();
  };

  return (
    <View style={tabStyles.container}>
      <TextInput
        style={tabStyles.searchInput}
        value={query}
        onChangeText={handleQueryChange}
        placeholder="Search any food..."
        placeholderTextColor={Colors.text.muted}
        autoFocus
        returnKeyType="search"
        onSubmitEditing={() => doSearch(query)}
      />
      {isSearching && (
        <ActivityIndicator
          color={Colors.brand.primary}
          size="small"
          style={{ marginVertical: Spacing.md }}
        />
      )}
      <ScrollView style={tabStyles.resultsList} keyboardShouldPersistTaps="handled">
        {results.map((r, idx) => (
          <View key={`${r.name}-${idx}`}>
            <TouchableOpacity
              style={tabStyles.resultCard}
              onPress={() => {
                setExpandedIdx(expandedIdx === idx ? null : idx);
                setServingsText('1');
              }}
              activeOpacity={0.7}
            >
              <View style={tabStyles.resultInfo}>
                <Text style={tabStyles.resultName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={tabStyles.resultServing}>{r.serving_size}</Text>
              </View>
              <View style={tabStyles.resultMacros}>
                <Text style={tabStyles.resultCal}>{r.calories} kcal</Text>
                <Text style={tabStyles.resultDetail}>
                  P {r.protein_g}g  C {r.carbs_g}g  F {r.fat_g}g
                </Text>
              </View>
            </TouchableOpacity>
            {expandedIdx === idx && (
              <View style={tabStyles.expandedRow}>
                <Text style={tabStyles.expandedLabel}>Servings</Text>
                <TouchableOpacity
                  style={tabStyles.stepBtn}
                  onPress={() => {
                    const val = Math.max(0.5, (parseFloat(servingsText) || 1) - 0.5);
                    setServingsText(String(val));
                  }}
                >
                  <Text style={tabStyles.stepText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={tabStyles.servingsInput}
                  value={servingsText}
                  onChangeText={setServingsText}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={tabStyles.stepBtn}
                  onPress={() => {
                    const val = (parseFloat(servingsText) || 1) + 0.5;
                    setServingsText(String(val));
                  }}
                >
                  <Text style={tabStyles.stepText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={tabStyles.addBtn}
                  onPress={() => handleAdd(r)}
                >
                  <Text style={tabStyles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        {!isSearching && query.trim().length > 0 && results.length === 0 && (
          <Text style={tabStyles.noResults}>No results found. Try a different search.</Text>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Recent Tab
// ---------------------------------------------------------------------------
function RecentTab() {
  const addItem = usePlateBuildStore((s) => s.addItem);
  const [recentFoods, setRecentFoods] = useState<Array<{
    food_name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; serving_size: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    foodDiaryService.getRecentFoods(20).then((foods) => {
      setRecentFoods(foods);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const handleTap = (food: typeof recentFoods[0]) => {
    addItem({
      food_name: food.food_name,
      servings: 1,
      serving_size: food.serving_size,
      calories_per_serving: food.calories,
      protein_per_serving: Number(food.protein_g),
      carbs_per_serving: Number(food.carbs_g),
      fat_per_serving: Number(food.fat_g),
      source: 'saved',
    });
    router.back();
  };

  if (isLoading) {
    return (
      <View style={tabStyles.centred}>
        <ActivityIndicator color={Colors.brand.primary} />
      </View>
    );
  }

  if (recentFoods.length === 0) {
    return (
      <View style={tabStyles.centred}>
        <Text style={tabStyles.emptyText}>No recent foods yet. Log your first meal to see items here.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={tabStyles.resultsList} keyboardShouldPersistTaps="handled">
      {recentFoods.map((food, idx) => (
        <TouchableOpacity
          key={`${food.food_name}-${idx}`}
          style={tabStyles.resultCard}
          onPress={() => handleTap(food)}
          activeOpacity={0.7}
        >
          <View style={tabStyles.resultInfo}>
            <Text style={tabStyles.resultName} numberOfLines={1}>
              {food.food_name}
            </Text>
            <Text style={tabStyles.resultServing}>{food.serving_size}</Text>
          </View>
          <View style={tabStyles.resultMacros}>
            <Text style={tabStyles.resultCal}>{food.calories} kcal</Text>
            <Text style={tabStyles.resultDetail}>
              P {Number(food.protein_g).toFixed(0)}g  C {Number(food.carbs_g).toFixed(0)}g  F {Number(food.fat_g).toFixed(0)}g
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// My Foods Tab
// ---------------------------------------------------------------------------
function MyFoodsTab() {
  const addItem = usePlateBuildStore((s) => s.addItem);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCalories, setFormCalories] = useState('');
  const [formProtein, setFormProtein] = useState('');
  const [formCarbs, setFormCarbs] = useState('');
  const [formFat, setFormFat] = useState('');
  const [formServingSize, setFormServingSize] = useState('1 serving');
  const [isSaving, setIsSaving] = useState(false);

  const loadFoods = useCallback(async () => {
    try {
      const foods = await foodDiaryService.getCustomFoods();
      setCustomFoods(foods);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFoods();
  }, [loadFoods]);

  const handleTapFood = (food: CustomFood) => {
    addItem({
      food_name: food.name,
      brand: food.brand ?? undefined,
      servings: 1,
      serving_size: food.serving_size,
      calories_per_serving: food.calories,
      protein_per_serving: Number(food.protein_g),
      carbs_per_serving: Number(food.carbs_g),
      fat_per_serving: Number(food.fat_g),
      fiber_per_serving: food.fiber_g ? Number(food.fiber_g) : undefined,
      source: 'custom',
      source_id: food.id,
    });
    router.back();
  };

  const handleSaveAndAdd = async () => {
    const cal = parseInt(formCalories, 10);
    if (!formName.trim() || isNaN(cal)) return;

    setIsSaving(true);
    try {
      const created = await foodDiaryService.createCustomFood({
        name: formName.trim(),
        brand: null,
        serving_size: formServingSize.trim() || '1 serving',
        serving_grams: null,
        calories: cal,
        protein_g: parseFloat(formProtein) || 0,
        carbs_g: parseFloat(formCarbs) || 0,
        fat_g: parseFloat(formFat) || 0,
        fiber_g: null,
      });

      addItem({
        food_name: created.name,
        servings: 1,
        serving_size: created.serving_size,
        calories_per_serving: created.calories,
        protein_per_serving: Number(created.protein_g),
        carbs_per_serving: Number(created.carbs_g),
        fat_per_serving: Number(created.fat_g),
        source: 'custom',
        source_id: created.id,
      });
      router.back();
    } catch {
      // reset
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={tabStyles.centred}>
        <ActivityIndicator color={Colors.brand.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={tabStyles.resultsList} keyboardShouldPersistTaps="handled">
      {customFoods.map((food) => (
        <TouchableOpacity
          key={food.id}
          style={tabStyles.resultCard}
          onPress={() => handleTapFood(food)}
          activeOpacity={0.7}
        >
          <View style={tabStyles.resultInfo}>
            <Text style={tabStyles.resultName} numberOfLines={1}>
              {food.name}
            </Text>
            <Text style={tabStyles.resultServing}>{food.serving_size}</Text>
          </View>
          <View style={tabStyles.resultMacros}>
            <Text style={tabStyles.resultCal}>{food.calories} kcal</Text>
            <Text style={tabStyles.resultDetail}>
              P {Number(food.protein_g).toFixed(0)}g  C {Number(food.carbs_g).toFixed(0)}g  F {Number(food.fat_g).toFixed(0)}g
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      {!showForm ? (
        <TouchableOpacity
          style={tabStyles.createBtn}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
        >
          <Text style={tabStyles.createBtnText}>+ Create New Food</Text>
        </TouchableOpacity>
      ) : (
        <View style={tabStyles.formContainer}>
          <Text style={tabStyles.formTitle}>Create Custom Food</Text>
          <TextInput
            style={tabStyles.formInput}
            value={formName}
            onChangeText={setFormName}
            placeholder="Food name"
            placeholderTextColor={Colors.text.muted}
          />
          <TextInput
            style={tabStyles.formInput}
            value={formServingSize}
            onChangeText={setFormServingSize}
            placeholder="Serving size (e.g. 100g, 1 cup)"
            placeholderTextColor={Colors.text.muted}
          />
          <View style={tabStyles.formRow}>
            <View style={tabStyles.formField}>
              <Text style={tabStyles.formLabel}>Calories</Text>
              <TextInput
                style={tabStyles.formInput}
                value={formCalories}
                onChangeText={setFormCalories}
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                keyboardType="number-pad"
              />
            </View>
            <View style={tabStyles.formField}>
              <Text style={tabStyles.formLabel}>Protein (g)</Text>
              <TextInput
                style={tabStyles.formInput}
                value={formProtein}
                onChangeText={setFormProtein}
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={tabStyles.formRow}>
            <View style={tabStyles.formField}>
              <Text style={tabStyles.formLabel}>Carbs (g)</Text>
              <TextInput
                style={tabStyles.formInput}
                value={formCarbs}
                onChangeText={setFormCarbs}
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={tabStyles.formField}>
              <Text style={tabStyles.formLabel}>Fat (g)</Text>
              <TextInput
                style={tabStyles.formInput}
                value={formFat}
                onChangeText={setFormFat}
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={tabStyles.formActions}>
            <TouchableOpacity
              style={tabStyles.formCancelBtn}
              onPress={() => setShowForm(false)}
            >
              <Text style={tabStyles.formCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[tabStyles.formSaveBtn, (!formName.trim() || !formCalories) && { opacity: 0.4 }]}
              onPress={handleSaveAndAdd}
              disabled={!formName.trim() || !formCalories || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.text.inverse} size="small" />
              ) : (
                <Text style={tabStyles.formSaveText}>Save and Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Tab styles shared
// ---------------------------------------------------------------------------
const tabStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.sm,
  },
  resultsList: {
    flex: 1,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  resultServing: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  resultMacros: {
    alignItems: 'flex-end',
  },
  resultCal: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  resultDetail: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  expandedLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand.primary + '25',
    borderWidth: 1,
    borderColor: Colors.brand.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  servingsInput: {
    width: 50,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    paddingVertical: Spacing.xs,
  },
  addBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  noResults: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  createBtn: {
    backgroundColor: Colors.brand.primary + '20',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '50',
    borderStyle: 'dashed',
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  createBtnText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  formContainer: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  formTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  formInput: {
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  formField: {
    flex: 1,
    gap: 4,
  },
  formLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  formCancelBtn: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  formCancelText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  formSaveBtn: {
    flex: 2,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  formSaveText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('search');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'search', label: 'Search' },
    { key: 'recent', label: 'Recent' },
    { key: 'myFoods', label: 'My Foods' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {/* Tab bar */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === 'search' && <SearchTab />}
          {activeTab === 'recent' && <RecentTab />}
          {activeTab === 'myFoods' && <MyFoodsTab />}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabActive: {
    backgroundColor: Colors.brand.primary + '25',
  },
  tabText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  tabTextActive: {
    color: Colors.brand.primary,
    fontWeight: Typography.weights.bold,
  },
  tabContent: {
    flex: 1,
  },
});
