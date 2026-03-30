import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useGymStore } from '../../store/gymStore';
import { useWorkoutsStore } from '../../store/workoutsStore';
import { SessionHistoryCard } from '../../components/gym/SessionHistoryCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { Colors, Typography, Spacing, Radius } from '../../constants';

export default function WorkoutsScreen() {
  const {
    activeSession,
    recentSessions,
    isSessionLoading,
    fetchRecentSessions,
    startSession,
    checkForActiveSession,
  } = useGymStore();

  const { todayWorkouts, isLoadingToday, fetchTodayWorkouts, getTodayBurned } =
    useWorkoutsStore();

  const totalBurned = getTodayBurned();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    checkForActiveSession();
    fetchRecentSessions();
    fetchTodayWorkouts();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      checkForActiveSession(),
      fetchRecentSessions(),
      fetchTodayWorkouts(),
    ]);
    setRefreshing(false);
  }, []);

  const handleStartEmpty = async () => {
    await startSession();
    router.push('/gym/session');
  };

  const handleResumeSession = () => {
    router.push('/gym/session');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoadingToday}
            onRefresh={onRefresh}
            tintColor={Colors.brand.primary}
          />
        }
      >
        {/* Burned today summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Calories Burned Today</Text>
          <Text style={styles.summaryValue}>{totalBurned} kcal</Text>
        </View>

        {/* Active session banner */}
        {activeSession && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={handleResumeSession}
            activeOpacity={0.8}
          >
            <View style={styles.activeDot} />
            <View style={styles.activeBannerContent}>
              <Text style={styles.activeBannerTitle}>Active Workout</Text>
              <Text style={styles.activeBannerSubtitle}>
                {activeSession.name || 'Untitled workout'} — tap to resume
              </Text>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </TouchableOpacity>
        )}

        {/* Action buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleStartEmpty}
            disabled={isSessionLoading || !!activeSession}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>
              {isSessionLoading ? 'Starting...' : 'Start Empty Workout'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/gym/templates')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Start from Template</Text>
          </TouchableOpacity>
        </View>

        {/* Log basic workout link */}
        <TouchableOpacity
          style={styles.logLink}
          onPress={() => router.push('/workout/log')}
          activeOpacity={0.7}
        >
          <Text style={styles.logLinkText}>Log a quick workout (cardio, etc.)</Text>
        </TouchableOpacity>

        {/* Recent sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {recentSessions.length === 0 ? (
            <EmptyState
              title="No sessions yet"
              subtitle="Start a workout to see your history here"
            />
          ) : (
            recentSessions.map((session) => (
              <SessionHistoryCard key={session.id} session={session} />
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  summaryCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  summaryLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  summaryValue: {
    color: Colors.workout.burned,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    gap: Spacing.sm,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.status.success,
  },
  activeBannerContent: {
    flex: 1,
    gap: 2,
  },
  activeBannerTitle: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  activeBannerSubtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  chevron: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  btnRow: {
    gap: Spacing.sm,
  },
  primaryBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  secondaryBtn: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  secondaryBtnText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  logLink: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  logLinkText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    textDecorationLine: 'underline',
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
});
