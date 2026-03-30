import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { gymService } from '../../../services/gymService';
import { useGymStore } from '../../../store/gymStore';
import { WorkoutSession, SessionExerciseWithSets } from '../../../types/gym';
import { Colors, Typography, Spacing, Radius } from '../../../constants';

function formatDuration(secs: number | null): string {
  if (!secs) return '--';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export default function SessionSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { saveSessionAsTemplate } = useGymStore();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<SessionExerciseWithSets[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const s = await gymService.getSessionById(id);
        if (s) {
          setSession(s);
          const exs = await gymService.getSessionExercisesWithSets(id);
          setExercises(exs);
        }
      } catch (err) {
        Alert.alert('Error', (err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Name required', 'Enter a name for this template.');
      return;
    }
    setSaving(true);
    try {
      // We need to temporarily set the activeSession so saveSessionAsTemplate works
      // Instead, call gymService directly
      await gymService.saveSessionAsTemplate(id!, templateName.trim());
      Alert.alert('Saved', 'Template saved successfully.');
      setShowTemplateInput(false);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    router.replace('/(tabs)/workouts');
  };

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={Colors.brand.primary} size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.errorText}>Session not found</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const volume = session.total_volume_kg
    ? session.total_volume_kg >= 1000
      ? `${(session.total_volume_kg / 1000).toFixed(1)}t`
      : `${Math.round(session.total_volume_kg)}kg`
    : '--';

  const prSets = exercises.flatMap((we) =>
    we.sets
      .filter((s) => s.is_pr)
      .map((s) => ({ ...s, exerciseName: we.exercise?.name ?? 'Unknown' }))
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <Text style={styles.completeTitle}>Workout Complete</Text>
        <Text style={styles.sessionName}>{session.name || 'Workout'}</Text>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatDuration(session.duration_secs)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{volume}</Text>
            <Text style={styles.statLabel}>Volume</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{session.total_sets ?? '--'}</Text>
            <Text style={styles.statLabel}>Sets</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.workout.burned }]}>
              {session.calories_burned ? Math.round(session.calories_burned) : '--'}
            </Text>
            <Text style={styles.statLabel}>kcal</Text>
          </View>
        </View>

        {/* PRs */}
        {prSets.length > 0 && (
          <View style={styles.prSection}>
            <Text style={styles.sectionTitle}>Personal Records</Text>
            {prSets.map((pr) => (
              <View key={pr.id} style={styles.prRow}>
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>PR</Text>
                </View>
                <Text style={styles.prDetail}>
                  {pr.exerciseName} - {pr.weight_kg}kg x {pr.reps}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Exercise list */}
        <View style={styles.exerciseSection}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          {exercises.map((we) => (
            <View key={we.id} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>{we.exercise?.name ?? 'Unknown'}</Text>
              <View style={styles.setsList}>
                {we.sets
                  .filter((s) => s.is_completed)
                  .map((s) => (
                    <Text key={s.id} style={styles.setDetail}>
                      Set {s.set_number}: {s.weight_kg ?? 0}kg x {s.reps ?? 0}
                      {s.rpe ? ` @ RPE ${s.rpe}` : ''}
                      {s.is_pr ? ' (PR)' : ''}
                    </Text>
                  ))}
              </View>
            </View>
          ))}
        </View>

        {/* Save as template */}
        {!showTemplateInput ? (
          <TouchableOpacity
            style={styles.templateBtn}
            onPress={() => setShowTemplateInput(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.templateBtnText}>Save as Template</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.templateInput}>
            <TextInput
              style={styles.templateNameInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name..."
              placeholderTextColor={Colors.text.muted}
              autoFocus
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveTemplate}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Done */}
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.8}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  errorText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.lg,
  },
  content: {
    padding: Spacing.md,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  completeTitle: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  sessionName: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.lg,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  statValue: {
    color: Colors.text.primary,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
  statLabel: {
    color: Colors.text.muted,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  prSection: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  prBadge: {
    backgroundColor: Colors.status.warning,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prBadgeText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  prDetail: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  exerciseSection: {
    gap: Spacing.sm,
  },
  exerciseRow: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  exerciseName: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  setsList: {
    gap: 2,
  },
  setDetail: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  templateBtn: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  templateBtnText: {
    color: Colors.brand.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  templateInput: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  templateNameInput: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
  },
  saveBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  doneBtn: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  doneBtnText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
});
