import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useMealHistory } from '../../hooks/useMealHistory';
import { MealCard } from '../../components/meal/MealCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorBanner } from '../../components/shared/ErrorBanner';
import { Colors, Typography, Spacing } from '../../constants';
import { formatDate } from '../../utils/macroUtils';
import { router } from 'expo-router';

export default function LogScreen() {
  const { grouped, isLoading, isRefreshing, hasMore, error, loadMore, refresh } =
    useMealHistory();

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={Colors.brand.primary} />
      </View>
    );
  };

  if (!isLoading && grouped.length === 0 && !error) {
    return (
      <EmptyState
        icon="🍽️"
        title="No meals logged yet"
        subtitle="Start by capturing your first meal"
        actionLabel="Log a Meal"
        onAction={() => router.push('/meal/capture')}
      />
    );
  }

  return (
    <View style={styles.root}>
      {error && <ErrorBanner message={error} onRetry={refresh} />}
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.date}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={Colors.brand.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.group}>
            <Text style={styles.dateHeader}>{formatDate(item.date)}</Text>
            {item.meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.md },
  group: { marginBottom: Spacing.lg },
  dateHeader: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  footer: { padding: Spacing.lg, alignItems: 'center' },
});
