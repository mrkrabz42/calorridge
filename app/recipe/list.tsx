import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { useRecipeStore } from '../../store/recipeStore';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { Recipe } from '../../types';

export default function RecipeListScreen() {
  const insets = useSafeAreaInsets();
  const { recipes, isLoading, fetchRecipes } = useRecipeStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRecipes();
  }, []);

  const filtered = search.trim()
    ? recipes.filter((r) =>
        r.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : recipes;

  const handlePress = useCallback((recipe: Recipe) => {
    router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Recipe }) => (
      <RecipeCard recipe={item} onPress={() => handlePress(item)} />
    ),
    [handlePress]
  );

  return (
    <View style={styles.root}>
      {/* Create button */}
      <View style={[styles.header, { paddingTop: Spacing.md }]}>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/recipe/create')}
          activeOpacity={0.85}
        >
          <Text style={styles.createBtnText}>+ Create Recipe</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search recipes..."
          placeholderTextColor={Colors.text.muted}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {search.trim() ? 'No matching recipes' : 'No recipes yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search.trim()
                  ? 'Try a different search term.'
                  : 'Tap "Create Recipe" to get started.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  createBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  createBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchInput: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  emptySubtitle: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
  },
});
