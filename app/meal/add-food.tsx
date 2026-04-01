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
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { foodDiaryService } from '../../services/foodDiaryService';
import { usePlateBuildStore, PlateItem } from '../../store/plateBuildStore';
import { useSavedMealsStore } from '../../store/savedMealsStore';
import { CustomFood, MealType, SavedMeal } from '../../types/meal';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { MEAL_TYPE_ORDER, MEAL_TYPES } from '../../constants/mealTypes';

type TabKey = 'all' | 'myMeals' | 'myRecipes' | 'myFoods';

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
// Food Row — one-tap "+" to add, matching MFP style
// ---------------------------------------------------------------------------
function FoodRow({
  name,
  subtitle,
  calories,
  onAdd,
}: {
  name: string;
  subtitle: string;
  calories: number;
  onAdd: () => void;
}) {
  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name} numberOfLines={1}>{name}</Text>
        <Text style={rowStyles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <TouchableOpacity style={rowStyles.addBtn} onPress={onAdd} activeOpacity={0.6}>
        <Text style={rowStyles.addIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.default,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  subtitle: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  addIcon: {
    color: Colors.brand.primary,
    fontSize: 20,
    fontWeight: Typography.weights.bold,
    marginTop: -1,
  },
});

// ---------------------------------------------------------------------------
// Action Cards (Scan Barcode + Photo Log)
// ---------------------------------------------------------------------------
function ActionCards() {
  return (
    <View style={actionStyles.row}>
      <TouchableOpacity
        style={actionStyles.card}
        onPress={() => router.push('/meal/barcode')}
        activeOpacity={0.7}
      >
        <Text style={actionStyles.cardIcon}>||||</Text>
        <Text style={actionStyles.cardLabel}>Scan a Barcode</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={actionStyles.card}
        onPress={() => router.push('/meal/photo-capture')}
        activeOpacity={0.7}
      >
        <Text style={actionStyles.cardIcon}>cam</Text>
        <Text style={actionStyles.cardLabel}>Photo Log</Text>
      </TouchableOpacity>
    </View>
  );
}

const actionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardIcon: {
    color: Colors.brand.primary,
    fontSize: 28,
    fontWeight: Typography.weights.bold,
  },
  cardLabel: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});

