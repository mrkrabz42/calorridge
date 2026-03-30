import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { Challenge, ChallengeDay } from '../../types/challenge';
import { challengeService } from '../../services/challengeService';
import { useChallengeStore } from '../../store/challengeStore';
import { CalendarGrid } from '../../components/challenge/CalendarGrid';
import { ProgressStats } from '../../components/challenge/ProgressStats';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { endChallenge } = useChallengeStore();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [days, setDays] = useState<ChallengeDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnd, setShowEnd] = useState(false);

  useEffect(() => {
    if (id) {
      Promise.all([
        challengeService.getChallengeById(id),
        challengeService.getChallengeDays(id),
      ]).then(([c, d]) => {
        setChallenge(c);
        setDays(d);
        setLoading(false);
      });
    }
  }, [id]);

  const handleDayPress = (day: ChallengeDay) => {
    router.push(`/challenge/day/${day.id}`);
  };

  const handleEnd = async () => {
    if (!challenge) return;
    try {
      await endChallenge();
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to end challenge.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.loadingText}>Challenge not found</Text>
      </View>
    );
  }

  const goalLabel = challenge.goal_type.charAt(0).toUpperCase() + challenge.goal_type.slice(1);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{challenge.name}</Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{goalLabel}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{challenge.duration_days} days</Text>
            </View>
            {challenge.is_active && (
              <View style={[styles.badge, styles.activeBadge]}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
          <Text style={styles.dates}>
            {challenge.start_date} → {challenge.end_date}
          </Text>
        </View>

        {/* Calendar */}
        <Text style={styles.sectionTitle}>Calendar</Text>
        <CalendarGrid
          days={days}
          targetCalories={challenge.target_calories}
          onDayPress={handleDayPress}
        />

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.challenge.hit }]} />
            <Text style={styles.legendText}>Hit (within 10%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.challenge.close }]} />
            <Text style={styles.legendText}>Close (within 20%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.challenge.missed }]} />
            <Text style={styles.legendText}>Missed</Text>
          </View>
        </View>

        {/* Progress stats */}
        <ProgressStats challenge={challenge} days={days} />

        {/* Targets */}
        <View style={styles.targetsCard}>
          <Text style={styles.sectionTitle}>Daily Targets</Text>
          <View style={styles.targetRow}>
            <TargetItem label="Calories" value={`${challenge.target_calories}`} unit="kcal" color={Colors.macro.calories} />
            <TargetItem label="Protein" value={`${Math.round(challenge.target_protein_g)}`} unit="g" color={Colors.macro.protein} />
            <TargetItem label="Carbs" value={`${Math.round(challenge.target_carbs_g)}`} unit="g" color={Colors.macro.carbs} />
            <TargetItem label="Fat" value={`${Math.round(challenge.target_fat_g)}`} unit="g" color={Colors.macro.fat} />
          </View>
        </View>

        {/* Edit / End challenge */}
        {challenge.is_active && (
          <>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push(`/challenge/edit/${challenge.id}`)}
            >
              <Text style={styles.editText}>Edit Challenge</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.endBtn} onPress={() => setShowEnd(true)}>
              <Text style={styles.endText}>End Challenge</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={showEnd}
        title="End Challenge"
        message="Are you sure you want to end this challenge early?"
        confirmLabel="End"
        onConfirm={handleEnd}
        onCancel={() => setShowEnd(false)}
      />
    </View>
  );
}

function TargetItem({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.targetItem}>
      <Text style={[styles.targetValue, { color }]}>{value}</Text>
      <Text style={styles.targetUnit}>{unit}</Text>
      <Text style={styles.targetLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.text.secondary, fontSize: Typography.sizes.base },
  content: { paddingTop: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md },
  header: { alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  name: {
    color: Colors.text.primary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  badges: { flexDirection: 'row', gap: Spacing.xs },
  badge: {
    backgroundColor: Colors.bg.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  badgeText: { color: Colors.text.secondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium },
  activeBadge: { backgroundColor: Colors.challenge.hit + '20', borderColor: Colors.challenge.hit },
  activeBadgeText: { color: Colors.challenge.hit, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold },
  dates: { color: Colors.text.muted, fontSize: Typography.sizes.sm },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    paddingHorizontal: Spacing.md,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  targetsCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  targetRow: { flexDirection: 'row', justifyContent: 'space-around' },
  targetItem: { alignItems: 'center', gap: 2 },
  targetValue: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  targetUnit: { color: Colors.text.muted, fontSize: Typography.sizes.xs },
  targetLabel: { color: Colors.text.secondary, fontSize: Typography.sizes.xs },
  editBtn: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand.primary + '15',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.brand.primary + '30',
    marginHorizontal: Spacing.md,
  },
  editText: { color: Colors.brand.primary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium },
  endBtn: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.status.error + '15',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.status.error + '30',
    marginHorizontal: Spacing.md,
  },
  endText: { color: Colors.status.error, fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium },
});
