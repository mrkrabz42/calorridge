import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { searchService, FoodSearchResult } from '../../services/searchService';
import { Colors, Typography, Spacing, Radius } from '../../constants';

export default function SearchFoodScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await searchService.searchFood(q.trim());
      setResults(r);
    } catch {
      setError('Search failed. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 800);
  };

  const handleSelect = (item: FoodSearchResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/meal/confirm',
      params: {
        searchResult: JSON.stringify(item),
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Search input */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>Search</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleChange}
          placeholder="Search any food... (e.g. chicken breast, Big Mac)"
          placeholderTextColor={Colors.text.muted}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => doSearch(query)}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.brand.primary} size="large" />
          <Text style={styles.loadingText}>Searching nutrition data...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.length > 0 && !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {query.length < 3
                    ? 'Type at least 3 characters...'
                    : 'No results. Try a different search.'}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🍔</Text>
                <Text style={styles.emptyTitle}>Search for any food</Text>
                <Text style={styles.emptyText}>
                  Brand names, restaurant meals, recipes, or generic foods
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultCard}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <View style={styles.resultHeader}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultServing}>{item.serving_size}</Text>
              </View>
              <View style={styles.macroRow}>
                <MacroPill label="Cal" value={item.calories} color={Colors.macro.calories} />
                <MacroPill label="P" value={item.protein_g} unit="g" color={Colors.macro.protein} />
                <MacroPill label="C" value={item.carbs_g} unit="g" color={Colors.macro.carbs} />
                <MacroPill label="F" value={item.fat_g} unit="g" color={Colors.macro.fat} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function MacroPill({ label, value, unit, color }: { label: string; value: number; unit?: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color + '40' }]}>
      <Text style={[styles.pillValue, { color }]}>{Math.round(value)}{unit ?? ''}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    margin: Spacing.md,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    paddingVertical: Spacing.sm + 2,
  },
  clearBtn: { color: Colors.text.muted, fontSize: 16 },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  error: {
    color: Colors.status.error,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: { color: Colors.text.secondary, fontSize: Typography.sizes.sm },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: Spacing.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  emptyText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  resultCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultName: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  resultServing: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    gap: 1,
  },
  pillValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  pillLabel: {
    color: Colors.text.muted,
    fontSize: 9,
  },
});
