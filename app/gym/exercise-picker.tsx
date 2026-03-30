import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useGymStore } from '../../store/gymStore';
import { GymExercise, GymExerciseCategory } from '../../types/gym';
import { Colors, Typography, Spacing, Radius } from '../../constants';

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'chest', label: 'Chest' },
  { key: 'back', label: 'Back' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'biceps', label: 'Biceps' },
  { key: 'triceps', label: 'Triceps' },
  { key: 'quads', label: 'Quads' },
  { key: 'hamstrings', label: 'Hamstrings' },
  { key: 'glutes', label: 'Glutes' },
  { key: 'calves', label: 'Calves' },
  { key: 'abs', label: 'Abs' },
  { key: 'cardio', label: 'Cardio' },
];

export default function ExercisePickerScreen() {
  const { exerciseLibrary, isLibraryLoading, fetchExerciseLibrary, addExercise } =
    useGymStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchExerciseLibrary(
      selectedCategory === 'all' ? undefined : selectedCategory,
      search.trim() || undefined
    );
  }, [selectedCategory]);

  const handleSearch = useCallback(() => {
    fetchExerciseLibrary(
      selectedCategory === 'all' ? undefined : selectedCategory,
      search.trim() || undefined
    );
  }, [selectedCategory, search, fetchExerciseLibrary]);

  const handleSelect = async (exercise: GymExercise) => {
    await addExercise(exercise.id);
    router.back();
  };

  const renderExercise = ({ item }: { item: GymExercise }) => (
    <TouchableOpacity
      style={styles.exerciseRow}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <View style={styles.badges}>
          {item.equipment && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.equipment.replace('_', ' ')}</Text>
            </View>
          )}
          {item.primary_muscles.slice(0, 2).map((m) => (
            <View key={m} style={[styles.badge, styles.muscleBadge]}>
              <Text style={styles.muscleBadgeText}>{m.replace('_', ' ')}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.addIcon}>+</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Exercise</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          placeholder="Search exercises..."
          placeholderTextColor={Colors.text.muted}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Category chips */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.chip,
              selectedCategory === item.key && styles.chipActive,
            ]}
            onPress={() => setSelectedCategory(item.key)}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === item.key && styles.chipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Exercise list */}
      {isLibraryLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.brand.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={exerciseLibrary}
          keyExtractor={(item) => item.id}
          renderItem={renderExercise}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No exercises found</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  closeText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  searchRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
  },
  chipRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginRight: Spacing.xs,
  },
  chipActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  chipText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  chipTextActive: {
    color: Colors.text.inverse,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: 80,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  exerciseInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  exerciseName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badge: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    textTransform: 'capitalize',
  },
  muscleBadge: {
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
  },
  muscleBadgeText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    textTransform: 'capitalize',
  },
  addIcon: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    paddingLeft: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.base,
  },
});
