import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../constants';
import { analyticsService, BodyMeasurement, PRTimelineEntry, CreateMeasurementInput } from '../services/analyticsService';
import { gamificationService, Streak, Achievement } from '../services/gamificationService';

// ----------------------------------------------------------------
// Measurement form fields
// ----------------------------------------------------------------
const MEASUREMENT_FIELDS: { key: keyof CreateMeasurementInput; label: string }[] = [
  { key: 'chest_cm', label: 'Chest (cm)' },
  { key: 'waist_cm', label: 'Waist (cm)' },
  { key: 'hips_cm', label: 'Hips (cm)' },
  { key: 'shoulders_cm', label: 'Shoulders (cm)' },
  { key: 'neck_cm', label: 'Neck (cm)' },
  { key: 'left_arm_cm', label: 'Left Arm (cm)' },
  { key: 'right_arm_cm', label: 'Right Arm (cm)' },
  { key: 'left_thigh_cm', label: 'Left Thigh (cm)' },
  { key: 'right_thigh_cm', label: 'Right Thigh (cm)' },
  { key: 'left_calf_cm', label: 'Left Calf (cm)' },
  { key: 'right_calf_cm', label: 'Right Calf (cm)' },
  { key: 'body_fat_pct', label: 'Body Fat (%)' },
];

function formatPRType(type: string): string {
  switch (type) {
    case 'weight': return 'Weight';
    case 'estimated_1rm': return 'Est. 1RM';
    case 'volume': return 'Volume';
    case 'reps': return 'Reps';
    default: return type;
  }
}

function formatPRValue(type: string, value: number): string {
  if (type === 'reps') return `${value} reps`;
  return `${value.toFixed(1)} kg`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Readable labels for muscle groups
const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest',
  front_delt: 'Front Delts',
  side_delt: 'Side Delts',
  rear_delt: 'Rear Delts',
  upper_back: 'Upper Back',
  lats: 'Lats',
  lower_back: 'Lower Back',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  obliques: 'Obliques',
};

// Achievement category icons (text-based, no emojis)
const CATEGORY_LABELS: Record<string, string> = {
  workout: 'W',
  nutrition: 'N',
  streak: 'S',
  pr: 'PR',
  milestone: 'M',
};