// ---------------------------------------------------------------------------
// All Tab — action cards + recent/search results
// ---------------------------------------------------------------------------
function AllTab({ searchQuery, isSearching, searchResults, onSearch }: {
  searchQuery: string;
  isSearching: boolean;
  searchResults: SearchResult[];
  onSearch: (q: string) => void;
}) {
  const addItem = usePlateBuildStore((s) => s.addItem);
  const [myFoods, setMyFoods] = useState<CustomFood[]>([]);
  const [isLoadingFoods, setIsLoadingFoods] = useState(true);

  useEffect(() => {
    foodDiaryService.getCustomFoods().then((foods) => {
      setMyFoods(foods);
      setIsLoadingFoods(false);
    }).catch(() => setIsLoadingFoods(false));
  }, []);

  const handleAddFood = (food: CustomFood) => {
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
    foodDiaryService.incrementUseCount(food.id).catch(() => {});
  };

  const handleAddSearchResult = (r: SearchResult) => {
    addItem({
      food_name: r.name,
      servings: 1,
      serving_size: r.serving_size,
      calories_per_serving: r.calories,
      protein_per_serving: r.protein_g,
      carbs_per_serving: r.carbs_g,
      fat_per_serving: r.fat_g,
      fiber_per_serving: r.fiber_g,
      source: 'search',
    });
    // Auto-save to food library
    foodDiaryService.upsertToFoodLibrary({
      name: r.name,
      serving_size: r.serving_size,
      calories: r.calories,
      protein_g: r.protein_g,
      carbs_g: r.carbs_g,
      fat_g: r.fat_g,
      fiber_g: r.fiber_g,
    }).catch(() => {});
  };

  const showSearchResults = searchQuery.trim().length > 0;

  if (showSearchResults) {
    return (
      <ScrollView keyboardShouldPersistTaps="handled">
        {isSearching && (
          <ActivityIndicator color={Colors.brand.primary} style={{ marginVertical: Spacing.lg }} />
        )}
        {searchResults.map((r, idx) => (
          <FoodRow
            key={`${r.name}-${idx}`}
            name={r.name}
            subtitle={`${r.calories} cal, ${r.serving_size}`}
            calories={r.calories}
            onAdd={() => handleAddSearchResult(r)}
          />
        ))}
        {!isSearching && searchResults.length === 0 && searchQuery.trim().length > 0 && (
          <Text style={emptyStyles.text}>No results found. Try a different search.</Text>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <ActionCards />

      {/* History section */}
      <View style={sectionStyles.header}>
        <Text style={sectionStyles.title}>History</Text>
        <Text style={sectionStyles.sort}>Most Recent</Text>
      </View>

      {isLoadingFoods ? (
        <ActivityIndicator color={Colors.brand.primary} style={{ marginVertical: Spacing.lg }} />
      ) : myFoods.length === 0 ? (
        <Text style={emptyStyles.text}>No food history yet. Search or scan to get started.</Text>
      ) : (
        myFoods.map((food) => (
          <FoodRow
            key={food.id}
            name={food.name}
            subtitle={`${food.calories} cal, ${food.serving_size}${food.brand ? `, ${food.brand}` : ''}`}
            calories={food.calories}
            onAdd={() => handleAddFood(food)}
          />
        ))
      )}

      {/* Create custom food link */}
      <TouchableOpacity
        style={sectionStyles.createLink}
        onPress={() => router.push('/meal/quick-log')}
        activeOpacity={0.7}
      >
        <Text style={sectionStyles.createLinkText}>+ Create a Food</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// My Meals Tab
// ---------------------------------------------------------------------------
function MyMealsTab() {
  const { savedMeals, fetchSavedMeals, isLoading } = useSavedMealsStore();
  const addItem = usePlateBuildStore((s) => s.addItem);

  useEffect(() => {
    fetchSavedMeals();
  }, []);

  const handleAdd = (meal: SavedMeal) => {
    // Add as single plate item representing the whole saved meal
    addItem({
      food_name: meal.name,
      servings: 1,
      serving_size: '1 meal',
      calories_per_serving: meal.calories,
      protein_per_serving: Number(meal.protein_g),
      carbs_per_serving: Number(meal.carbs_g),
      fat_per_serving: Number(meal.fat_g),
      fiber_per_serving: meal.fiber_g ? Number(meal.fiber_g) : undefined,
      source: 'saved',
    });
  };

  if (isLoading) {
    return <ActivityIndicator color={Colors.brand.primary} style={{ marginVertical: Spacing.lg }} />;
  }

  if (savedMeals.length === 0) {
    return <Text style={emptyStyles.text}>No saved meals yet. Save a meal from the plate builder.</Text>;
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {savedMeals.map((meal) => (
        <FoodRow
          key={meal.id}
          name={meal.name}
          subtitle={`${meal.calories} cal, P ${Number(meal.protein_g).toFixed(0)}g  C ${Number(meal.carbs_g).toFixed(0)}g  F ${Number(meal.fat_g).toFixed(0)}g`}
          calories={meal.calories}
          onAdd={() => handleAdd(meal)}
        />
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// My Recipes Tab (placeholder until Sprint 4)
// ---------------------------------------------------------------------------
function MyRecipesTab() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.title}>My Recipes</Text>
      <Text style={emptyStyles.text}>Create recipes to log multi-ingredient dishes as a single entry.</Text>
      <TouchableOpacity
        style={sectionStyles.createLink}
        onPress={() => router.push('/recipe/create')}
        activeOpacity={0.7}
      >
        <Text style={sectionStyles.createLinkText}>+ Create a Recipe</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// My Foods Tab — custom foods library with create form
// ---------------------------------------------------------------------------
function MyFoodsTab({ searchQuery }: { searchQuery: string }) {
  const addItem = usePlateBuildStore((s) => s.addItem);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formCalories, setFormCalories] = useState('');
  const [formProtein, setFormProtein] = useState('');
  const [formCarbs, setFormCarbs] = useState('');
  const [formFat, setFormFat] = useState('');
  const [formServingSize, setFormServingSize] = useState('1 serving');
  const [isSaving, setIsSaving] = useState(false);

  const loadFoods = useCallback(async () => {
    try {
      const foods = searchQuery.trim()
        ? await foodDiaryService.searchCustomFoods(searchQuery.trim())
        : await foodDiaryService.getCustomFoods();
      setCustomFoods(foods);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    setIsLoading(true);
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
    foodDiaryService.incrementUseCount(food.id).catch(() => {});
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
      setShowForm(false);
      loadFoods();
    } catch {
      // silent
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <ActivityIndicator color={Colors.brand.primary} style={{ marginVertical: Spacing.lg }} />;
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {customFoods.map((food) => (
        <FoodRow
          key={food.id}
          name={food.name}
          subtitle={`${food.calories} cal, ${food.serving_size}${food.brand ? `, ${food.brand}` : ''}`}
          calories={food.calories}
          onAdd={() => handleTapFood(food)}
        />
      ))}

      {!showForm ? (
        <TouchableOpacity
          style={sectionStyles.createLink}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
        >
          <Text style={sectionStyles.createLinkText}>+ Create New Food</Text>
        </TouchableOpacity>
      ) : (
        <View style={formStyles.container}>
          <Text style={formStyles.title}>Create Custom Food</Text>
          <TextInput
            style={formStyles.input}
            value={formName}
            onChangeText={setFormName}
            placeholder="Food name"
            placeholderTextColor={Colors.text.muted}
          />
          <TextInput
            style={formStyles.input}
            value={formServingSize}
            onChangeText={setFormServingSize}
            placeholder="Serving size (e.g. 100g, 1 cup)"
            placeholderTextColor={Colors.text.muted}
          />
          <View style={formStyles.row}>
            <View style={formStyles.field}>
              <Text style={formStyles.label}>Calories</Text>
              <TextInput
                style={formStyles.input}
                value={formCalories}
                onChangeText={setFormCalories}
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                keyboardType="number-pad"
              />
            </View>
            <View style={formStyles.field}>
              <Text style={formStyles.label}>Protein (g)</Text>
              <TextInput
                style={formStyles.input}
                value={formProtein}
                onChangeText={setFormProtein}
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={formStyles.row}>
            <View style={formStyles.field}>
              <Text style={formStyles.label}>Carbs (g)</Text>
              <TextInput
                style={formStyles.input}
                value={formCarbs}
                onChangeText={setFormCarbs}
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={formStyles.field}>
              <Text style={formStyles.label}>Fat (g)</Text>
              <TextInput
                style={formStyles.input}
                value={formFat}
                onChangeText={setFormFat}
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={formStyles.actions}>
            <TouchableOpacity
              style={formStyles.cancelBtn}
              onPress={() => setShowForm(false)}
            >
              <Text style={formStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[formStyles.saveBtn, (!formName.trim() || !formCalories) && { opacity: 0.4 }]}
              onPress={handleSaveAndAdd}
              disabled={!formName.trim() || !formCalories || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.text.inverse} size="small" />
              ) : (
                <Text style={formStyles.saveText}>Save and Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Floating Plate Bar
// ---------------------------------------------------------------------------
function PlateBar() {
  const items = usePlateBuildStore((s) => s.items);
  const getTotals = usePlateBuildStore((s) => s.getTotals);
  const insets = useSafeAreaInsets();

  if (items.length === 0) return null;

  const totals = getTotals();

  return (
    <TouchableOpacity
      style={[plateBarStyles.container, { paddingBottom: insets.bottom + 8 }]}
      onPress={() => router.push('/meal/log')}
      activeOpacity={0.9}
    >
      <View style={plateBarStyles.content}>
        <View style={plateBarStyles.info}>
          <Text style={plateBarStyles.count}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
          <Text style={plateBarStyles.cal}>{totals.calories} kcal</Text>
        </View>
        <View style={plateBarStyles.reviewBtn}>
          <Text style={plateBarStyles.reviewText}>Review Plate</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const plateBarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bg.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    paddingTop: 12,
    paddingHorizontal: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    gap: 2,
  },
  count: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  cal: {
    color: Colors.macro.calories,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  reviewBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  reviewText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
});

// ---------------------------------------------------------------------------
// Main Component — MFP-style unified screen
// ---------------------------------------------------------------------------
export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const mealType = usePlateBuildStore((s) => s.mealType);
  const setMealType = usePlateBuildStore((s) => s.setMealType);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [showMealPicker, setShowMealPicker] = useState(false);

  // Search state (shared across tabs that need it)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-food', {
        body: { query: q.trim() },
      });
      if (error) throw error;
      setSearchResults((data?.results ?? []) as SearchResult[]);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (activeTab === 'all' || activeTab === 'myFoods') {
      debounceRef.current = setTimeout(() => {
        if (activeTab === 'all') doSearch(text);
      }, 600);
    }
  };

  const mealConfig = MEAL_TYPES[mealType];

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'myMeals', label: 'My Meals' },
    { key: 'myRecipes', label: 'My Recipes' },
    { key: 'myFoods', label: 'My Foods' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header — meal type picker */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeText}>X</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mealPickerBtn}
            onPress={() => setShowMealPicker(!showMealPicker)}
            activeOpacity={0.7}
          >
            <Text style={[styles.mealPickerText, { color: mealConfig.color }]}>
              {mealConfig.label}
            </Text>
            <Text style={styles.mealPickerArrow}>{showMealPicker ? '\u25B2' : '\u25BC'}</Text>
          </TouchableOpacity>
          <View style={{ width: 36 }} />
        </View>

        {/* Meal type dropdown */}
        {showMealPicker && (
          <View style={styles.mealDropdown}>
            {MEAL_TYPE_ORDER.map((type) => {
              const config = MEAL_TYPES[type];
              const isActive = mealType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.mealDropdownItem, isActive && { backgroundColor: config.color + '20' }]}
                  onPress={() => {
                    setMealType(type);
                    setShowMealPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.mealDropdownText, { color: isActive ? config.color : Colors.text.secondary }]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>Q</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleQueryChange}
            placeholder="Search for a food"
            placeholderTextColor={Colors.text.muted}
            returnKeyType="search"
            onSubmitEditing={() => doSearch(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Text style={styles.clearIcon}>X</Text>
            </TouchableOpacity>
          )}
        </View>

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
          {activeTab === 'all' && (
            <AllTab
              searchQuery={searchQuery}
              isSearching={isSearching}
              searchResults={searchResults}
              onSearch={doSearch}
            />
          )}
          {activeTab === 'myMeals' && <MyMealsTab />}
          {activeTab === 'myRecipes' && <MyRecipesTab />}
          {activeTab === 'myFoods' && <MyFoodsTab searchQuery={searchQuery} />}
        </View>

        {/* Floating plate bar */}
        <PlateBar />
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Section styles
// ---------------------------------------------------------------------------
const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  sort: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
  createLink: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  createLinkText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  text: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
});

const formStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.sm,
    margin: Spacing.md,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  field: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  saveText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
});

// ---------------------------------------------------------------------------
// Main styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  mealPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  mealPickerText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  mealPickerArrow: {
    color: Colors.text.muted,
    fontSize: 10,
  },
  mealDropdown: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  mealDropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  mealDropdownText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchIcon: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  searchInput: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    paddingVertical: Spacing.md,
  },
  clearIcon: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.default,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.brand.primary,
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
