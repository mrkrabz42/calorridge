import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { EXERCISE_CATEGORIES, EXERCISE_CATEGORY_ORDER } from '../../constants/exercises';
import { Exercise, ExerciseCategory } from '../../types/workout';

interface Props {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onCustom: () => void;
}

export function ExercisePicker({ exercises, onSelect, onCustom }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');

  const filtered = useMemo(() => {
    let result = exercises;
    if (selectedCategory !== 'all') {
      result = result.filter((e) => e.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }
    return result;
  }, [exercises, search, selectedCategory]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search exercises..."
        placeholderTextColor={Colors.text.muted}
        value={search}
        onChangeText={setSearch}
      />

      {/* Category filters */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ key: 'all' as const, label: 'All', icon: 'A' }, ...EXERCISE_CATEGORY_ORDER.map((cat) => ({
          key: cat,
          label: EXERCISE_CATEGORIES[cat].label,
          icon: EXERCISE_CATEGORIES[cat].icon,
        }))]}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.categories}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === item.key && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(item.key as ExerciseCategory | 'all')}
          >
            <Text style={styles.categoryChipIcon}>{item.icon}</Text>
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === item.key && styles.categoryChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Exercise list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <TouchableOpacity style={styles.customBtn} onPress={onCustom}>
            <Text style={styles.customIcon}>+</Text>
            <Text style={styles.customText}>Add Custom Exercise</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => {
          const catConfig = EXERCISE_CATEGORIES[item.category as ExerciseCategory];
          return (
            <TouchableOpacity
              style={styles.exerciseRow}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.exerciseIcon}>{catConfig?.icon ?? 'O'}</Text>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{item.name}</Text>
                <Text style={styles.exerciseMeta}>
                  ~{item.cals_per_min_default ?? '?'} kcal/min
                  {item.met_value ? ` · MET ${item.met_value}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  categories: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  categoryChipActive: {
    backgroundColor: Colors.brand.primary + '20',
    borderColor: Colors.brand.primary,
  },
  categoryChipIcon: { fontSize: 14 },
  categoryChipText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  categoryChipTextActive: {
    color: Colors.brand.primary,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '40',
    borderStyle: 'dashed',
  },
  customIcon: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  customText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  exerciseIcon: { fontSize: 20 },
  exerciseInfo: { flex: 1, gap: 2 },
  exerciseName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  exerciseMeta: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
});