export default function AnalyticsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [volume, setVolume] = useState<Record<string, number>>({});
  const [prTimeline, setPrTimeline] = useState<PRTimelineEntry[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Measurement form state
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get date range for volume (last 30 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - 30);
      const startDate = startDateObj.toISOString().split('T')[0];

      const [m, v, pr, s, a] = await Promise.all([
        analyticsService.getMeasurements(5),
        analyticsService.getVolumeByMuscleGroup(startDate, endDate),
        analyticsService.getPRTimeline(15),
        gamificationService.getStreaks(),
        gamificationService.getAchievements(),
      ]);

      setMeasurements(m);
      setVolume(v);
      setPrTimeline(pr);
      setStreaks(s);
      setAchievements(a);
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveMeasurement = async () => {
    setIsSaving(true);
    try {
      const input: CreateMeasurementInput = { notes: formNotes || null };
      for (const field of MEASUREMENT_FIELDS) {
        const val = formValues[field.key as string];
        if (val?.trim()) {
          (input as Record<string, unknown>)[field.key as string] = parseFloat(val);
        }
      }
      await analyticsService.logMeasurement(input);
      setFormOpen(false);
      setFormValues({});
      setFormNotes('');
      // Refresh
      const m = await analyticsService.getMeasurements(5);
      setMeasurements(m);
      // Check achievements
      await gamificationService.checkAchievements();
      const a = await gamificationService.getAchievements();
      setAchievements(a);
      Alert.alert('Saved', 'Body measurements recorded.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save measurements.');
    } finally {
      setIsSaving(false);
    }
  };

  // Volume chart calculations
  const sortedVolume = Object.entries(volume).sort((a, b) => b[1] - a[1]);
  const maxVolume = sortedVolume.length > 0 ? sortedVolume[0][1] : 1;

  const latestMeasurement = measurements.length > 0 ? measurements[0] : null;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* ============================================================ */}
      {/* BODY MEASUREMENTS */}
      {/* ============================================================ */}
      <Text style={styles.sectionTitle}>Body Measurements</Text>

      {latestMeasurement ? (
        <View style={styles.card}>
          <Text style={styles.cardSubtitle}>
            Latest: {formatDate(latestMeasurement.measured_at)}
          </Text>
          <View style={styles.measurementGrid}>
            {MEASUREMENT_FIELDS.map((f) => {
              const val = (latestMeasurement as unknown as Record<string, unknown>)[f.key as string] as number | null;
              if (val == null) return null;
              return (
                <View key={f.key as string} style={styles.measurementItem}>
                  <Text style={styles.measurementValue}>{val}</Text>
                  <Text style={styles.measurementLabel}>{f.label}</Text>
                </View>
              );
            })}
          </View>
          {latestMeasurement.notes ? (
            <Text style={styles.notesText}>{latestMeasurement.notes}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No measurements logged yet.</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => setFormOpen(!formOpen)}
      >
        <Text style={styles.toggleBtnText}>
          {formOpen ? 'Cancel' : 'Log Measurements'}
        </Text>
      </TouchableOpacity>

      {formOpen && (
        <View style={styles.card}>
          <View style={styles.formGrid}>
            {MEASUREMENT_FIELDS.map((f) => (
              <View key={f.key as string} style={styles.formField}>
                <Text style={styles.formLabel}>{f.label}</Text>
                <TextInput
                  style={styles.formInput}
                  value={formValues[f.key as string] ?? ''}
                  onChangeText={(v) =>
                    setFormValues((prev) => ({ ...prev, [f.key as string]: v }))
                  }
                  keyboardType="decimal-pad"
                  placeholder="--"
                  placeholderTextColor={Colors.text.muted}
                />
              </View>
            ))}
          </View>
          <TextInput
            style={styles.notesInput}
            value={formNotes}
            onChangeText={setFormNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={Colors.text.muted}
            multiline
          />
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveMeasurement}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>
              {isSaving ? 'Saving...' : 'Save Measurements'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ============================================================ */}
      {/* VOLUME DISTRIBUTION */}
      {/* ============================================================ */}
      <Text style={styles.sectionTitle}>Volume Distribution (30 days)</Text>

      {sortedVolume.length > 0 ? (
        <View style={styles.card}>
          {sortedVolume.map(([muscle, vol]) => {
            const pct = Math.max(5, (vol / maxVolume) * 100);
            return (
              <View key={muscle} style={styles.volumeRow}>
                <Text style={styles.volumeLabel}>
                  {MUSCLE_LABELS[muscle] ?? muscle}
                </Text>
                <View style={styles.volumeBarContainer}>
                  <View
                    style={[
                      styles.volumeBar,
                      { width: `${pct}%` },
                    ]}
                  />
                </View>
                <Text style={styles.volumeValue}>{Math.round(vol)} kg</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No workout volume data yet.</Text>
        </View>
      )}

      {/* ============================================================ */}
      {/* PR TIMELINE */}
      {/* ============================================================ */}
      <Text style={styles.sectionTitle}>PR Timeline</Text>

      {prTimeline.length > 0 ? (
        <View style={styles.card}>
          {prTimeline.map((pr) => (
            <View key={pr.id} style={styles.prRow}>
              <View style={styles.prBadge}>
                <Text style={styles.prBadgeText}>{formatPRType(pr.pr_type)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.prExercise}>{pr.exercise_name}</Text>
                <Text style={styles.prDetail}>
                  {formatPRValue(pr.pr_type, pr.value)}
                  {pr.weight_kg != null && pr.reps != null
                    ? ` (${pr.weight_kg}kg x ${pr.reps})`
                    : ''}
                </Text>
              </View>
              <Text style={styles.prDate}>{formatDate(pr.achieved_at)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No personal records yet.</Text>
        </View>
      )}

      {/* ============================================================ */}
      {/* STREAKS */}
      {/* ============================================================ */}
      <Text style={styles.sectionTitle}>Streaks</Text>

      <View style={styles.streakRow}>
        {(['meals', 'workouts', 'combined'] as const).map((type) => {
          const streak = streaks.find((s) => s.streak_type === type);
          const current = streak?.current_count ?? 0;
          const longest = streak?.longest_count ?? 0;
          const label =
            type === 'meals' ? 'Meals' : type === 'workouts' ? 'Workouts' : 'Combined';

          return (
            <View key={type} style={styles.streakCard}>
              <Text style={styles.streakLabel}>{label}</Text>
              <Text style={styles.streakCount}>{current}</Text>
              <Text style={styles.streakSub}>current</Text>
              <View style={styles.streakDivider} />
              <Text style={styles.streakLongest}>{longest}</Text>
              <Text style={styles.streakSub}>longest</Text>
            </View>
          );
        })}
      </View>

      {/* ============================================================ */}
      {/* ACHIEVEMENTS */}
      {/* ============================================================ */}
      <Text style={styles.sectionTitle}>Achievements</Text>

      {achievements.length > 0 ? (
        <View style={styles.achievementGrid}>
          {achievements.map((a) => {
            const isUnlocked = a.unlocked_at != null;
            return (
              <View
                key={a.id}
                style={[
                  styles.achievementCard,
                  !isUnlocked && styles.achievementLocked,
                ]}
              >
                <View
                  style={[
                    styles.achievementBadge,
                    !isUnlocked && styles.achievementBadgeLocked,
                  ]}
                >
                  <Text
                    style={[
                      styles.achievementBadgeText,
                      !isUnlocked && styles.achievementBadgeTextLocked,
                    ]}
                  >
                    {CATEGORY_LABELS[a.category] ?? '?'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.achievementName,
                    !isUnlocked && styles.achievementTextLocked,
                  ]}
                >
                  {a.name}
                </Text>
                <Text
                  style={[
                    styles.achievementDesc,
                    !isUnlocked && styles.achievementTextLocked,
                  ]}
                  numberOfLines={2}
                >
                  {a.description}
                </Text>
                {isUnlocked && a.unlocked_at && (
                  <Text style={styles.achievementDate}>
                    {formatDate(a.unlocked_at)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            No achievements seeded. Visit settings to initialise.
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.md, gap: Spacing.md },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: { color: Colors.text.secondary, fontSize: Typography.sizes.sm },

  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginTop: Spacing.sm,
  },

  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.sm,
  },
  cardSubtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },

  // Measurement grid
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  measurementItem: {
    alignItems: 'center',
    minWidth: 80,
    padding: Spacing.xs,
  },
  measurementValue: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  measurementLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
  notesText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },

  // Toggle
  toggleBtn: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand.primary + '15',
    borderWidth: 1,
    borderColor: Colors.brand.primary + '40',
    alignItems: 'center',
  },
  toggleBtnText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },

  // Form
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  formField: {
    width: '47%',
    gap: 4,
  },
  formLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  formInput: {
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  notesInput: {
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  saveBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },

  // Volume chart
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  volumeLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    width: 80,
    textAlign: 'right',
  },
  volumeBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: Colors.bg.primary,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  volumeBar: {
    height: '100%',
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.sm,
  },
  volumeValue: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
    width: 60,
  },

  // PR Timeline
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  prBadge: {
    backgroundColor: Colors.brand.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.brand.primary + '40',
  },
  prBadgeText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  prExercise: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  prDetail: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  prDate: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },

  // Streaks
  streakRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  streakCard: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: 2,
  },
  streakLabel: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    marginBottom: 4,
  },
  streakCount: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
  streakSub: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.xs,
  },
  streakDivider: {
    width: '60%',
    height: 1,
    backgroundColor: Colors.border.default,
    marginVertical: 4,
  },
  streakLongest: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },

  // Achievements
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  achievementCard: {
    width: '47%',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: 4,
  },
  achievementLocked: {
    opacity: 0.45,
  },
  achievementBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.brand.primary + '40',
  },
  achievementBadgeLocked: {
    backgroundColor: Colors.border.default,
    borderColor: Colors.text.muted,
  },
  achievementBadgeText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  achievementBadgeTextLocked: {
    color: Colors.text.muted,
  },
  achievementName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  achievementDesc: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.xs,
    lineHeight: 15,
  },
  achievementTextLocked: {
    color: Colors.text.muted,
  },
  achievementDate: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
});
